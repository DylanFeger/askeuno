import { BaseConnector, ConnectionConfig, ConnectionResult, ConnectorMetadata } from './BaseConnector';

export class StubConnector extends BaseConnector {
  protected connectorId: string;
  protected connectorName: string;
  protected connectorCategory: 'crm' | 'marketing' | 'ecommerce' | 'finance' | 'productivity' | 'analytics' | 'database' | 'cloud' | 'payments' | 'accounting' | 'api';

  constructor(config: ConnectionConfig, id: string, name: string, category: any) {
    super(config);
    this.connectorId = id;
    this.connectorName = name;
    this.connectorCategory = category;
  }

  getMetadata(): ConnectorMetadata {
    return {
      id: this.connectorId,
      name: this.connectorName,
      category: this.connectorCategory,
      description: `Connect to ${this.connectorName}`,
      authType: 'apikey',
      configFields: [
        {
          name: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: true,
          helpText: `Your ${this.connectorName} API key`
        }
      ],
      supportedSyncModes: ['full'],
      defaultSyncFrequency: 60
    };
  }

  async testConnection(): Promise<boolean> {
    // Stub implementation
    return true;
  }

  async fetchData(options?: any): Promise<ConnectionResult> {
    // Stub implementation
    return {
      success: true,
      data: [],
      rowCount: 0,
      error: `${this.connectorName} connector implementation pending`
    };
  }

  async getSchema(): Promise<Record<string, any>> {
    // Stub implementation
    return {
      id: { type: 'string', description: 'Record ID' },
      created_at: { type: 'string', description: 'Creation timestamp' }
    };
  }
}