import { logger } from '../../utils/logger';

export interface ConnectionConfig {
  [key: string]: any;
}

export interface ConnectionResult {
  success: boolean;
  data?: any[];
  schema?: Record<string, any>;
  rowCount?: number;
  error?: string;
  nextSyncToken?: string;
}

export interface ConnectorMetadata {
  id: string;
  name: string;
  category: 'crm' | 'marketing' | 'ecommerce' | 'finance' | 'productivity' | 'analytics' | 'database' | 'cloud' | 'payments' | 'accounting' | 'api';
  description: string;
  icon?: string;
  authType: 'oauth2' | 'apikey' | 'basic' | 'custom';
  configFields: ConfigField[];
  supportedSyncModes: ('full' | 'incremental')[];
  defaultSyncFrequency?: number; // minutes
}

export interface ConfigField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'select' | 'boolean';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  helpText?: string;
}

export abstract class BaseConnector {
  protected config: ConnectionConfig;
  protected metadata: ConnectorMetadata;

  constructor(config: ConnectionConfig) {
    this.config = config;
    this.metadata = this.getMetadata();
  }

  /**
   * Get connector metadata including configuration fields
   */
  abstract getMetadata(): ConnectorMetadata;

  /**
   * Test if the connection configuration is valid
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Fetch data from the external source
   */
  abstract fetchData(options?: {
    syncMode?: 'full' | 'incremental';
    lastSyncToken?: string;
    limit?: number;
  }): Promise<ConnectionResult>;

  /**
   * Get the schema/structure of the data source
   */
  abstract getSchema(): Promise<Record<string, any>>;

  /**
   * Transform raw data to AskEuno format
   */
  protected transformData(rawData: any[]): any[] {
    // Default implementation - override in subclasses for custom transformation
    return rawData;
  }

  /**
   * Map external schema to AskEuno schema format
   */
  protected mapSchema(externalSchema: any): Record<string, any> {
    // Default implementation - override in subclasses
    return externalSchema;
  }

  /**
   * Handle pagination for large datasets
   */
  protected async *paginate(
    fetchPage: (offset: number, limit: number) => Promise<any[]>,
    pageSize: number = 1000
  ): AsyncGenerator<any[], void, unknown> {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const page = await fetchPage(offset, pageSize);
      if (page.length === 0) {
        hasMore = false;
      } else {
        yield page;
        offset += pageSize;
        hasMore = page.length === pageSize;
      }
    }
  }

  /**
   * Log connector activity
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    logger[level](`[${this.metadata.name}] ${message}`, data);
  }
}