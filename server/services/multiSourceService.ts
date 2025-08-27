import { db } from '../db';
import { dataSources, conversationDataSources, users, dataRows } from '@shared/schema';
import { eq, and, inArray, or, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

interface DataSourceWithSchema {
  id: number;
  name: string;
  type: 'file' | 'api' | 'database';
  status: string;
  schema: any;
  rowCount: number;
  connectionData: any;
}

interface CrossSourceField {
  sourceId: number;
  sourceName: string;
  field: string;
  type: string;
  possibleJoinKeys?: string[]; // Fields that could be used for correlation
}

interface MultiSourceQueryResult {
  sources: DataSourceWithSchema[];
  correlatedData?: any[];
  error?: string;
}

// Tier limits for multi-source connections
const TIER_LIMITS = {
  starter: 1,
  professional: 3,
  enterprise: 10
};

export class MultiSourceService {
  /**
   * Get all active data sources for a user with tier-based limits
   */
  async getUserDataSources(userId: number, tier: string): Promise<DataSourceWithSchema[]> {
    const limit = TIER_LIMITS[tier as keyof typeof TIER_LIMITS] || 1;
    
    const sources = await db
      .select()
      .from(dataSources)
      .where(and(
        eq(dataSources.userId, userId),
        eq(dataSources.status, 'active')
      ))
      .limit(limit);
    
    return sources as DataSourceWithSchema[];
  }

  /**
   * Get data sources for a conversation
   */
  async getConversationDataSources(conversationId: number): Promise<DataSourceWithSchema[]> {
    const sources = await db
      .select({
        id: dataSources.id,
        name: dataSources.name,
        type: dataSources.type,
        status: dataSources.status,
        schema: dataSources.schema,
        rowCount: dataSources.rowCount,
        connectionData: dataSources.connectionData,
      })
      .from(conversationDataSources)
      .innerJoin(dataSources, eq(conversationDataSources.dataSourceId, dataSources.id))
      .where(eq(conversationDataSources.conversationId, conversationId));
    
    return sources as DataSourceWithSchema[];
  }

  /**
   * Add multiple data sources to a conversation
   */
  async addDataSourcesToConversation(
    conversationId: number, 
    dataSourceIds: number[], 
    primarySourceId?: number
  ): Promise<void> {
    const values = dataSourceIds.map((sourceId, index) => ({
      conversationId,
      dataSourceId: sourceId,
      isPrimary: sourceId === primarySourceId || index === 0
    }));

    await db.insert(conversationDataSources).values(values);
  }

  /**
   * Detect correlatable fields across multiple data sources
   */
  detectCorrelatableFields(sources: DataSourceWithSchema[]): Map<string, CrossSourceField[]> {
    const fieldMap = new Map<string, CrossSourceField[]>();
    
    // Common field patterns for correlation
    const correlationPatterns = [
      { pattern: /^(id|_id|product_id|product_code|sku)$/i, category: 'product_id' },
      { pattern: /^(customer|customer_id|user_id|client_id)$/i, category: 'customer_id' },
      { pattern: /^(date|created_at|timestamp|order_date|sale_date)$/i, category: 'date' },
      { pattern: /^(campaign|campaign_id|ad_id|marketing_id)$/i, category: 'campaign_id' },
      { pattern: /^(email|email_address|customer_email)$/i, category: 'email' },
      { pattern: /^(region|location|store|branch)$/i, category: 'location' },
      { pattern: /^(category|product_category|type)$/i, category: 'category' },
    ];
    
    // Analyze each source's schema
    sources.forEach(source => {
      if (!source.schema || typeof source.schema !== 'object') return;
      
      Object.entries(source.schema).forEach(([fieldName, fieldInfo]: [string, any]) => {
        const field: CrossSourceField = {
          sourceId: source.id,
          sourceName: source.name,
          field: fieldInfo.name || fieldName,
          type: fieldInfo.type || 'unknown',
          possibleJoinKeys: []
        };
        
        // Check if field matches any correlation pattern
        correlationPatterns.forEach(({ pattern, category }) => {
          if (pattern.test(field.field)) {
            if (!fieldMap.has(category)) {
              fieldMap.set(category, []);
            }
            fieldMap.get(category)!.push(field);
          }
        });
      });
    });
    
    return fieldMap;
  }

  /**
   * Generate a multi-source query plan
   */
  generateMultiSourceQueryPlan(
    question: string,
    sources: DataSourceWithSchema[]
  ): {
    primarySource: DataSourceWithSchema;
    secondarySources: DataSourceWithSchema[];
    correlationFields: Map<string, CrossSourceField[]>;
    queryStrategy: 'join' | 'union' | 'sequential';
  } {
    const correlationFields = this.detectCorrelatableFields(sources);
    
    // Determine query strategy based on question and available correlations
    let queryStrategy: 'join' | 'union' | 'sequential' = 'sequential';
    
    const questionLower = question.toLowerCase();
    
    // If question mentions correlation keywords, use join strategy
    if (
      questionLower.includes('affect') ||
      questionLower.includes('impact') ||
      questionLower.includes('correlat') ||
      questionLower.includes('relationship') ||
      questionLower.includes('between')
    ) {
      queryStrategy = 'join';
    }
    // If question asks for combined totals, use union strategy
    else if (
      questionLower.includes('total') ||
      questionLower.includes('overall') ||
      questionLower.includes('combined') ||
      questionLower.includes('across all')
    ) {
      queryStrategy = 'union';
    }
    
    // Select primary source (usually the one with most rows or most recent)
    const primarySource = sources.sort((a, b) => b.rowCount - a.rowCount)[0];
    const secondarySources = sources.filter(s => s.id !== primarySource.id);
    
    return {
      primarySource,
      secondarySources,
      correlationFields,
      queryStrategy
    };
  }

  /**
   * Execute queries across multiple data sources
   */
  async executeMultiSourceQuery(
    sources: DataSourceWithSchema[],
    sqlQueries: Map<number, string>
  ): Promise<MultiSourceQueryResult> {
    try {
      const results: any = {};
      
      // Execute queries for each data source
      for (const [sourceId, query] of Array.from(sqlQueries)) {
        const source = sources.find(s => s.id === sourceId);
        if (!source) continue;
        
        // Execute query against the data source
        const rows = await db
          .select()
          .from(dataRows)
          .where(and(
            eq(dataRows.dataSourceId, sourceId),
            sql`${sql.raw(this.convertToDataRowFilter(query))}`
          ))
          .limit(5000);
        
        results[sourceId] = {
          sourceName: source.name,
          data: rows,
          rowCount: rows.length
        };
      }
      
      // Correlate results if needed
      const correlatedData = this.correlateResults(sources, results);
      
      return {
        sources,
        correlatedData
      };
      
    } catch (error) {
      logger.error('Multi-source query execution error:', error);
      return {
        sources,
        error: 'Failed to execute multi-source query'
      };
    }
  }

  /**
   * Convert SQL query to data row filter
   * This is a simplified version - in production you'd want more robust SQL parsing
   */
  private convertToDataRowFilter(query: string): string {
    // Extract WHERE clause and convert to JSON query
    // This is simplified - real implementation would parse SQL properly
    return 'true = true'; // Placeholder - would convert SQL WHERE to proper filter
  }

  /**
   * Correlate results from multiple data sources
   */
  private correlateResults(sources: DataSourceWithSchema[], results: any): any[] {
    // Simplified correlation logic
    // In production, this would use the detected correlation fields
    // to properly join/merge data from different sources
    
    const correlatedData: any[] = [];
    
    // For now, return flattened results
    Object.values(results).forEach((result: any) => {
      if (result.data && Array.isArray(result.data)) {
        correlatedData.push(...result.data.map((row: any) => ({
          ...row.data,
          _source: result.sourceName
        })));
      }
    });
    
    return correlatedData;
  }

  /**
   * Check if user can use multi-source features based on tier
   */
  canUseMultiSource(tier: string): boolean {
    return tier === 'professional' || tier === 'enterprise';
  }

  /**
   * Get the maximum number of sources allowed for a tier
   */
  getMaxSourcesForTier(tier: string): number {
    return TIER_LIMITS[tier as keyof typeof TIER_LIMITS] || 1;
  }
}

export const multiSourceService = new MultiSourceService();