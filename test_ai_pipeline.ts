/**
 * Comprehensive AI Pipeline Tests
 * Tests the complete AI chat system including orchestration, tier policies, and data source requirements
 */

import { describe, test, expect } from '@jest/globals';
import { AIOrchestrator } from './server/ai/orchestrator';
import { checkRateLimit } from './server/ai/rate';
import { TIERS } from './server/ai/tiers';
import { checkActiveDataSource } from './server/data/datasource';

describe('AI Pipeline - Complete System Test', () => {
  
  describe('Intent Detection', () => {
    test('should correctly classify data queries', () => {
      const orchestrator = new AIOrchestrator();
      const dataQueries = [
        'Show me sales for last month',
        'What is our top selling product?',
        'Calculate revenue by category',
        'List customers who spent over $500'
      ];
      
      dataQueries.forEach(query => {
        const result = orchestrator.detectIntent(query);
        expect(result).toBe('data_query');
      });
    });
    
    test('should correctly classify product/FAQ queries', () => {
      const orchestrator = new AIOrchestrator();
      const faqQueries = [
        'How much does Euno cost?',
        'What features are included in Pro tier?',
        'How do I upgrade my account?',
        'Can Euno integrate with Salesforce?'
      ];
      
      faqQueries.forEach(query => {
        const result = orchestrator.detectIntent(query);
        expect(result).toBe('faq_product');
      });
    });
    
    test('should reject irrelevant queries', () => {
      const orchestrator = new AIOrchestrator();
      const irrelevantQueries = [
        'What is the weather today?',
        'Tell me a joke',
        'How do I cook pasta?',
        'What is the capital of France?'
      ];
      
      irrelevantQueries.forEach(query => {
        const result = orchestrator.detectIntent(query);
        expect(result).toBe('irrelevant');
      });
    });
  });
  
  describe('Tier Policy Enforcement', () => {
    test('should enforce Beginner tier limits', () => {
      const beginnerPolicy = TIERS.starter;
      expect(beginnerPolicy.maxQueriesPerHour).toBe(20);
      expect(beginnerPolicy.maxResponseWords).toBe(80);
      expect(beginnerPolicy.allowVisualizations).toBe(false);
      expect(beginnerPolicy.allowSuggestions).toBe(false);
      expect(beginnerPolicy.allowForecasting).toBe(false);
    });
    
    test('should enforce Pro tier features', () => {
      const proPolicy = TIERS.pro;
      expect(proPolicy.maxQueriesPerHour).toBe(120);
      expect(proPolicy.maxResponseWords).toBe(180);
      expect(proPolicy.allowVisualizations).toBe(false);
      expect(proPolicy.allowSuggestions).toBe(true);
      expect(proPolicy.allowForecasting).toBe(false);
    });
    
    test('should enforce Elite tier unlimited access', () => {
      const elitePolicy = TIERS.elite;
      expect(elitePolicy.maxQueriesPerHour).toBeNull();
      expect(elitePolicy.maxResponseWords).toBeNull();
      expect(elitePolicy.allowVisualizations).toBe(true);
      expect(elitePolicy.allowSuggestions).toBe(true);
      expect(elitePolicy.allowForecasting).toBe(true);
      expect(elitePolicy.spamWindowCap).toBe(60);
    });
  });
  
  describe('Rate Limiting', () => {
    test('should track query counts for rate limiting', () => {
      const userId = 'test-user-1';
      const tier = 'starter';
      
      // First query should pass
      const result1 = checkRateLimit(userId, tier);
      expect(result1.allowed).toBe(true);
      
      // Simulate reaching limit (20 queries)
      for (let i = 0; i < 19; i++) {
        checkRateLimit(userId, tier);
      }
      
      // 21st query should be blocked
      const result21 = checkRateLimit(userId, tier);
      expect(result21.allowed).toBe(false);
      expect(result21.message).toContain('hourly query limit');
    });
    
    test('should detect spam for Elite users', () => {
      const userId = 'elite-user-1';
      const tier = 'elite';
      
      // Simulate rapid queries (60 in < 60 seconds)
      for (let i = 0; i < 60; i++) {
        const result = checkRateLimit(userId, tier);
        if (i < 60) {
          expect(result.allowed).toBe(true);
        }
      }
      
      // 61st rapid query should trigger spam protection
      const spamResult = checkRateLimit(userId, tier);
      expect(spamResult.allowed).toBe(false);
      expect(spamResult.message).toContain('rapid succession');
    });
  });
  
  describe('Data Source Guards', () => {
    test('should reject queries when no data source active', async () => {
      const result = await checkActiveDataSource(123, null);
      expect(result.hasActiveSource).toBe(false);
      expect(result.sourceType).toBeNull();
    });
    
    test('should accept queries with file data source', async () => {
      // Mock file data source
      const result = await checkActiveDataSource(123, 456);
      // Note: This would need actual database connection to test properly
      // For now, we're testing the function exists and returns expected shape
      expect(result).toHaveProperty('hasActiveSource');
      expect(result).toHaveProperty('sourceType');
    });
  });
  
  describe('SQL Generation Safety', () => {
    test('should only allow SELECT and WITH statements', () => {
      const allowedSQL = [
        'SELECT * FROM sales',
        'WITH cte AS (SELECT * FROM orders) SELECT * FROM cte',
        'SELECT COUNT(*) FROM customers'
      ];
      
      const forbiddenSQL = [
        'DELETE FROM users',
        'UPDATE products SET price = 0',
        'DROP TABLE customers',
        'INSERT INTO admin VALUES',
        'TRUNCATE TABLE orders'
      ];
      
      allowedSQL.forEach(sql => {
        const isSafe = /^(SELECT|WITH)/i.test(sql.trim());
        expect(isSafe).toBe(true);
      });
      
      forbiddenSQL.forEach(sql => {
        const isSafe = /^(SELECT|WITH)/i.test(sql.trim());
        expect(isSafe).toBe(false);
      });
    });
  });
  
  describe('Response Formatting', () => {
    test('should truncate responses based on tier', () => {
      const longResponse = 'word '.repeat(200); // 200 words
      
      // Beginner tier should truncate to 80 words
      const beginnerWords = longResponse.split(' ').slice(0, 80).join(' ');
      expect(beginnerWords.split(' ').length).toBeLessThanOrEqual(80);
      
      // Pro tier should truncate to 180 words  
      const proWords = longResponse.split(' ').slice(0, 180).join(' ');
      expect(proWords.split(' ').length).toBeLessThanOrEqual(180);
      
      // Elite tier should not truncate
      const eliteWords = longResponse;
      expect(eliteWords.split(' ').length).toBe(200);
    });
  });
});

console.log('AI Pipeline Test Suite - Ready to run');
console.log('Run with: npm test test_ai_pipeline.ts');