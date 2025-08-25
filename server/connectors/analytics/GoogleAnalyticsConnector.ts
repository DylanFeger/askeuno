import { OAuth2Connector } from '../base/OAuth2Connector';
import { ConnectionResult, ConnectorMetadata } from '../base/BaseConnector';
import axios from 'axios';

export class GoogleAnalyticsConnector extends OAuth2Connector {
  private baseUrl = 'https://analyticsreporting.googleapis.com/v4';

  getMetadata(): ConnectorMetadata {
    return {
      id: 'google_analytics',
      name: 'Google Analytics',
      category: 'analytics',
      description: 'Connect to Google Analytics for website traffic, user behavior, and conversion data',
      authType: 'oauth2',
      configFields: [
        {
          name: 'clientId',
          label: 'Client ID',
          type: 'text',
          required: true,
          helpText: 'Google Cloud Console OAuth 2.0 Client ID'
        },
        {
          name: 'clientSecret',
          label: 'Client Secret',
          type: 'password',
          required: true,
          helpText: 'Google Cloud Console OAuth 2.0 Client Secret'
        },
        {
          name: 'viewId',
          label: 'View ID',
          type: 'text',
          required: true,
          helpText: 'Google Analytics View ID (found in Admin > View Settings)'
        },
        {
          name: 'metrics',
          label: 'Metrics',
          type: 'text',
          required: false,
          placeholder: 'ga:sessions,ga:users,ga:pageviews',
          helpText: 'Comma-separated metrics to fetch'
        },
        {
          name: 'dimensions',
          label: 'Dimensions',
          type: 'text',
          required: false,
          placeholder: 'ga:date,ga:source,ga:medium',
          helpText: 'Comma-separated dimensions to fetch'
        }
      ],
      supportedSyncModes: ['full', 'incremental'],
      defaultSyncFrequency: 360 // 6 hours
    };
  }

  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.oauthConfig.clientId,
      redirect_uri: this.oauthConfig.redirectUri,
      scope: 'https://www.googleapis.com/auth/analytics.readonly',
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      ...(state && { state })
    });
    
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string) {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: this.oauthConfig.clientId,
      client_secret: this.oauthConfig.clientSecret,
      redirect_uri: this.oauthConfig.redirectUri,
      grant_type: 'authorization_code'
    });

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in
    };
  }

  async refreshAccessToken() {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      refresh_token: this.oauthConfig.refreshToken,
      client_id: this.oauthConfig.clientId,
      client_secret: this.oauthConfig.clientSecret,
      grant_type: 'refresh_token'
    });

    return {
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeAuthenticatedRequest(
        'https://www.googleapis.com/analytics/v3/management/accounts'
      );
      return response.items && response.items.length > 0;
    } catch (error) {
      this.log('error', 'Connection test failed', error);
      return false;
    }
  }

  async fetchData(options?: { syncMode?: 'full' | 'incremental'; lastSyncToken?: string; limit?: number }) {
    try {
      const viewId = this.config.viewId;
      const metrics = this.config.metrics || 'ga:sessions,ga:users,ga:pageviews,ga:bounceRate';
      const dimensions = this.config.dimensions || 'ga:date,ga:source,ga:medium';
      
      // Calculate date range
      let startDate = '30daysAgo';
      let endDate = 'today';
      
      if (options?.syncMode === 'incremental' && options.lastSyncToken) {
        startDate = options.lastSyncToken;
      }

      const requestBody = {
        reportRequests: [{
          viewId: `ga:${viewId}`,
          dateRanges: [{ startDate, endDate }],
          metrics: metrics.split(',').map((m: string) => ({ expression: m.trim() })),
          dimensions: dimensions.split(',').map((d: string) => ({ name: d.trim() })),
          pageSize: options?.limit || 10000
        }]
      };

      const response = await this.makeAuthenticatedRequest(
        `${this.baseUrl}/reports:batchGet`,
        {
          method: 'POST',
          data: requestBody
        }
      );

      const report = response.reports[0];
      const transformedData = this.transformGoogleAnalyticsData(report);
      
      return {
        success: true,
        data: transformedData,
        rowCount: transformedData.length,
        nextSyncToken: endDate // Use end date as next sync token for incremental syncs
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getSchema() {
    const metrics = this.config.metrics || 'ga:sessions,ga:users,ga:pageviews,ga:bounceRate';
    const dimensions = this.config.dimensions || 'ga:date,ga:source,ga:medium';
    
    const schema: Record<string, any> = {};
    
    // Add dimension fields
    dimensions.split(',').forEach((dim: string) => {
      const fieldName = dim.trim().replace('ga:', '');
      schema[fieldName] = { 
        type: 'string', 
        description: this.getFieldDescription(fieldName) 
      };
    });
    
    // Add metric fields
    metrics.split(',').forEach((metric: string) => {
      const fieldName = metric.trim().replace('ga:', '');
      schema[fieldName] = { 
        type: 'number', 
        description: this.getFieldDescription(fieldName) 
      };
    });
    
    return schema;
  }

  private transformGoogleAnalyticsData(report: any): any[] {
    if (!report.data || !report.data.rows) {
      return [];
    }

    const headers = report.columnHeader;
    const dimensionHeaders = headers.dimensions || [];
    const metricHeaders = (headers.metricHeader?.metricHeaderEntries || []).map((m: any) => m.name);
    
    return report.data.rows.map((row: any) => {
      const record: any = {};
      
      // Add dimensions
      dimensionHeaders.forEach((dim: string, index: number) => {
        const fieldName = dim.replace('ga:', '');
        record[fieldName] = row.dimensions[index];
      });
      
      // Add metrics
      metricHeaders.forEach((metric: string, index: number) => {
        const fieldName = metric.replace('ga:', '');
        record[fieldName] = parseFloat(row.metrics[0].values[index]);
      });
      
      return record;
    });
  }

  private getFieldDescription(fieldName: string): string {
    const descriptions: Record<string, string> = {
      date: 'Date of the session',
      source: 'Traffic source',
      medium: 'Traffic medium',
      sessions: 'Number of sessions',
      users: 'Number of users',
      pageviews: 'Number of pageviews',
      bounceRate: 'Bounce rate percentage',
      avgSessionDuration: 'Average session duration in seconds',
      goalCompletionsAll: 'Total goal completions',
      transactions: 'Number of transactions',
      transactionRevenue: 'Total transaction revenue'
    };
    
    return descriptions[fieldName] || fieldName;
  }
}