#!/usr/bin/env node
/**
 * Lightspeed OAuth Validation Script
 * Validates Lightspeed R-Series OAuth configuration
 */

const required = {
  LS_CLIENT_ID: process.env.LS_CLIENT_ID,
  LS_CLIENT_SECRET: process.env.LS_CLIENT_SECRET,
  LS_REDIRECT_URI: process.env.LS_REDIRECT_URI
};

const expectedRedirectUri = 'https://askeuno.com/api/oauth/callback/lightspeed';

console.log('\n🔍 Lightspeed OAuth Configuration Validation\n');
console.log('='.repeat(60));

let allValid = true;

// Check LS_CLIENT_ID
if (!required.LS_CLIENT_ID) {
  console.log('❌ LS_CLIENT_ID: MISSING');
  console.log('   Required: Lightspeed R-Series OAuth Client ID');
  allValid = false;
} else {
  console.log('✅ LS_CLIENT_ID: Set');
  console.log(`   Value: ${required.LS_CLIENT_ID.substring(0, 10)}...`);
}

// Check LS_CLIENT_SECRET
if (!required.LS_CLIENT_SECRET) {
  console.log('❌ LS_CLIENT_SECRET: MISSING');
  console.log('   Required: Lightspeed R-Series OAuth Client Secret');
  allValid = false;
} else {
  console.log('✅ LS_CLIENT_SECRET: Set');
  console.log(`   Value: ${required.LS_CLIENT_SECRET.substring(0, 10)}...`);
}

// Check LS_REDIRECT_URI
if (!required.LS_REDIRECT_URI) {
  console.log('❌ LS_REDIRECT_URI: MISSING');
  console.log(`   Required: ${expectedRedirectUri}`);
  allValid = false;
} else if (required.LS_REDIRECT_URI !== expectedRedirectUri) {
  console.log('⚠️  LS_REDIRECT_URI: MISMATCH');
  console.log(`   Current: ${required.LS_REDIRECT_URI}`);
  console.log(`   Expected: ${expectedRedirectUri}`);
  console.log('   ⚠️  Redirect URI must match exactly in Lightspeed Developer Portal');
  allValid = false;
} else {
  console.log('✅ LS_REDIRECT_URI: Valid');
  console.log(`   Value: ${required.LS_REDIRECT_URI}`);
}

// Optional variables
console.log('\n📋 Optional Configuration:');
const optional = {
  LS_AUTH_URL: process.env.LS_AUTH_URL || 'https://cloud.lightspeedapp.com/auth/oauth/authorize',
  LS_TOKEN_URL: process.env.LS_TOKEN_URL || 'https://cloud.lightspeedapp.com/auth/oauth/token',
  LS_API_BASE: process.env.LS_API_BASE || 'https://api.lightspeedapp.com/API'
};

console.log(`   LS_AUTH_URL: ${optional.LS_AUTH_URL}`);
console.log(`   LS_TOKEN_URL: ${optional.LS_TOKEN_URL}`);
console.log(`   LS_API_BASE: ${optional.LS_API_BASE}`);

// Summary
console.log('\n' + '='.repeat(60));
if (allValid) {
  console.log('\n✅ Lightspeed OAuth configuration is valid!\n');
  console.log('📝 Next Steps:');
  console.log('   1. Verify redirect URI in Lightspeed Developer Portal:');
  console.log(`      ${expectedRedirectUri}`);
  console.log('   2. Test OAuth flow: node scripts/test-lightspeed-oauth.mjs\n');
  process.exit(0);
} else {
  console.log('\n❌ Lightspeed OAuth configuration has errors\n');
  console.log('💡 Fix the errors above and run this script again\n');
  process.exit(1);
}
