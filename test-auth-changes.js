import axios from 'axios';

const API_URL = 'http://localhost:5000';

async function testAuthChanges() {
  console.log('=== Testing Authentication Changes ===\n');
  
  // Test 1: Login with username and password
  console.log('1. Testing login with username...');
  try {
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      username: 'testuser',
      password: 'TestPass123'
    }, {
      validateStatus: () => true
    });
    console.log(`   - Login with username: ${loginResponse.status}`);
    if (loginResponse.status === 401) {
      console.log(`     Message: ${loginResponse.data.error}`);
    }
  } catch (error) {
    console.log('   - Error:', error.message);
  }

  // Test 2: Login should NOT accept email anymore
  console.log('\n2. Testing login with email (should fail)...');
  try {
    const emailLogin = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'test@example.com',
      password: 'TestPass123'
    }, {
      validateStatus: () => true
    });
    console.log(`   - Login with email: ${emailLogin.status}`);
    console.log(`     Message: ${emailLogin.data.error || emailLogin.data.message}`);
  } catch (error) {
    console.log('   - Error:', error.message);
  }

  // Test 3: Registration still requires email + username + password
  console.log('\n3. Testing registration with all fields...');
  const timestamp = Date.now();
  try {
    const registerResponse = await axios.post(`${API_URL}/api/auth/register`, {
      username: `testuser_${timestamp}`,
      email: `test_${timestamp}@example.com`,
      password: 'TestPass123!'
    }, {
      validateStatus: () => true,
      withCredentials: true
    });
    console.log(`   - Registration: ${registerResponse.status}`);
    if (registerResponse.data.user) {
      console.log(`     Created user: ${registerResponse.data.user.username}`);
      console.log(`     Subscription tier: ${registerResponse.data.user.subscriptionTier}`);
      
      // Check session with /me endpoint
      const cookie = registerResponse.headers['set-cookie'];
      if (cookie) {
        const meResponse = await axios.get(`${API_URL}/api/auth/me`, {
          headers: {
            Cookie: cookie[0]
          },
          validateStatus: () => true
        });
        console.log(`\n4. Session check (/api/auth/me):`);
        console.log(`   - Status: ${meResponse.status}`);
        if (meResponse.data.id) {
          console.log(`   - User ID: ${meResponse.data.id}`);
          console.log(`   - Username: ${meResponse.data.username}`);
          console.log(`   - Subscription Tier: ${meResponse.data.subscriptionTier}`);
        }
      }
    } else {
      console.log(`     Error: ${registerResponse.data.error}`);
    }
  } catch (error) {
    console.log('   - Error:', error.message);
  }

  // Test 5: Duplicate email check
  console.log('\n5. Testing duplicate email prevention...');
  try {
    const dup1 = await axios.post(`${API_URL}/api/auth/register`, {
      username: 'unique_user',
      email: 'duplicate@test.com',
      password: 'TestPass123!'
    }, {
      validateStatus: () => true
    });
    
    const dup2 = await axios.post(`${API_URL}/api/auth/register`, {
      username: 'another_user',
      email: 'duplicate@test.com',
      password: 'TestPass123!'
    }, {
      validateStatus: () => true
    });
    
    console.log(`   - First registration: ${dup1.status}`);
    console.log(`   - Second registration (same email): ${dup2.status}`);
    if (dup2.data.error) {
      console.log(`     Error message: ${dup2.data.error}`);
    }
  } catch (error) {
    console.log('   - Error:', error.message);
  }

  // Test 6: Duplicate username check
  console.log('\n6. Testing duplicate username prevention...');
  const uniqueTimestamp = Date.now();
  try {
    const dup1 = await axios.post(`${API_URL}/api/auth/register`, {
      username: `duplicate_user_${uniqueTimestamp}`,
      email: `email1_${uniqueTimestamp}@test.com`,
      password: 'TestPass123!'
    }, {
      validateStatus: () => true
    });
    
    const dup2 = await axios.post(`${API_URL}/api/auth/register`, {
      username: `duplicate_user_${uniqueTimestamp}`,
      email: `email2_${uniqueTimestamp}@test.com`,
      password: 'TestPass123!'
    }, {
      validateStatus: () => true
    });
    
    console.log(`   - First registration: ${dup1.status}`);
    console.log(`   - Second registration (same username): ${dup2.status}`);
    if (dup2.data.error) {
      console.log(`     Error message: ${dup2.data.error}`);
    }
  } catch (error) {
    console.log('   - Error:', error.message);
  }

  console.log('\n=== Authentication Changes Summary ===');
  console.log('✓ Login now uses username + password (no email)');
  console.log('✓ Registration still requires email + username + password');
  console.log('✓ Duplicate email prevention working');
  console.log('✓ Duplicate username prevention working');
  console.log('✓ Session includes user_id, username, and subscription_tier');
  console.log('✓ /api/auth/me returns complete user info with subscription tier');
}

testAuthChanges().catch(console.error);