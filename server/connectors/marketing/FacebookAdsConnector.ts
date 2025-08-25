import { OAuth2Connector } from '../base/OAuth2Connector';
import { ConnectionResult, ConnectorMetadata } from '../base/BaseConnector';
import axios from 'axios';

export class FacebookAdsConnector extends OAuth2Connector {
  private baseUrl = 'https://graph.facebook.com/v18.0';

  getMetadata(): ConnectorMetadata {
    return {
      id: 'facebook_ads',
      name: 'Facebook Ads',
      category: 'marketing',
      description: 'Connect to Facebook Ads for campaign performance, ad insights, and audience data',
      authType: 'oauth2',
      configFields: [
        {
          name: 'appId',
          label: 'App ID',
          type: 'text',
          required: true,
          helpText: 'Facebook App ID from developers.facebook.com'
        },
        {
          name: 'appSecret',
          label: 'App Secret',
          type: 'password',
          required: true,
          helpText: 'Facebook App Secret'
        },
        {
          name: 'adAccountId',
          label: 'Ad Account ID',
          type: 'text',
          required: true,
          helpText: 'Facebook Ad Account ID (format: act_123456789)'
        },
        {
          name: 'dataLevel',
          label: 'Data Level',
          type: 'select',
          required: true,
          options: [
            { value: 'account', label: 'Account' },
            { value: 'campaign', label: 'Campaign' },
            { value: 'adset', label: 'Ad Set' },
            { value: 'ad', label: 'Ad' }
          ]
        }
      ],
      supportedSyncModes: ['full', 'incremental'],
      defaultSyncFrequency: 60
    };
  }

  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.appId,
      redirect_uri: this.oauthConfig.redirectUri,
      scope: 'ads_read,ads_management,business_management',
      response_type: 'code',
      ...(state && { state })
    });
    
    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string) {
    const response = await axios.get(`${this.baseUrl}/oauth/access_token`, {
      params: {
        client_id: this.config.appId,
        client_secret: this.config.appSecret,
        redirect_uri: this.oauthConfig.redirectUri,
        code
      }
    });

    // Exchange short-lived token for long-lived token
    const longLivedResponse = await axios.get(`${this.baseUrl}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: this.config.appId,
        client_secret: this.config.appSecret,
        fb_exchange_token: response.data.access_token
      }
    });

    return {
      accessToken: longLivedResponse.data.access_token,
      expiresIn: longLivedResponse.data.expires_in
    };
  }

  async refreshAccessToken() {
    // Facebook uses long-lived tokens that don't refresh in the traditional way
    // They need to be renewed before expiry
    throw new Error('Facebook tokens must be renewed through re-authentication');
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.makeAuthenticatedRequest(`${this.baseUrl}/me`);
      return true;
    } catch (error) {
      this.log('error', 'Connection test failed', error);
      return false;
    }
  }

  async fetchData(options?: { syncMode?: 'full' | 'incremental'; lastSyncToken?: string; limit?: number }) {
    try {
      const adAccountId = this.config.adAccountId;
      const dataLevel = this.config.dataLevel || 'campaign';
      
      // Build insights endpoint based on data level
      let endpoint = `${this.baseUrl}/${adAccountId}/insights`;
      
      const params: any = {
        level: dataLevel,
        fields: this.getFields(dataLevel),
        time_range: this.getTimeRange(options),
        limit: options?.limit || 500
      };

      if (options?.syncMode === 'incremental' && options.lastSyncToken) {
        params.after = options.lastSyncToken;
      }

      const response = await this.makeAuthenticatedRequest(endpoint, { params });
      
      const transformedData = this.transformData(response.data);
      
      return {
        success: true,
        data: transformedData,
        rowCount: transformedData.length,
        nextSyncToken: response.paging?.cursors?.after
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getSchema() {
    const dataLevel = this.config.dataLevel || 'campaign';
    const fields = this.getFields(dataLevel).split(',');
    
    const schema: Record<string, any> = {};
    
    fields.forEach(field => {
      const fieldType = this.getFieldType(field);
      schema[field] = { 
        type: fieldType, 
        description: this.getFieldDescription(field) 
      };
    });
    
    return schema;
  }

  private getFields(level: string): string {
    const baseFields = 'spend,impressions,clicks,ctr,cpc,cpm,reach,frequency';
    
    const levelFields: Record<string, string> = {
      account: 'account_id,account_name,' + baseFields,
      campaign: 'campaign_id,campaign_name,objective,status,' + baseFields,
      adset: 'adset_id,adset_name,campaign_id,targeting,bid_amount,' + baseFields,
      ad: 'ad_id,ad_name,adset_id,creative,' + baseFields
    };
    
    return levelFields[level] || baseFields;
  }

  private getTimeRange(options?: any) {
    if (options?.syncMode === 'incremental' && options.lastSyncToken) {
      // Parse date from token and use as since
      return { since: options.lastSyncToken, until: 'now' };
    }
    
    // Default to last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return {
      since: thirtyDaysAgo.toISOString().split('T')[0],
      until: new Date().toISOString().split('T')[0]
    };
  }

  private getFieldType(field: string): string {
    const numericFields = ['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm', 'reach', 'frequency', 'bid_amount'];
    return numericFields.includes(field) ? 'number' : 'string';
  }

  private getFieldDescription(field: string): string {
    const descriptions: Record<string, string> = {
      campaign_name: 'Campaign name',
      campaign_id: 'Campaign ID',
      objective: 'Campaign objective',
      status: 'Campaign status',
      spend: 'Amount spent',
      impressions: 'Number of impressions',
      clicks: 'Number of clicks',
      ctr: 'Click-through rate',
      cpc: 'Cost per click',
      cpm: 'Cost per thousand impressions',
      reach: 'Unique users reached',
      frequency: 'Average frequency'
    };
    
    return descriptions[field] || field;
  }

  protected transformData(rawData: any[]): any[] {
    return rawData.map(item => ({
      ...item,
      date_fetched: new Date().toISOString()
    }));
  }
}