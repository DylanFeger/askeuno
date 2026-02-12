import { createConnector, getConnectorMetadata, getAllConnectorMetadata } from '../connectors/registry';
import { ConnectionResult } from '../connectors/base/BaseConnector';
import { logger } from '../utils/logger';

// Import legacy connectors for backward compatibility
import { connectToDataSource as legacyConnect } from './dataConnector';

/**
 * Enhanced data connector that uses the new connector framework
 * Falls back to legacy connectors for existing types
 */
export async function connectToDataSourceV2(
  type: string,
  connectionData: any
): Promise<ConnectionResult> {
  try {
    // Check if this is a new connector type
    const metadata = getConnectorMetadata(type);
    
    if (metadata) {
      // Use new connector framework
      const connector = createConnector(type, connectionData);
      
      // Test connection first
      const isValid = await connector.testConnection();
      if (!isValid) {
        return {
          success: false,
          error: 'Connection test failed. Please check your credentials.'
        };
      }
      
      // Fetch data
      return await connector.fetchData({
        syncMode: connectionData.syncMode || 'full',
        limit: connectionData.limit || 1000
      });
    }
    
    // Fall back to legacy connectors for backward compatibility
    const legacyTypes = [
      'mysql', 'postgresql', 'mongodb', 
      'shopify', 'stripe', 'square', 'paypal', 'quickbooks', 'lightspeed',
      'googleads', 'salesforce', 'googlesheets', 's3', 'api', 'rest'
    ];
    
    if (legacyTypes.includes(type.toLowerCase())) {
      return await legacyConnect(type, connectionData);
    }
    
    return {
      success: false,
      error: `Unsupported data source type: ${type}`
    };
  } catch (error) {
    logger.error('Data connection error V2', { type, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}

/**
 * Get all available connector types with metadata
 */
export function getAvailableConnectors() {
  const newConnectors = getAllConnectorMetadata();
  
  // Add legacy connectors that aren't in the new framework yet
  const legacyConnectors = [
    { id: 'mysql', name: 'MySQL', category: 'database' as const },
    { id: 'postgresql', name: 'PostgreSQL', category: 'database' as const },
    { id: 'mongodb', name: 'MongoDB', category: 'database' as const },
    { id: 's3', name: 'AWS S3', category: 'cloud' as const },
    { id: 'googlesheets', name: 'Google Sheets', category: 'cloud' as const },
    { id: 'shopify', name: 'Shopify', category: 'ecommerce' as const },
    { id: 'stripe', name: 'Stripe', category: 'payments' as const },
    { id: 'square', name: 'Square', category: 'payments' as const },
    { id: 'paypal', name: 'PayPal', category: 'payments' as const },
    { id: 'quickbooks', name: 'QuickBooks', category: 'accounting' as const },
    { id: 'googleads', name: 'Google Ads', category: 'marketing' as const },
    { id: 'salesforce', name: 'Salesforce', category: 'crm' as const },
    { id: 'api', name: 'Custom API', category: 'api' as const }
  ];
  
  // Combine and deduplicate
  const allConnectors = [...newConnectors];
  
  legacyConnectors.forEach(legacy => {
    if (!allConnectors.find(c => c.id === legacy.id)) {
      allConnectors.push({
        id: legacy.id,
        name: legacy.name,
        category: legacy.category,
        description: `Connect to ${legacy.name}`,
        authType: 'custom',
        configFields: [],
        supportedSyncModes: ['full']
      });
    }
  });
  
  return allConnectors;
}

/**
 * Test connection for a data source
 */
export async function testDataSourceConnection(
  type: string,
  connectionData: any
): Promise<boolean> {
  try {
    const metadata = getConnectorMetadata(type);
    
    if (metadata) {
      const connector = createConnector(type, connectionData);
      return await connector.testConnection();
    }
    
    // For legacy connectors, try to connect with limit 1
    const result = await legacyConnect(type, { ...connectionData, limit: 1 });
    return result.success;
  } catch (error) {
    logger.error('Connection test failed', { type, error });
    return false;
  }
}