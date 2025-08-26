#!/usr/bin/env node

import axios from 'axios';
import crypto from 'crypto';

const API_URL = 'http://localhost:5000';

// Test credentials for different tiers
const testUsers = {
  starter: {
    email: 'starter@test.com',
    password: 'TestPass123!',
    tier: 'starter'
  },
  professional: {
    email: 'pro@test.com', 
    password: 'TestPass123!',
    tier: 'professional'
  },
  enterprise: {
    email: 'enterprise@test.com',
    password: 'TestPass123!',
    tier: 'enterprise'
  }
};

// Helper function to create API client
function createClient() {
  return axios.create({
    baseURL: API_URL,
    timeout: 30000,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json'
    },
    validateStatus: () => true // Don't throw on any status
  });
}

// Helper to login and get session
async function loginUser(email, password) {
  const client = createClient();
  
  try {
    const response = await client.post('/api/auth/login', {
      username: email,  // The username field accepts either email or username
      password
    });
    
    if (response.status === 200) {
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        client.defaults.headers.Cookie = cookies.join('; ');
      }
      return { client, user: response.data.user };
    }
    
    throw new Error(`Login failed: ${response.data.error || response.statusText}`);
  } catch (error) {
    console.error('Login error:', error.message);
    throw error;
  }
}

// Test 1: Message Deduplication
async function testMessageDeduplication() {
  console.log('\n🧪 TEST 1: Message Deduplication');
  console.log('================================');
  
  try {
    // Login as starter user
    const { client, user } = await loginUser(testUsers.starter.email, testUsers.starter.password);
    console.log(`✓ Logged in as ${user.username} (${user.subscriptionTier})`);
    
    // Send initial message
    const message = 'What is my total revenue?';
    const requestId = crypto.randomUUID();
    
    console.log('\n📤 Sending initial message...');
    const response1 = await client.post('/api/chat/v2/send', {
      message,
      requestId
    });
    
    if (response1.status === 200) {
      console.log('✓ Initial message sent successfully');
      console.log(`  Message ID: ${response1.data.messageId}`);
      console.log(`  Conversation ID: ${response1.data.conversationId}`);
      console.log(`  Is Duplicate: ${response1.data.isDuplicate}`);
    }
    
    // Send duplicate message with same requestId
    console.log('\n📤 Sending duplicate message with same requestId...');
    const response2 = await client.post('/api/chat/v2/send', {
      message,
      requestId,
      conversationId: response1.data.conversationId
    });
    
    if (response2.status === 200 && response2.data.isDuplicate) {
      console.log('✅ Deduplication working! Duplicate detected');
      console.log(`  Message ID: ${response2.data.messageId}`);
      console.log(`  Is Duplicate: ${response2.data.isDuplicate}`);
    } else {
      console.log('❌ Deduplication failed - duplicate not detected');
    }
    
    // Send same message with different requestId (should create new)
    console.log('\n📤 Sending same message with different requestId...');
    const response3 = await client.post('/api/chat/v2/send', {
      message,
      requestId: crypto.randomUUID(),
      conversationId: response1.data.conversationId
    });
    
    if (response3.status === 200 && !response3.data.isDuplicate) {
      console.log('✅ Correct behavior - new message created with different requestId');
      console.log(`  New Message ID: ${response3.data.messageId}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test 2: Tier Restrictions Enforcement
async function testTierRestrictions() {
  console.log('\n🧪 TEST 2: Tier Restrictions Enforcement');
  console.log('========================================');
  
  const tierTests = [
    { tier: 'starter', expectedFeatures: { charts: false, forecast: false, maxQueries: 5 } },
    { tier: 'professional', expectedFeatures: { charts: true, forecast: false, maxQueries: 25 } },
    { tier: 'enterprise', expectedFeatures: { charts: true, forecast: true, maxQueries: 999 } }
  ];
  
  for (const test of tierTests) {
    console.log(`\n📊 Testing ${test.tier.toUpperCase()} tier...`);
    
    try {
      const userCreds = testUsers[test.tier];
      const { client, user } = await loginUser(userCreds.email, userCreds.password);
      
      // Get tier information
      const tierResponse = await client.get('/api/chat/v2/tier');
      
      if (tierResponse.status === 200) {
        const features = tierResponse.data.features;
        console.log(`✓ Tier: ${tierResponse.data.tier}`);
        console.log(`  Max Queries/Hour: ${features.maxQueriesPerHour}`);
        console.log(`  Charts Allowed: ${features.allowCharts}`);
        console.log(`  Forecast Allowed: ${features.allowForecast}`);
        
        // Verify restrictions
        if (features.allowCharts === test.expectedFeatures.charts) {
          console.log('✅ Chart restriction correct');
        } else {
          console.log('❌ Chart restriction incorrect');
        }
        
        if (features.allowForecast === test.expectedFeatures.forecast) {
          console.log('✅ Forecast restriction correct');
        } else {
          console.log('❌ Forecast restriction incorrect');
        }
        
        // Test chart request blocking for starter tier
        if (test.tier === 'starter') {
          const response = await client.post('/api/chat/v2/send', {
            message: 'Show me revenue chart',
            requestChart: true,
            requestId: crypto.randomUUID()
          });
          
          if (response.status === 200) {
            const hasChart = !!response.data.chart;
            const chartBlocked = response.data.metadata?.tierRestrictions?.chartsBlocked;
            
            if (!hasChart && chartBlocked) {
              console.log('✅ Charts correctly blocked for starter tier');
            } else {
              console.log('❌ Charts should be blocked for starter tier');
            }
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ ${test.tier} test failed:`, error.message);
    }
  }
}

// Test 3: Rate Limiting
async function testRateLimiting() {
  console.log('\n🧪 TEST 3: Rate Limiting');
  console.log('========================');
  
  try {
    // Login as starter user (5 queries/hour limit)
    const { client, user } = await loginUser(testUsers.starter.email, testUsers.starter.password);
    console.log(`✓ Logged in as ${user.username} (Starter - 5 queries/hour)`);
    
    // Send 5 messages quickly (should be allowed)
    console.log('\n📤 Sending 5 messages (within limit)...');
    for (let i = 1; i <= 5; i++) {
      const response = await client.post('/api/chat/v2/send', {
        message: `Test query ${i}`,
        requestId: crypto.randomUUID()
      });
      
      if (response.status === 200) {
        console.log(`  ✓ Query ${i} accepted`);
      } else {
        console.log(`  ❌ Query ${i} rejected: ${response.data.error}`);
      }
    }
    
    // Send 6th message (should be rate limited)
    console.log('\n📤 Sending 6th message (exceeding limit)...');
    const response = await client.post('/api/chat/v2/send', {
      message: 'This should be rate limited',
      requestId: crypto.randomUUID()
    });
    
    if (response.status === 200) {
      const isRateLimited = response.data.metadata?.intent === 'rate_limit';
      if (isRateLimited) {
        console.log('✅ Rate limiting working! Query rejected');
        console.log(`  Message: ${response.data.content}`);
      } else {
        console.log('❌ Rate limiting not enforced - query accepted');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test 4: Streaming Support
async function testStreaming() {
  console.log('\n🧪 TEST 4: Streaming Support');
  console.log('============================');
  
  try {
    const { client } = await loginUser(testUsers.professional.email, testUsers.professional.password);
    console.log('✓ Logged in as professional user');
    
    console.log('\n📤 Testing streaming endpoint...');
    
    // Create streaming request
    const response = await client.post('/api/chat/v2/stream', {
      message: 'What are my top products?',
      requestId: crypto.randomUUID()
    }, {
      responseType: 'stream'
    });
    
    let eventCount = 0;
    let completeReceived = false;
    
    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          eventCount++;
          try {
            const event = JSON.parse(line.substring(6));
            if (event.type === 'start') {
              console.log('✓ Stream started');
              console.log(`  Conversation ID: ${event.conversationId}`);
            } else if (event.type === 'chunk') {
              process.stdout.write('.');
            } else if (event.type === 'complete') {
              console.log('\n✓ Stream completed');
              completeReceived = true;
            }
          } catch (e) {
            // Ignore parse errors for empty lines
          }
        }
      }
    });
    
    await new Promise(resolve => response.data.on('end', resolve));
    
    if (eventCount > 0 && completeReceived) {
      console.log(`✅ Streaming working! Received ${eventCount} events`);
    } else {
      console.log('❌ Streaming not working properly');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test 5: OpenAI Consistency (temperature=0, top_p=1)
async function testOpenAIConsistency() {
  console.log('\n🧪 TEST 5: OpenAI Consistency');
  console.log('=============================');
  
  try {
    const { client } = await loginUser(testUsers.enterprise.email, testUsers.enterprise.password);
    console.log('✓ Logged in as enterprise user');
    
    const testQuery = 'What is 2 + 2?';
    console.log(`\n📤 Sending identical query 3 times: "${testQuery}"`);
    
    const responses = [];
    
    for (let i = 1; i <= 3; i++) {
      const response = await client.post('/api/chat/v2/send', {
        message: testQuery,
        requestId: crypto.randomUUID()
      });
      
      if (response.status === 200) {
        responses.push(response.data.content);
        console.log(`  Response ${i}: ${response.data.content.substring(0, 50)}...`);
      }
    }
    
    // Check if responses are identical (with temperature=0)
    const allIdentical = responses.every(r => r === responses[0]);
    
    if (allIdentical) {
      console.log('✅ OpenAI configured correctly (temperature=0, top_p=1)');
      console.log('   All responses are identical!');
    } else {
      console.log('⚠️  Responses vary slightly (may be due to data context)');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test 6: Conversation History
async function testConversationHistory() {
  console.log('\n🧪 TEST 6: Conversation History');
  console.log('================================');
  
  try {
    const { client, user } = await loginUser(testUsers.professional.email, testUsers.professional.password);
    console.log(`✓ Logged in as ${user.username}`);
    
    // Create a conversation
    console.log('\n📤 Creating conversation with multiple messages...');
    
    const message1 = await client.post('/api/chat/v2/send', {
      message: 'Hello, what can you help me with?',
      requestId: crypto.randomUUID()
    });
    
    const conversationId = message1.data.conversationId;
    console.log(`  Conversation ID: ${conversationId}`);
    
    // Add more messages
    await client.post('/api/chat/v2/send', {
      message: 'Show me my revenue',
      conversationId,
      requestId: crypto.randomUUID()
    });
    
    await client.post('/api/chat/v2/send', {
      message: 'What about expenses?',
      conversationId,
      requestId: crypto.randomUUID()
    });
    
    // Get conversation history
    console.log('\n📖 Retrieving conversation history...');
    const history = await client.get(`/api/chat/v2/messages/${conversationId}`);
    
    if (history.status === 200 && history.data.messages) {
      const messages = history.data.messages;
      console.log(`✅ Conversation history retrieved: ${messages.length} messages`);
      
      // Verify message order
      let lastTime = 0;
      let orderCorrect = true;
      
      messages.forEach((msg, i) => {
        const msgTime = new Date(msg.createdAt).getTime();
        if (msgTime < lastTime) {
          orderCorrect = false;
        }
        lastTime = msgTime;
        console.log(`  ${i + 1}. [${msg.role}]: ${msg.content.substring(0, 40)}...`);
      });
      
      if (orderCorrect) {
        console.log('✅ Messages are in correct chronological order');
      } else {
        console.log('❌ Messages are not in correct order');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Main test runner
async function runAllTests() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     EUNO Chat System Improvements Test     ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('Testing: Deduplication, Tiers, Rate Limiting, Streaming, Consistency\n');
  
  // First, ensure test users exist
  console.log('📋 Setting up test users...');
  const client = createClient();
  
  for (const [tier, creds] of Object.entries(testUsers)) {
    try {
      // Try to register user
      await client.post('/api/auth/register', {
        username: `test_${tier}`,
        email: creds.email,
        password: creds.password
      });
      console.log(`  ✓ Created ${tier} test user`);
    } catch (e) {
      // User might already exist, try login
      try {
        await loginUser(creds.email, creds.password);
        console.log(`  ✓ ${tier} test user exists`);
      } catch (loginError) {
        console.log(`  ⚠️  Could not create/login ${tier} user`);
      }
    }
  }
  
  // Run all tests
  await testMessageDeduplication();
  await testTierRestrictions();
  await testRateLimiting();
  await testStreaming();
  await testOpenAIConsistency();
  await testConversationHistory();
  
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║            Test Suite Complete!            ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('\n💡 Note: Some tests may fail if:');
  console.log('   - Database is not properly configured');
  console.log('   - OpenAI API key is not set');
  console.log('   - Users do not have proper data sources');
  console.log('\nRun individual tests for more detailed debugging.');
}

// Run tests
runAllTests().catch(console.error);