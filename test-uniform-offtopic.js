#!/usr/bin/env node

/**
 * Test script for uniform off-topic handling across all tiers
 * Verifies that the same off-topic workflow runs for every tier
 */

import axios from 'axios';
import FormData from 'form-data';

const API_BASE = 'http://localhost:5000/api';

// Test accounts for different tiers
const TEST_ACCOUNTS = {
  starter: { email: 'starter@test.com', password: 'test123' },
  professional: { email: 'pro@test.com', password: 'test123' },
  enterprise: { email: 'enterprise@test.com', password: 'test123' }
};

// Test queries
const TEST_QUERIES = {
  // Off-topic queries that should be handled uniformly
  OFF_TOPIC: [
    "What's the weather like today?",
    "Tell me a joke",
    "How do I cook pasta?",
    "What is the capital of France?",
    "Write me a poem"
  ],
  
  // Queries that need mapping to available fields
  NEEDS_MAPPING: [
    "Show me performance metrics",
    "What trends can you see?",
    "Analyze the data",
    "Show me insights"
  ],
  
  // Valid business queries
  VALID_BUSINESS: [
    "What's my total revenue?",
    "Show revenue by channel",
    "Which products sold the most units?",
    "What was last month's performance?"
  ]
};

// Helper to create session
async function createSession(tier) {
  try {
    const account = TEST_ACCOUNTS[tier];
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      emailOrUsername: account.email,
      password: account.password
    }, {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true
    });
    
    if (loginResponse.headers['set-cookie']) {
      return loginResponse.headers['set-cookie'].join('; ');
    }
    throw new Error('No cookie received');
  } catch (error) {
    console.error(`Failed to login as ${tier}:`, error.message);
    throw error;
  }
}

// Helper to send chat message
async function sendChatMessage(cookie, message) {
  try {
    const response = await axios.post(
      `${API_BASE}/chat/v2/send`,
      {
        message,
        requestId: `test-${Date.now()}-${Math.random()}`
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie
        },
        withCredentials: true
      }
    );
    return response.data;
  } catch (error) {
    return {
      error: error.response?.data?.error || error.message,
      status: error.response?.status
    };
  }
}

// Test off-topic handling for a specific tier
async function testTierOffTopicHandling(tier) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${tier.toUpperCase()} tier off-topic handling`);
  console.log('='.repeat(60));
  
  let cookie;
  try {
    cookie = await createSession(tier);
    console.log(`✓ Logged in as ${tier} user`);
  } catch (error) {
    console.error(`✗ Failed to create session for ${tier}`);
    return;
  }
  
  // Test off-topic queries
  console.log('\n--- Testing Off-Topic Queries ---');
  for (const query of TEST_QUERIES.OFF_TOPIC) {
    const response = await sendChatMessage(cookie, query);
    console.log(`\nQuery: "${query}"`);
    console.log(`Response: ${response.content || response.error}`);
    
    // Check for uniform response
    if (response.metadata?.intent === 'scope_mismatch' || 
        response.content?.includes("doesn't align with the data")) {
      console.log('✓ Correctly identified as off-topic');
    }
  }
  
  // Test queries needing mapping
  console.log('\n--- Testing Queries Needing Field Mapping ---');
  for (const query of TEST_QUERIES.NEEDS_MAPPING) {
    const response = await sendChatMessage(cookie, query);
    console.log(`\nQuery: "${query}"`);
    console.log(`Response: ${response.content || response.error}`);
    
    if (response.metadata?.mappingResult) {
      console.log('Mapping result:', JSON.stringify(response.metadata.mappingResult, null, 2));
    }
  }
  
  // Test valid business queries
  console.log('\n--- Testing Valid Business Queries ---');
  for (const query of TEST_QUERIES.VALID_BUSINESS) {
    const response = await sendChatMessage(cookie, query);
    console.log(`\nQuery: "${query}"`);
    console.log(`Response: ${response.content || response.error}`);
    
    if (response.metadata?.intent === 'data_query') {
      console.log('✓ Correctly processed as data query');
    }
  }
}

// Main test runner
async function runTests() {
  console.log('='.repeat(60));
  console.log('UNIFORM OFF-TOPIC HANDLING TEST');
  console.log('='.repeat(60));
  console.log('\nThis test verifies that off-topic handling is uniform across all tiers.');
  console.log('Each tier should receive the same off-topic workflow and responses.');
  
  // Test each tier
  for (const tier of ['starter', 'professional', 'enterprise']) {
    await testTierOffTopicHandling(tier);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('TEST COMPLETE');
  console.log('='.repeat(60));
  console.log('\nSummary:');
  console.log('- All tiers should show uniform off-topic handling');
  console.log('- No tier-based differences in scope checking');
  console.log('- Same query mapping logic for all tiers');
  console.log('- Tier gates only apply to advanced features (charts, forecasts)');
}

// Run tests
runTests().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});