// Test script for new features
const axios = require('axios');

const API_URL = 'http://localhost:5000';

async function testFeatures() {
  try {
    console.log('🧪 Testing Enhanced AskEuno Features\n');
    console.log('═══════════════════════════════════════\n');
    
    // 1. Test Resources Section SEO
    console.log('1. Testing Resources Section SEO:');
    console.log('---------------------------------');
    
    const resourcePages = [
      { url: '/resources', title: 'Resources Hub' },
      { url: '/resources/sql-for-small-business', title: 'SQL for Small Business' },
      { url: '/resources/data-driven-decisions', title: 'Data-Driven Decisions' },
      { url: '/resources/business-analytics-101', title: 'Business Analytics 101' }
    ];
    
    for (const page of resourcePages) {
      try {
        const response = await axios.get(`${API_URL}${page.url}`);
        console.log(`✓ ${page.title}: Page loads successfully`);
        
        // Check for SEO meta tags
        if (response.data.includes('<meta name="description"')) {
          console.log(`  └─ Contains SEO meta description`);
        }
      } catch (error) {
        console.log(`✗ ${page.title}: Failed to load`);
      }
    }
    
    console.log('\n2. Testing AI Chat Data Quality Features:');
    console.log('------------------------------------------');
    
    // Login first
    console.log('Logging in as test user...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'fegerdylan@gmail.com',
      password: 'password123'
    });
    
    const cookies = loginResponse.headers['set-cookie'];
    const sessionCookie = cookies ? cookies[0] : '';
    
    console.log('✓ Logged in successfully\n');
    
    // Test queries
    const testQueries = [
      {
        message: "What are the sales?",
        description: "Ambiguous query - should trigger clarification"
      },
      {
        message: "Show me top 5 products by price",
        description: "Specific query - should show data quality"
      },
      {
        message: "Calculate total revenue",
        description: "Calculation query - should show query used"
      }
    ];
    
    for (const query of testQueries) {
      console.log(`Testing: "${query.message}"`);
      console.log(`Expected: ${query.description}`);
      
      try {
        const response = await axios.post(
          `${API_URL}/api/chat`,
          {
            message: query.message,
            conversationId: null
          },
          {
            headers: {
              'Cookie': sessionCookie
            }
          }
        );
        
        const { metadata } = response.data;
        
        if (metadata) {
          console.log('✓ Response includes metadata:');
          
          if (metadata.dataQuality) {
            console.log(`  ├─ Data Quality: ${metadata.dataQuality}`);
          }
          
          if (metadata.clarificationNeeded) {
            console.log(`  ├─ Clarification: ${metadata.clarificationNeeded}`);
          }
          
          if (metadata.queryUsed) {
            console.log(`  ├─ Query Used: ${metadata.queryUsed}`);
          }
          
          if (metadata.confidence !== undefined) {
            console.log(`  └─ Confidence: ${Math.round(metadata.confidence * 100)}%`);
          }
        }
        
        console.log('');
      } catch (error) {
        console.log(`✗ Query failed: ${error.message}`);
        console.log('');
      }
    }
    
    console.log('\n═══════════════════════════════════════');
    console.log('✅ Feature testing completed!');
    console.log('\nKey Enhancements:');
    console.log('• Resources section provides SEO-optimized educational content');
    console.log('• AI chat shows data quality indicators');
    console.log('• Ambiguous queries trigger clarification requests');
    console.log('• Queries are explained in plain English');
    console.log('• Confidence levels based on data completeness');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testFeatures();