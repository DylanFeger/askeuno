import { BaseConnector, ConnectionConfig, ConnectorMetadata } from './BaseConnector';
import axios from 'axios';

export interface OAuth2Config extends ConnectionConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: Date;
}

export abstract class OAuth2Connector extends BaseConnector {
  protected oauthConfig: OAuth2Config;

  constructor(config: OAuth2Config) {
    super(config);
    this.oauthConfig = config;
  }

  /**
   * Get the OAuth authorization URL
   */
  abstract getAuthorizationUrl(state?: string): string;

  /**
   * Exchange authorization code for access token
   */
  abstract exchangeCodeForToken(code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  }>;

  /**
   * Refresh the access token using refresh token
   */
  abstract refreshAccessToken(): Promise<{
    accessToken: string;
    expiresIn?: number;
  }>;

  /**
   * Check if token needs refresh and refresh if necessary
   */
  protected async ensureValidToken(): Promise<string> {
    if (!this.oauthConfig.accessToken) {
      throw new Error('No access token available');
    }

    // Check if token is expired
    if (this.oauthConfig.tokenExpiry && new Date() > this.oauthConfig.tokenExpiry) {
      if (!this.oauthConfig.refreshToken) {
        throw new Error('Token expired and no refresh token available');
      }

      this.log('info', 'Refreshing access token');
      const { accessToken, expiresIn } = await this.refreshAccessToken();
      
      this.oauthConfig.accessToken = accessToken;
      if (expiresIn) {
        this.oauthConfig.tokenExpiry = new Date(Date.now() + expiresIn * 1000);
      }
    }

    return this.oauthConfig.accessToken;
  }

  /**
   * Make an authenticated API request
   */
  protected async makeAuthenticatedRequest(
    url: string,
    options: any = {}
  ): Promise<any> {
    const token = await this.ensureValidToken();
    
    const response = await axios({
      url,
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    });

    return response.data;
  }
}