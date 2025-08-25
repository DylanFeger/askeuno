import { OAuth2Connector } from '../base/OAuth2Connector';
import { ConnectionResult, ConnectorMetadata } from '../base/BaseConnector';
import axios from 'axios';

export class HubSpotConnector extends OAuth2Connector {
  private baseUrl = 'https://api.hubapi.com';

  getMetadata(): ConnectorMetadata {
    return {
      id: 'hubspot',
      name: 'HubSpot',
      category: 'crm',
      description: 'Connect to HubSpot CRM for contacts, companies, deals, and tickets',
      authType: 'oauth2',
      configFields: [
        {
          name: 'clientId',
          label: 'Client ID',
          type: 'text',
          required: true,
          helpText: 'Your HubSpot app client ID'
        },
        {
          name: 'clientSecret',
          label: 'Client Secret',
          type: 'password',
          required: true,
          helpText: 'Your HubSpot app client secret'
        },
        {
          name: 'dataType',
          label: 'Data Type',
          type: 'select',
          required: true,
          options: [
            { value: 'contacts', label: 'Contacts' },
            { value: 'companies', label: 'Companies' },
            { value: 'deals', label: 'Deals' },
            { value: 'tickets', label: 'Tickets' }
          ]
        }
      ],
      supportedSyncModes: ['full', 'incremental'],
      defaultSyncFrequency: 60
    };
  }

  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.oauthConfig.clientId,
      redirect_uri: this.oauthConfig.redirectUri,
      scope: 'crm.objects.contacts.read crm.objects.companies.read crm.objects.deals.read',
      response_type: 'code',
      ...(state && { state })
    });
    
    return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string) {
    const response = await axios.post('https://api.hubapi.com/oauth/v1/token', {
      grant_type: 'authorization_code',
      client_id: this.oauthConfig.clientId,
      client_secret: this.oauthConfig.clientSecret,
      redirect_uri: this.oauthConfig.redirectUri,
      code
    });

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in
    };
  }

  async refreshAccessToken() {
    const response = await axios.post('https://api.hubapi.com/oauth/v1/token', {
      grant_type: 'refresh_token',
      client_id: this.oauthConfig.clientId,
      client_secret: this.oauthConfig.clientSecret,
      refresh_token: this.oauthConfig.refreshToken
    });

    return {
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.makeAuthenticatedRequest(`${this.baseUrl}/crm/v3/objects/contacts?limit=1`);
      return true;
    } catch (error) {
      this.log('error', 'Connection test failed', error);
      return false;
    }
  }

  async fetchData(options?: { syncMode?: 'full' | 'incremental'; lastSyncToken?: string; limit?: number }) {
    const dataType = this.config.dataType || 'contacts';
    const limit = options?.limit || 100;
    
    try {
      const endpoint = `${this.baseUrl}/crm/v3/objects/${dataType}`;
      const params: any = {
        limit,
        properties: await this.getProperties(dataType)
      };

      if (options?.syncMode === 'incremental' && options.lastSyncToken) {
        params.after = options.lastSyncToken;
      }

      const response = await this.makeAuthenticatedRequest(endpoint, { params });
      
      const transformedData = this.transformData(response.results);
      
      return {
        success: true,
        data: transformedData,
        rowCount: transformedData.length,
        nextSyncToken: response.paging?.next?.after
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getSchema() {
    const dataType = this.config.dataType || 'contacts';
    const properties = await this.getProperties(dataType);
    
    const schema: Record<string, any> = {};
    for (const prop of properties.split(',')) {
      schema[prop] = { type: 'string', description: `HubSpot ${prop}` };
    }
    
    return schema;
  }

  private async getProperties(objectType: string): Promise<string> {
    // Return common properties for each object type
    const propertyMap: Record<string, string> = {
      contacts: 'email,firstname,lastname,company,phone,city,state,country',
      companies: 'name,domain,industry,city,state,country,numberofemployees',
      deals: 'dealname,amount,dealstage,closedate,pipeline',
      tickets: 'subject,content,status,priority,createdate'
    };
    
    return propertyMap[objectType] || 'id,createdate,lastmodifieddate';
  }

  protected transformData(rawData: any[]): any[] {
    return rawData.map(item => ({
      id: item.id,
      ...item.properties,
      _metadata: {
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }
    }));
  }
}