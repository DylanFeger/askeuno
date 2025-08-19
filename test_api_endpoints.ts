/**
 * API Endpoint Tests
 * Tests the REST API endpoints for the AI chat system
 */

import request from 'supertest';
import { app } from './server/index';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

describe('AI Chat API Endpoints', () => {
  let authToken: string;
  let testUserId: number;
  let testDataSourceId: number;
  let testConversationId: number;
  
  beforeAll(async () => {
    // Setup test user and authenticate
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'testpass123'
      });
    
    authToken = loginResponse.headers['set-cookie'][0];
    testUserId = loginResponse.body.user.id;
  });
  
  describe('POST /api/ai/chat', () => {
    test('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .send({
          message: 'Show me sales data'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toContain('authenticated');
    });
    
    test('should reject request without active data source', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Cookie', authToken)
        .send({
          message: 'Show me sales data'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('data source');
    });
    
    test('should process valid data query', async () => {
      // First upload a test data file
      const uploadResponse = await request(app)
        .post('/api/data-sources/upload')
        .set('Cookie', authToken)
        .attach('file', 'test_data.csv')
        .field('name', 'Test Sales Data');
      
      testDataSourceId = uploadResponse.body.dataSourceId;
      
      // Now make chat request
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Cookie', authToken)
        .send({
          message: 'Show me total sales',
          dataSourceId: testDataSourceId
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
      expect(response.body).toHaveProperty('conversationId');
      expect(response.body).toHaveProperty('queryType');
      expect(response.body.queryType).toBe('data_query');
      
      testConversationId = response.body.conversationId;
    });
    
    test('should enforce rate limits', async () => {
      // Make 20 requests quickly (starter tier limit)
      const promises = [];
      for (let i = 0; i < 21; i++) {
        promises.push(
          request(app)
            .post('/api/ai/chat')
            .set('Cookie', authToken)
            .send({
              message: `Query ${i}`,
              dataSourceId: testDataSourceId,
              conversationId: testConversationId
            })
        );
      }
      
      const responses = await Promise.all(promises);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
      expect(rateLimited[0].body.error).toContain('rate limit');
    });
    
    test('should reject irrelevant queries', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Cookie', authToken)
        .send({
          message: 'What is the weather today?',
          dataSourceId: testDataSourceId
        });
      
      expect(response.status).toBe(200);
      expect(response.body.response).toContain('business data');
      expect(response.body.queryType).toBe('irrelevant');
    });
    
    test('should handle product FAQ queries', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Cookie', authToken)
        .send({
          message: 'How much does Euno cost?',
          dataSourceId: testDataSourceId
        });
      
      expect(response.status).toBe(200);
      expect(response.body.queryType).toBe('faq_product');
      expect(response.body.response).toContain('pricing');
    });
  });
  
  describe('GET /api/ai/conversation/:id', () => {
    test('should retrieve conversation history', async () => {
      const response = await request(app)
        .get(`/api/ai/conversation/${testConversationId}`)
        .set('Cookie', authToken);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('messages');
      expect(Array.isArray(response.body.messages)).toBe(true);
    });
    
    test('should not allow access to other users conversations', async () => {
      // Login as different user
      const otherUserLogin = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'otheruser',
          password: 'otherpass123'
        });
      
      const otherAuthToken = otherUserLogin.headers['set-cookie'][0];
      
      const response = await request(app)
        .get(`/api/ai/conversation/${testConversationId}`)
        .set('Cookie', otherAuthToken);
      
      expect(response.status).toBe(403);
      expect(response.body.error).toContain('access');
    });
  });
  
  describe('POST /api/ai/analyze', () => {
    test('should generate SQL for data query', async () => {
      const response = await request(app)
        .post('/api/ai/analyze')
        .set('Cookie', authToken)
        .send({
          query: 'Show me top selling products',
          dataSourceId: testDataSourceId
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('sql');
      expect(response.body.sql).toMatch(/^(SELECT|WITH)/i);
      expect(response.body).toHaveProperty('results');
    });
    
    test('should prevent SQL injection', async () => {
      const response = await request(app)
        .post('/api/ai/analyze')
        .set('Cookie', authToken)
        .send({
          query: "'; DROP TABLE users; --",
          dataSourceId: testDataSourceId
        });
      
      expect(response.status).toBe(200);
      // Should sanitize and generate safe SQL
      expect(response.body.sql).not.toContain('DROP');
      expect(response.body.sql).toMatch(/^(SELECT|WITH)/i);
    });
  });
  
  describe('Tier-based Feature Access', () => {
    test('should limit features for starter tier', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Cookie', authToken)
        .send({
          message: 'Create a forecast for next quarter',
          dataSourceId: testDataSourceId
        });
      
      expect(response.status).toBe(200);
      expect(response.body.response).toContain('upgrade');
      expect(response.body.features?.forecasting).toBe(false);
    });
    
    test('should provide suggestions for pro tier', async () => {
      // Mock pro tier user
      const proUserLogin = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'prouser',
          password: 'propass123'
        });
      
      const proAuthToken = proUserLogin.headers['set-cookie'][0];
      
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Cookie', proAuthToken)
        .send({
          message: 'Analyze sales trends',
          dataSourceId: testDataSourceId
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('suggestions');
      expect(Array.isArray(response.body.suggestions)).toBe(true);
    });
    
    test('should allow visualizations for elite tier', async () => {
      // Mock elite tier user
      const eliteUserLogin = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'eliteuser',
          password: 'elitepass123'
        });
      
      const eliteAuthToken = eliteUserLogin.headers['set-cookie'][0];
      
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Cookie', eliteAuthToken)
        .send({
          message: 'Create a chart showing monthly revenue',
          dataSourceId: testDataSourceId
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('chartData');
      expect(response.body.features?.visualizations).toBe(true);
    });
  });
  
  afterAll(async () => {
    // Cleanup test data
    if (testDataSourceId) {
      await request(app)
        .delete(`/api/data-sources/${testDataSourceId}`)
        .set('Cookie', authToken);
    }
  });
});

console.log('API Endpoint Test Suite - Ready to run');
console.log('Run with: npm test test_api_endpoints.ts');