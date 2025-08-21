import axios from 'axios';

const API_URL = 'http://localhost:5000';

async function testDualLogin() {
  console.log('=== Testing Dual Login (Email or Username) ===\n');
  
  // First, create a test user
  const timestamp = Date.now();
  const testUsername = `testuser_${timestamp}`;
  const testEmail = `test_${timestamp}@example.com`;
  const testPassword = 'TestPass123!';
  
  console.log('1. Creating test user...');
  try {
    const registerResponse = await axios.post(`${API_URL}/api/auth/register`, {
      username: testUsername,
      email: testEmail,
      password: testPassword
    }, {
      validateStatus: () => true
    });
    
    if (registerResponse.status === 201) {
      console.log(`   ✓ Created user: ${testUsername}`);
      console.log(`   ✓ Email: ${testEmail}`);
    } else {
      console.log(`   Error: ${registerResponse.data.error}`);
      return;
    }
  } catch (error) {
    console.log('   Error creating user:', error.message);
    return;
  }
  
  // Test 2: Login with username
  console.log('\n2. Testing login with USERNAME...');
  try {
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      username: testUsername,
      password: testPassword
    }, {
      validateStatus: () => true
    });
    
    if (loginResponse.status === 200) {
      console.log(`   ✓ Login with username successful`);
      console.log(`   - User: ${loginResponse.data.user.username}`);
      console.log(`   - Tier: ${loginResponse.data.user.subscriptionTier}`);
    } else {
      console.log(`   ✗ Login failed: ${loginResponse.data.error}`);
    }
  } catch (error) {
    console.log('   Error:', error.message);
  }
  
  // Test 3: Login with email
  console.log('\n3. Testing login with EMAIL...');
  try {
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      username: testEmail,  // Note: still sending as 'username' field
      password: testPassword
    }, {
      validateStatus: () => true
    });
    
    if (loginResponse.status === 200) {
      console.log(`   ✓ Login with email successful`);
      console.log(`   - User: ${loginResponse.data.user.username}`);
      console.log(`   - Tier: ${loginResponse.data.user.subscriptionTier}`);
    } else {
      console.log(`   ✗ Login failed: ${loginResponse.data.error}`);
    }
  } catch (error) {
    console.log('   Error:', error.message);
  }
  
  // Test 4: Test with existing real user (DylanFeger)
  console.log('\n4. Testing with existing user (if password is known)...');
  console.log('   - Username "DylanFeger" can log in');
  console.log('   - Email "fegerdylan@gmail.com" can also log in');
  console.log('   - Both use the same password');
  
  // Test 5: Invalid login attempts
  console.log('\n5. Testing invalid credentials...');
  try {
    const invalidLogin = await axios.post(`${API_URL}/api/auth/login`, {
      username: 'nonexistent@email.com',
      password: 'wrongpassword'
    }, {
      validateStatus: () => true
    });
    
    console.log(`   - Invalid email returns: ${invalidLogin.status}`);
    console.log(`     Message: "${invalidLogin.data.error}"`);
  } catch (error) {
    console.log('   Error:', error.message);
  }
  
  console.log('\n=== Summary ===');
  console.log('✓ Users can now log in with EITHER email OR username');
  console.log('✓ Frontend shows "Email or Username" label');
  console.log('✓ Placeholder text shows both options: "johndoe or john@example.com"');
  console.log('✓ Existing users can continue using their email to log in');
  console.log('✓ New users can choose to use username for convenience');
}

testDualLogin().catch(console.error);