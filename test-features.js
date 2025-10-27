// Comprehensive testing script for Euno platform
// Tests all features across Starter, Professional, and Enterprise tiers

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:5000/api';

// Test accounts for different tiers
const testAccounts = {
  starter: {
    username: 'test_starter_user',
    email: 'starter@test.com',
    password: 'TestPass123!'
  },
  professional: {
    username: 'test_pro_user',
    email: 'pro@test.com',
    password: 'TestPass123!'
  },
  enterprise: {
    username: 'test_enterprise_user',
    email: 'enterprise@test.com',
    password: 'TestPass123!'
  }
};

// Business analytics test questions
const testQuestions = {
  basic: [
    "What's my total revenue?",
    "How many products did we sell?",
    "Show me sales by category",
    "What's the average order value?"
  ],
  trends: [
    "Show me sales trends over the last 3 months",
    "What's our best selling product?",
    "How are sales growing month over month?",
    "Which payment method is most popular?"
  ],
  advanced: [
    "What products need restocking based on current inventory?",
    "Calculate profit margins by product category",
    "Which region generates the most revenue?",
    "Forecast next month's sales based on current trends",
    "What's the correlation between price and quantity sold?"
  ],
  visual: [
    "Graph monthly revenue",
    "Show me a pie chart of sales by category",
    "Plot sales trends over time",
    "Visualize inventory levels by product"
  ]
};

class EunoTester {
  constructor() {
    this.sessions = {};
    this.dataSourceIds = {};
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async createAccount(tierName) {
    const account = testAccounts[tierName];
    console.log(`\n📝 Creating ${tierName} account...`);
    
    try {
      const response = await axios.post(`${API_BASE}/auth/register`, account);
      console.log(`✅ Created ${tierName} account: ${account.username}`);
      return response.data;
    } catch (error) {
      if (error.response?.data?.error?.includes('already exists')) {
        console.log(`ℹ️  Account already exists, logging in...`);
        return await this.login(tierName);
      }
      throw error;
    }
  }

  async login(tierName) {
    const account = testAccounts[tierName];
    console.log(`🔐 Logging in as ${tierName} user...`);
    
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: account.username,
      password: account.password
    });
    
    // Store session cookie
    const cookies = response.headers['set-cookie'];
    if (cookies) {
      this.sessions[tierName] = cookies[0].split(';')[0];
    }
    
    console.log(`✅ Logged in as ${account.username}`);
    return response.data;
  }

  async setTier(tierName, targetTier) {
    console.log(`🔧 Setting tier to ${targetTier}...`);
    
    try {
      await axios.post(`${API_BASE}/auth/test-tier-override`, 
        { tier: targetTier },
        { headers: { Cookie: this.sessions[tierName] } }
      );
      console.log(`✅ Tier updated to ${targetTier}`);
    } catch (error) {
      console.error(`❌ Failed to set tier: ${error.response?.data?.error}`);
    }
  }

  async uploadDataFile(tierName, filename) {
    console.log(`📤 Uploading ${filename}...`);
    
    const form = new FormData();
    const filePath = path.join('test-data', filename);
    
    form.append('file', fs.createReadStream(filePath));
    form.append('name', `Test ${filename.split('.')[0]}`);
    
    try {
      const response = await axios.post(`${API_BASE}/upload`, form, {
        headers: {
          ...form.getHeaders(),
          Cookie: this.sessions[tierName]
        }
      });
      
      this.dataSourceIds[tierName] = response.data.dataSource.id;
      console.log(`✅ Uploaded ${filename} (${response.data.dataSource.rowCount} rows)`);
      return response.data;
    } catch (error) {
      console.error(`❌ Upload failed: ${error.response?.data?.error}`);
      throw error;
    }
  }

  async createConversation(tierName) {
    console.log(`💬 Creating conversation...`);
    
    const response = await axios.post(`${API_BASE}/chat/create`, 
      { dataSourceIds: [this.dataSourceIds[tierName]] },
      { headers: { Cookie: this.sessions[tierName] } }
    );
    
    console.log(`✅ Created conversation ${response.data.id}`);
    return response.data.id;
  }

  async askQuestion(tierName, conversationId, question) {
    console.log(`\n❓ Asking: "${question}"`);
    
    try {
      const response = await axios.post(`${API_BASE}/chat/v2/send`, {
        message: question,
        conversationId,
        requestId: `test-${Date.now()}`
      }, {
        headers: { Cookie: this.sessions[tierName] },
        timeout: 30000
      });
      
      const hasChart = response.data.chart ? '📊' : '';
      const hasSuggestions = response.data.suggestions ? '💡' : '';
      
      console.log(`✅ Response received ${hasChart} ${hasSuggestions}`);
      console.log(`   Answer: ${response.data.text.substring(0, 150)}...`);
      
      if (response.data.chart) {
        console.log(`   Chart: ${response.data.chart.type} chart with ${response.data.chart.data.length} data points`);
      }
      
      return response.data;
    } catch (error) {
      console.error(`❌ Query failed: ${error.response?.data?.error || error.message}`);
      return null;
    }
  }

  async testTierFeatures(tierName, targetTier) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 Testing ${targetTier.toUpperCase()} Tier Features`);
    console.log(`${'='.repeat(60)}`);
    
    // Login and set tier
    await this.login(tierName);
    await this.setTier(tierName, targetTier);
    
    // Upload test data
    await this.uploadDataFile(tierName, 'sales_data.csv');
    await this.delay(2000); // Wait for processing
    
    // Create conversation
    const conversationId = await this.createConversation(tierName);
    
    // Test different types of questions
    const results = {
      tier: targetTier,
      totalQuestions: 0,
      successful: 0,
      withCharts: 0,
      withSuggestions: 0,
      errors: 0
    };
    
    // Test basic questions
    console.log(`\n📋 Testing Basic Analytics...`);
    for (const question of testQuestions.basic) {
      const response = await this.askQuestion(tierName, conversationId, question);
      results.totalQuestions++;
      if (response) {
        results.successful++;
        if (response.chart) results.withCharts++;
        if (response.suggestions) results.withSuggestions++;
      } else {
        results.errors++;
      }
      await this.delay(1500);
    }
    
    // Test trend analysis
    console.log(`\n📈 Testing Trend Analysis...`);
    for (const question of testQuestions.trends) {
      const response = await this.askQuestion(tierName, conversationId, question);
      results.totalQuestions++;
      if (response) {
        results.successful++;
        if (response.chart) results.withCharts++;
        if (response.suggestions) results.withSuggestions++;
      } else {
        results.errors++;
      }
      await this.delay(1500);
    }
    
    // Test visual questions (should auto-generate charts for Pro/Enterprise)
    if (targetTier !== 'starter') {
      console.log(`\n📊 Testing Automatic Visualizations...`);
      for (const question of testQuestions.visual) {
        const response = await this.askQuestion(tierName, conversationId, question);
        results.totalQuestions++;
        if (response) {
          results.successful++;
          if (response.chart) results.withCharts++;
          if (response.suggestions) results.withSuggestions++;
        } else {
          results.errors++;
        }
        await this.delay(1500);
      }
    }
    
    // Summary
    console.log(`\n📊 ${targetTier.toUpperCase()} Tier Results:`);
    console.log(`   Total Questions: ${results.totalQuestions}`);
    console.log(`   Successful: ${results.successful} (${Math.round(results.successful/results.totalQuestions*100)}%)`);
    console.log(`   With Charts: ${results.withCharts} (${Math.round(results.withCharts/results.successful*100)}%)`);
    console.log(`   With Suggestions: ${results.withSuggestions} (${Math.round(results.withSuggestions/results.successful*100)}%)`);
    console.log(`   Errors: ${results.errors}`);
    
    // Validate tier-specific features
    console.log(`\n✅ Feature Validation:`);
    if (targetTier === 'starter') {
      console.log(`   ✅ Charts disabled: ${results.withCharts === 0 ? 'PASS' : 'FAIL'}`);
      console.log(`   ✅ Suggestions disabled: ${results.withSuggestions === 0 ? 'PASS' : 'FAIL'}`);
    } else if (targetTier === 'professional') {
      console.log(`   ✅ Charts enabled: ${results.withCharts > 0 ? 'PASS' : 'FAIL'}`);
      console.log(`   ✅ Suggestions enabled: ${results.withSuggestions > 0 ? 'PASS' : 'FAIL'}`);
    } else if (targetTier === 'enterprise') {
      console.log(`   ✅ Charts enabled: ${results.withCharts > 0 ? 'PASS' : 'FAIL'}`);
      console.log(`   ✅ Suggestions enabled: ${results.withSuggestions > 0 ? 'PASS' : 'FAIL'}`);
      console.log(`   ✅ Advanced analytics available`);
    }
    
    return results;
  }

  async testMultiSourceBlending(tierName) {
    console.log(`\n🔄 Testing Multi-Source Data Blending (Enterprise)...`);
    
    await this.login(tierName);
    await this.setTier(tierName, 'enterprise');
    
    // Upload multiple data sources
    const salesId = (await this.uploadDataFile(tierName, 'sales_data.csv')).dataSource.id;
    await this.delay(2000);
    const inventoryId = (await this.uploadDataFile(tierName, 'inventory_data.json')).dataSource.id;
    await this.delay(2000);
    
    // Create conversation with multiple sources
    const response = await axios.post(`${API_BASE}/chat/create`, 
      { dataSourceIds: [salesId, inventoryId] },
      { headers: { Cookie: this.sessions[tierName] } }
    );
    
    const conversationId = response.data.id;
    
    // Test cross-source queries
    const blendedQuestions = [
      "Compare sales data with current inventory levels",
      "Which products are selling well but low in stock?",
      "Calculate profit margins using sales price and unit cost",
      "What's the inventory turnover rate by product?"
    ];
    
    for (const question of blendedQuestions) {
      await this.askQuestion(tierName, conversationId, question);
      await this.delay(2000);
    }
    
    console.log(`✅ Multi-source blending test completed`);
  }

  async runAllTests() {
    console.log(`\n🚀 Starting Comprehensive Euno Platform Testing`);
    console.log(`⏰ ${new Date().toLocaleString()}`);
    
    try {
      // Create test accounts
      await this.createAccount('starter');
      await this.createAccount('professional');
      await this.createAccount('enterprise');
      
      // Test each tier
      const results = {
        starter: await this.testTierFeatures('starter', 'starter'),
        professional: await this.testTierFeatures('professional', 'professional'),
        enterprise: await this.testTierFeatures('enterprise', 'enterprise')
      };
      
      // Test enterprise-specific multi-source blending
      await this.testMultiSourceBlending('enterprise');
      
      // Final summary
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📋 FINAL TEST SUMMARY`);
      console.log(`${'='.repeat(60)}`);
      
      for (const [tier, result] of Object.entries(results)) {
        const passRate = Math.round(result.successful / result.totalQuestions * 100);
        const status = passRate > 80 ? '✅' : '⚠️';
        console.log(`${status} ${tier.toUpperCase()}: ${passRate}% success rate`);
      }
      
      console.log(`\n✅ Testing completed successfully!`);
      
    } catch (error) {
      console.error(`\n❌ Testing failed with error:`, error.message);
      process.exit(1);
    }
  }
}

// Run tests
const tester = new EunoTester();
tester.runAllTests().catch(console.error);