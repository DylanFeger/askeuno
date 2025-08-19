// Comprehensive test script for Euno chat feature
// Tests all aspects: data source states, missing data, irrelevant questions, charts, tier restrictions

import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

const BASE_URL = 'http://localhost:5000';
let authCookie = '';

// Test user credentials for different tiers
const testUsers = {
  starter: { username: 'starteruser', email: 'starter@test.com', password: 'TestPass123!' },
  professional: { username: 'prouser', email: 'pro@test.com', password: 'TestPass123!' },
  enterprise: { username: 'enterpriseuser', email: 'enterprise@test.com', password: 'TestPass123!' }
};

// Sample CSV data
const sampleCSV = `Date,Product,Sales,Quantity,Customer
2024-01-01,Widget A,1000,10,John Doe
2024-01-02,Widget B,1500,15,Jane Smith
2024-01-03,Widget A,1200,12,Bob Johnson
2024-01-04,Widget C,2000,20,Alice Brown
2024-01-05,Widget B,1800,18,Charlie Davis`;

const sampleCSVMissingData = `Date,Product,Sales
2024-01-01,Widget A,1000
2024-01-02,Widget B,1500
2024-01-03,Widget A,1200`;

// Test scenarios
const testScenarios = [
  // Data queries - should work when data is connected
  { message: "What are my total sales?", expectedIntent: "data_query", tier: "all" },
  { message: "Show me the top selling products", expectedIntent: "data_query", tier: "all" },
  { message: "What was the average order value?", expectedIntent: "data_query", tier: "all" },
  
  // Missing data columns
  { message: "Calculate profit margins", expectedIntent: "missing_data", tier: "all" },
  { message: "What's my customer lifetime value?", expectedIntent: "missing_data", tier: "all" },
  { message: "Show me churn rate", expectedIntent: "missing_data", tier: "all" },
  
  // Irrelevant questions
  { message: "What's the weather like today?", expectedIntent: "irrelevant", tier: "all" },
  { message: "Tell me a joke", expectedIntent: "irrelevant", tier: "all" },
  { message: "How do I cook pasta?", expectedIntent: "irrelevant", tier: "all" },
  
  // Chart requests (Enterprise only)
  { message: "Create a chart of sales over time", expectedIntent: "chart", tier: "enterprise" },
  { message: "Show me a graph of product performance", expectedIntent: "chart", tier: "enterprise" },
  
  // Trend analysis
  { message: "What are the sales trends?", expectedIntent: "trends", tier: "all" },
  { message: "Analyze revenue growth patterns", expectedIntent: "trends", tier: "all" },
  
  // Predictions
  { message: "Forecast next month's sales", expectedIntent: "predictions", tier: "professional" },
  { message: "Predict customer behavior", expectedIntent: "predictions", tier: "professional" }
];

// Helper function to create test user
async function createTestUser(tier, userData) {
  try {
    // First try to register
    await axios.post(`${BASE_URL}/api/auth/register`, {
      ...userData,
      businessName: `Test ${tier} Business`
    });
    console.log(`✓ Created ${tier} user`);
  } catch (error) {
    // User might already exist, try to login
    if (error.response?.status === 409) {
      console.log(`• ${tier} user already exists`);
    } else if (error.response?.status === 400) {
      console.log(`• Validation error, user might exist`);
    }
  }
  
  // Login to get session - use username instead of email for login
  const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
    username: userData.username,
    password: userData.password
  }, {
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' }
  });
  
  // Extract cookie from response
  const cookies = loginResponse.headers['set-cookie'];
  if (cookies && cookies.length > 0) {
    const cookie = cookies[0].split(';')[0];
    
    // Update subscription tier if needed (simulating admin action)
    // Note: In production, this would be done through Stripe or admin panel
    // For testing, we'll need to manually update the database or have test accounts pre-configured
    
    return cookie;
  }
  throw new Error('No session cookie received');
}

// Helper function to upload file
async function uploadFile(cookie, fileName, fileContent) {
  const form = new FormData();
  const buffer = Buffer.from(fileContent);
  form.append('file', buffer, { filename: fileName });
  
  const response = await axios.post(`${BASE_URL}/api/upload`, form, {
    headers: {
      ...form.getHeaders(),
      'Cookie': cookie
    }
  });
  
  return response.data;
}

// Helper function to send chat message
async function sendChatMessage(cookie, message, conversationId = null) {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/ai/chat`,
      { message, conversationId },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie
        },
        timeout: 30000 // 30 second timeout for AI responses
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

// Test rate limiting
async function testRateLimit(cookie, tier, limit) {
  console.log(`\n  Testing rate limit (${limit} queries/hour):`);
  const results = [];
  
  for (let i = 0; i < limit + 2; i++) {
    const result = await sendChatMessage(cookie, `Test query ${i + 1}`);
    if (result.error) {
      console.log(`    Query ${i + 1}: ❌ Rate limited - ${result.error}`);
      break;
    } else {
      console.log(`    Query ${i + 1}: ✓ Success`);
    }
    results.push(result);
  }
  
  return results;
}

// Main test function
async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   EUNO CHAT FEATURE COMPREHENSIVE TEST SUITE');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };
  
  // Test each tier
  for (const [tierName, userData] of Object.entries(testUsers)) {
    console.log(`\n🔹 TESTING ${tierName.toUpperCase()} TIER`);
    console.log('━'.repeat(50));
    
    try {
      // Create user and login
      console.log(`\n1. Setting up ${tierName} user...`);
      const cookie = await createTestUser(tierName, userData);
      console.log(`   ✓ Logged in as ${tierName} user`);
      
      // Test 1: No data source (should fail)
      console.log(`\n2. Testing with NO DATA SOURCE:`);
      const noDataResult = await sendChatMessage(cookie, "Show me sales data");
      if (noDataResult.error || noDataResult.text?.includes('upload') || noDataResult.text?.includes('connect')) {
        console.log('   ✓ Correctly blocked - no data source');
        results.passed++;
      } else {
        console.log('   ❌ Should have blocked request without data');
        results.failed++;
      }
      
      // Upload data file
      console.log(`\n3. Uploading test data file...`);
      const uploadResult = await uploadFile(cookie, 'test-data.csv', sampleCSV);
      console.log(`   ✓ File uploaded successfully (ID: ${uploadResult.dataSourceId})`);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test 2: Valid data queries
      console.log(`\n4. Testing VALID DATA QUERIES:`);
      const dataQueryResult = await sendChatMessage(cookie, "What are my total sales?");
      if (!dataQueryResult.error && dataQueryResult.text) {
        console.log('   ✓ Data query successful');
        console.log(`   Response: ${dataQueryResult.text.substring(0, 100)}...`);
        results.passed++;
      } else {
        console.log('   ❌ Data query failed:', dataQueryResult.error);
        results.failed++;
      }
      
      // Test 3: Irrelevant questions
      console.log(`\n5. Testing IRRELEVANT QUESTIONS:`);
      const irrelevantResult = await sendChatMessage(cookie, "What's the weather today?");
      if (irrelevantResult.text?.includes('business data') || irrelevantResult.meta?.intent === 'irrelevant') {
        console.log('   ✓ Correctly rejected irrelevant question');
        results.passed++;
      } else {
        console.log('   ❌ Should have rejected irrelevant question');
        results.failed++;
      }
      
      // Test 4: Missing data columns
      console.log(`\n6. Testing MISSING DATA COLUMNS:`);
      const missingDataResult = await sendChatMessage(cookie, "Calculate profit margins for each product");
      if (missingDataResult.text?.includes('cost') || missingDataResult.text?.includes('profit') || 
          missingDataResult.text?.includes('missing') || missingDataResult.text?.includes('need')) {
        console.log('   ✓ Correctly identified missing columns');
        console.log(`   Educational response provided`);
        results.passed++;
      } else {
        console.log('   ❌ Should have identified missing columns');
        results.failed++;
      }
      
      // Test 5: Charts (Enterprise only)
      if (tierName === 'enterprise') {
        console.log(`\n7. Testing CHART GENERATION (Enterprise only):`);
        const chartResult = await sendChatMessage(cookie, "Create a chart showing sales by product");
        if (chartResult.meta?.visualData || chartResult.text?.includes('chart')) {
          console.log('   ✓ Chart generation available for Enterprise');
          results.passed++;
        } else {
          console.log('   ❌ Chart should be available for Enterprise');
          results.failed++;
        }
      } else {
        console.log(`\n7. Testing CHART RESTRICTION (${tierName}):`);
        const chartResult = await sendChatMessage(cookie, "Create a chart showing sales");
        if (!chartResult.meta?.visualData) {
          console.log(`   ✓ Charts correctly restricted for ${tierName}`);
          results.passed++;
        } else {
          console.log(`   ❌ Charts should be restricted for ${tierName}`);
          results.failed++;
        }
      }
      
      // Test 6: Follow-up suggestions (Pro and Enterprise)
      if (tierName !== 'starter') {
        console.log(`\n8. Testing FOLLOW-UP SUGGESTIONS (${tierName}):`);
        const suggestionResult = await sendChatMessage(cookie, "Analyze sales trends");
        if (suggestionResult.meta?.suggestedFollowUps || suggestionResult.response?.suggestedFollowUps) {
          console.log(`   ✓ Follow-up suggestions provided for ${tierName}`);
          results.passed++;
        } else {
          console.log(`   ❌ Should provide suggestions for ${tierName}`);
          results.failed++;
        }
      }
      
      // Test 7: Rate limiting
      console.log(`\n9. Testing RATE LIMITING:`);
      const limits = {
        starter: 5,
        professional: 25,
        enterprise: null // Unlimited but has spam protection
      };
      
      if (limits[tierName]) {
        // Test hitting the rate limit
        console.log(`   Testing ${tierName} limit (${limits[tierName]} queries/hour)...`);
        
        // Send queries up to limit
        for (let i = 0; i < limits[tierName] + 1; i++) {
          const result = await sendChatMessage(cookie, `Rate limit test ${i + 1}`);
          if (i < limits[tierName]) {
            if (!result.error) {
              if (i === limits[tierName] - 1) {
                console.log(`   ✓ Allowed ${limits[tierName]} queries`);
                results.passed++;
              }
            } else {
              console.log(`   ❌ Query ${i + 1} failed unexpectedly:`, result.error);
              results.failed++;
              break;
            }
          } else {
            // Should be rate limited
            if (result.error || result.meta?.limited) {
              console.log(`   ✓ Rate limit enforced after ${limits[tierName]} queries`);
              results.passed++;
            } else {
              console.log(`   ❌ Should have been rate limited`);
              results.failed++;
            }
          }
        }
      } else {
        console.log(`   Skipping rate limit test for unlimited ${tierName} tier`);
      }
      
    } catch (error) {
      console.error(`\n❌ Error testing ${tierName} tier:`, error.message);
      results.errors.push({ tier: tierName, error: error.message });
      results.failed++;
    }
  }
  
  // Final summary
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('                    TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  if (results.errors.length > 0) {
    console.log(`\n⚠️  Errors encountered:`);
    results.errors.forEach(e => {
      console.log(`   - ${e.tier}: ${e.error}`);
    });
  }
  console.log('\n');
  
  // Overall result
  if (results.failed === 0 && results.errors.length === 0) {
    console.log('🎉 ALL TESTS PASSED! Chat feature is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the results above.');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});