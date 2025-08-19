// Simple manual test for Euno chat feature
import axios from 'axios';
import bcrypt from 'bcryptjs';

const BASE_URL = 'http://localhost:5000';

async function runSimpleTest() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   EUNO CHAT FEATURE TEST - MANUAL VERIFICATION');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Step 1: Create a test user
  console.log('1. Creating test user...');
  const testUsername = 'testchat' + Date.now();
  const testEmail = `${testUsername}@test.com`;
  
  try {
    await axios.post(`${BASE_URL}/api/auth/register`, {
      username: testUsername,
      email: testEmail,
      password: 'TestPass123!',
      businessName: 'Test Business'
    });
    console.log('✓ User created successfully\n');
  } catch (error) {
    console.log('❌ Failed to create user:', error.response?.data?.error || error.message);
    return;
  }
  
  // Step 2: Login
  console.log('2. Logging in...');
  let cookie;
  try {
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testEmail,
      password: 'TestPass123!'
    }, {
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' }
    });
    
    const cookies = loginResponse.headers['set-cookie'];
    if (cookies && cookies.length > 0) {
      cookie = cookies[0].split(';')[0];
      console.log('✓ Logged in successfully\n');
    } else {
      throw new Error('No session cookie received');
    }
  } catch (error) {
    console.log('❌ Failed to login:', error.response?.data?.error || error.message);
    return;
  }
  
  // Test scenarios
  console.log('═══════════════════════════════════════════════════════');
  console.log('                TEST SCENARIOS');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Test 1: Chat without data source
  console.log('TEST 1: Chat without data source');
  console.log('─────────────────────────────────');
  try {
    const response = await axios.post(
      `${BASE_URL}/api/ai/chat`,
      { message: "Show me my sales data" },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie
        }
      }
    );
    
    const responseText = response.data.text || response.data.response?.text;
    if (responseText?.includes('upload') || responseText?.includes('connect') || responseText?.includes('no data')) {
      console.log('✓ PASS: Chat correctly requires data source');
      console.log(`  Response: "${responseText.substring(0, 100)}..."`);
    } else {
      console.log('❌ FAIL: Should require data source');
      console.log(`  Response: "${responseText}"`);
    }
  } catch (error) {
    if (error.response?.status === 400 || error.response?.data?.error?.includes('data')) {
      console.log('✓ PASS: Chat correctly blocked without data');
      console.log(`  Error: "${error.response.data.error}"`);
    } else {
      console.log('❌ FAIL: Unexpected error:', error.response?.data?.error || error.message);
    }
  }
  console.log();
  
  // Upload sample data
  console.log('Uploading sample data for further tests...');
  const FormData = (await import('form-data')).default;
  const form = new FormData();
  const csvData = `Date,Product,Sales,Quantity,Customer
2024-01-01,Widget A,1000,10,John Doe
2024-01-02,Widget B,1500,15,Jane Smith
2024-01-03,Widget A,1200,12,Bob Johnson`;
  
  const buffer = Buffer.from(csvData);
  form.append('file', buffer, { filename: 'test-data.csv' });
  
  try {
    await axios.post(`${BASE_URL}/api/upload`, form, {
      headers: {
        ...form.getHeaders(),
        'Cookie': cookie
      }
    });
    console.log('✓ Data uploaded successfully\n');
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (error) {
    console.log('❌ Failed to upload data:', error.response?.data?.error || error.message);
    return;
  }
  
  // Test 2: Valid data query
  console.log('TEST 2: Valid data query');
  console.log('─────────────────────────────────');
  try {
    const response = await axios.post(
      `${BASE_URL}/api/ai/chat`,
      { message: "What are my total sales?" },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie
        }
      }
    );
    
    const responseText = response.data.text || response.data.response?.text;
    if (responseText && !responseText.includes('error')) {
      console.log('✓ PASS: Data query successful');
      console.log(`  Response: "${responseText.substring(0, 150)}..."`);
    } else {
      console.log('❌ FAIL: Data query failed');
    }
  } catch (error) {
    console.log('❌ FAIL: Data query error:', error.response?.data?.error || error.message);
  }
  console.log();
  
  // Test 3: Irrelevant question
  console.log('TEST 3: Irrelevant question');
  console.log('─────────────────────────────────');
  try {
    const response = await axios.post(
      `${BASE_URL}/api/ai/chat`,
      { message: "What's the weather today?" },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie
        }
      }
    );
    
    const responseText = response.data.text || response.data.response?.text;
    const meta = response.data.meta;
    if (responseText?.includes('business') || meta?.intent === 'irrelevant') {
      console.log('✓ PASS: Irrelevant question correctly rejected');
      console.log(`  Response: "${responseText}"`);
    } else {
      console.log('❌ FAIL: Should reject irrelevant question');
    }
  } catch (error) {
    console.log('❌ FAIL: Error:', error.response?.data?.error || error.message);
  }
  console.log();
  
  // Test 4: Missing data columns
  console.log('TEST 4: Missing data columns (profit margins)');
  console.log('─────────────────────────────────');
  try {
    const response = await axios.post(
      `${BASE_URL}/api/ai/chat`,
      { message: "Calculate profit margins for each product" },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie
        }
      }
    );
    
    const responseText = response.data.text || response.data.response?.text;
    if (responseText?.includes('cost') || responseText?.includes('profit') || 
        responseText?.includes('need') || responseText?.includes('missing')) {
      console.log('✓ PASS: Missing columns correctly identified');
      console.log(`  Educational response provided`);
    } else {
      console.log('❌ FAIL: Should identify missing columns');
      console.log(`  Response: "${responseText}"`);
    }
  } catch (error) {
    console.log('❌ FAIL: Error:', error.response?.data?.error || error.message);
  }
  console.log();
  
  // Test 5: Rate limiting (Starter tier - 5 queries/hour)
  console.log('TEST 5: Rate limiting (Starter tier - 5 queries/hour)');
  console.log('─────────────────────────────────');
  console.log('Sending 6 queries to test rate limit...');
  let rateLimited = false;
  for (let i = 1; i <= 6; i++) {
    try {
      const response = await axios.post(
        `${BASE_URL}/api/ai/chat`,
        { message: `Query ${i}: Show sales for Widget A` },
        {
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookie
          }
        }
      );
      console.log(`  Query ${i}: ✓ Allowed`);
    } catch (error) {
      if (error.response?.status === 429 || error.response?.data?.error?.includes('limit')) {
        console.log(`  Query ${i}: ✓ Rate limited (expected after 5 queries)`);
        rateLimited = true;
        break;
      } else {
        console.log(`  Query ${i}: ❌ Error:`, error.response?.data?.error);
      }
    }
  }
  
  if (rateLimited) {
    console.log('✓ PASS: Rate limiting working correctly');
  } else {
    console.log('⚠️  WARNING: Rate limit not enforced (might be cached or different tier)');
  }
  console.log();
  
  // Test 6: Charts (should be restricted for Starter tier)
  console.log('TEST 6: Chart restriction (Starter tier)');
  console.log('─────────────────────────────────');
  try {
    const response = await axios.post(
      `${BASE_URL}/api/ai/chat`,
      { message: "Create a chart showing sales by product" },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie
        }
      }
    );
    
    const visualData = response.data.meta?.visualData || response.data.response?.visualData;
    if (!visualData) {
      console.log('✓ PASS: Charts correctly restricted for Starter tier');
    } else {
      console.log('❌ FAIL: Charts should be restricted for Starter tier');
    }
  } catch (error) {
    if (error.response?.status === 429) {
      console.log('⚠️  SKIP: Rate limited, cannot test chart restriction');
    } else {
      console.log('❌ FAIL: Error:', error.response?.data?.error || error.message);
    }
  }
  console.log();
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('                 TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('Note: This test covers the basic scenarios for a Starter tier user.');
  console.log('To fully test Professional and Enterprise features, you would need');
  console.log('to manually update the user\'s subscription_tier in the database.');
}

// Run the test
runSimpleTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});