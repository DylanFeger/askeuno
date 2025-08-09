// Simple test script to verify the /api/health endpoint
import fetch from 'node-fetch';

async function testHealthEndpoint() {
  try {
    const response = await fetch('http://localhost:5000/api/health');
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.status === 200 && data.ok === true) {
      console.log('✅ Health check passed!');
    } else {
      console.log('❌ Health check failed!');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testHealthEndpoint();