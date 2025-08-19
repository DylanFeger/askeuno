/**
 * Backend AI Pipeline Tests
 * Tests the backend components of the AI chat system
 */

import { generateSQL, generateAnalysis } from './server/ai/prompts';
import { AIOrchestrator } from './server/ai/orchestrator';
import { checkActiveDataSource } from './server/data/datasource';

describe('Backend AI Service Tests', () => {
  
  describe('Orchestrator Flow', () => {
    test('should handle complete chat flow', async () => {
      const orchestrator = new AIOrchestrator();
      
      // Test complete flow with data query
      const request = {
        userId: 1,
        message: 'Show me total sales for last month',
        conversationId: 1,
        userTier: 'pro' as const,
        activeDataSourceId: 123
      };
      
      const result = await orchestrator.processChat(request);
      
      expect(result).toHaveProperty('response');
      expect(result).toHaveProperty('queryType');
      expect(result).toHaveProperty('conversationId');
      expect(result.queryType).toBe('data_query');
    });
    
    test('should block queries without data source', async () => {
      const orchestrator = new AIOrchestrator();
      
      const request = {
        userId: 1,
        message: 'Show me sales data',
        conversationId: 1,
        userTier: 'pro' as const,
        activeDataSourceId: null
      };
      
      const result = await orchestrator.processChat(request);
      
      expect(result.response).toContain('select a data source');
      expect(result.queryType).toBe('blocked');
    });
    
    test('should reject irrelevant queries', async () => {
      const orchestrator = new AIOrchestrator();
      
      const request = {
        userId: 1,
        message: 'What is the weather like?',
        conversationId: 1,
        userTier: 'pro' as const,
        activeDataSourceId: 123
      };
      
      const result = await orchestrator.processChat(request);
      
      expect(result.response).toContain('business data');
      expect(result.queryType).toBe('irrelevant');
    });
  });
  
  describe('SQL Generation', () => {
    test('should generate safe SQL queries', () => {
      const queries = [
        'Show total sales by month',
        'List top 10 customers',
        'Calculate average order value'
      ];
      
      queries.forEach(query => {
        const mockTableStructure = {
          tables: ['sales', 'customers', 'orders'],
          columns: {
            sales: ['id', 'date', 'amount', 'customer_id'],
            customers: ['id', 'name', 'email'],
            orders: ['id', 'order_date', 'total', 'customer_id']
          }
        };
        
        const sql = generateSQL(query, mockTableStructure);
        
        // Check SQL is safe (only SELECT/WITH)
        expect(sql).toMatch(/^(SELECT|WITH)/i);
        
        // Check no dangerous operations
        expect(sql).not.toMatch(/DELETE|UPDATE|INSERT|DROP|TRUNCATE/i);
      });
    });
    
    test('should handle missing columns gracefully', () => {
      const query = 'Show me profit margins';
      const tableStructure = {
        tables: ['sales'],
        columns: {
          sales: ['id', 'date', 'amount'] // No profit column
        }
      };
      
      const sql = generateSQL(query, tableStructure);
      
      // Should still generate valid SQL or indicate missing data
      expect(sql).toBeTruthy();
    });
  });
  
  describe('Analysis Generation', () => {
    test('should provide tier-appropriate analysis', () => {
      const queryResults = {
        rows: [
          { month: 'January', sales: 50000 },
          { month: 'February', sales: 60000 },
          { month: 'March', sales: 55000 }
        ]
      };
      
      // Test Beginner tier (short response)
      const beginnerAnalysis = generateAnalysis(
        'Show sales by month',
        queryResults,
        'starter'
      );
      expect(beginnerAnalysis.split(' ').length).toBeLessThanOrEqual(80);
      
      // Test Pro tier (medium response with suggestions)
      const proAnalysis = generateAnalysis(
        'Show sales by month',
        queryResults,
        'pro'
      );
      expect(proAnalysis.split(' ').length).toBeLessThanOrEqual(180);
      expect(proAnalysis).toContain('consider');
      
      // Test Elite tier (detailed analysis)
      const eliteAnalysis = generateAnalysis(
        'Show sales by month',
        queryResults,
        'elite'
      );
      expect(eliteAnalysis.length).toBeGreaterThan(beginnerAnalysis.length);
    });
    
    test('should never fabricate data', () => {
      const queryResults = {
        rows: [
          { product: 'Widget A', sales: 1000 },
          { product: 'Widget B', sales: 1500 }
        ]
      };
      
      const analysis = generateAnalysis(
        'Show me profit margins',
        queryResults,
        'pro'
      );
      
      // Should acknowledge missing data
      expect(analysis).toMatch(/no profit|profit.*not available|missing.*profit/i);
    });
  });
  
  describe('Data Source Validation', () => {
    test('should validate file data sources', async () => {
      // Mock database call
      const mockFileSource = {
        id: 1,
        type: 'file',
        name: 'sales_data.csv',
        rowCount: 1000
      };
      
      const result = await checkActiveDataSource(1, mockFileSource.id);
      
      expect(result).toHaveProperty('hasActiveSource');
      expect(result).toHaveProperty('sourceType');
      expect(result).toHaveProperty('rowCount');
    });
    
    test('should validate live connections', async () => {
      // Mock live connection
      const mockLiveSource = {
        id: 2,
        type: 'connection',
        name: 'Shopify Store',
        platform: 'shopify'
      };
      
      const result = await checkActiveDataSource(1, mockLiveSource.id);
      
      expect(result).toHaveProperty('hasActiveSource');
      expect(result).toHaveProperty('sourceType');
      expect(result.sourceType).toBe('connection');
    });
  });
});

console.log('Backend Pipeline Test Suite - Ready to run');
console.log('Run with: npm test test_backend_pipeline.ts');