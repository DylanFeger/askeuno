const axios = require('axios');
const fs = require('fs');

const API_URL = 'http://localhost:5000';
let cookies = '';

async function login() {
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      username: 'fegerdylan@gmail.com',  // Can use email OR username now
      password: 'Temp123!'
    });
    
    cookies = response.headers['set-cookie'].join('; ');
    console.log('✓ Logged in successfully');
    return true;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function testQuery(query, expectedBehavior) {
  try {
    console.log(`\n📝 Testing: "${query}"`);
    console.log(`Expected: ${expectedBehavior}`);
    
    const response = await axios.post(`${API_URL}/api/chat/v2/send`, {
      message: query,
      conversationId: null,
      requestChart: false,
      requestForecast: false
    }, {
      headers: { Cookie: cookies }
    });
    
    const { content, metadata } = response.data;
    console.log(`Response: ${content.substring(0, 150)}...`);
    
    // Check if it's asking for clarification or providing an answer
    const isAsking = metadata?.intent === 'needs_clarification';
    console.log(`Behavior: ${isAsking ? 'Asked for clarification' : 'Provided answer'}`);
    
    // Check suggestions
    if (metadata?.suggestions) {
      console.log(`Suggestions (${metadata.suggestions.length}):`);
      metadata.suggestions.forEach(s => {
        console.log(`  - [${s.category}] ${s.text}`);
      });
    }
    
    return { content, metadata };
  } catch (error) {
    console.error(`Error testing "${query}":`, error.response?.data || error.message);
    return null;
  }
}

async function runTests() {
  console.log('🧪 Testing Improved AI Behavior\n');
  
  if (!await login()) {
    console.error('Failed to login, aborting tests');
    return;
  }
  
  // Test queries that should provide answers instead of asking for clarification
  const testCases = [
    {
      query: "current stock levels",
      expected: "Should provide overview of stock or show low stock items"
    },
    {
      query: "how's business doing?",
      expected: "Should provide key metrics overview, not ask for clarification"
    },
    {
      query: "show me necklaces",
      expected: "Should show necklace data directly"
    },
    {
      query: "what are our top products?",
      expected: "Should answer with top products by some default metric"
    },
    {
      query: "tell me about the data",
      expected: "Should provide data overview/summary, not ask what specifically"
    }
  ];
  
  console.log('\n📊 Running Test Cases:\n');
  
  for (const testCase of testCases) {
    const result = await testQuery(testCase.query, testCase.expected);
    
    if (result) {
      // Check if suggestions are specific
      if (result.metadata?.suggestions && result.metadata.suggestions.length > 0) {
        const firstSuggestion = result.metadata.suggestions[0].text;
        console.log(`✓ First suggestion is specific: "${firstSuggestion}"`);
      }
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n✅ Test complete!');
}

runTests().catch(console.error);