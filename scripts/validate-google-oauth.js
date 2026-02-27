#!/usr/bin/env node
/**
 * Google OAuth Validation Script
 * Validates Google OAuth configuration for Google Sheets
 */

const required = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
};

const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
  `${process.env.APP_URL || 'https://askeuno.com'}/api/oauth/callback/google-sheets`;

const expectedRedirectUri = 'https://askeuno.com/api/oauth/callback/google-sheets';

console.log('\n📊 Google OAuth Configuration Validation\n');
console.log('='.repeat(60));

let allValid = true;

// Check GOOGLE_CLIENT_ID
if (!required.GOOGLE_CLIENT_ID) {
  console.log('⚠️  GOOGLE_CLIENT_ID: Not set (optional if not using Google Sheets)');
} else {
  const isValid = required.GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com') || 
                  required.GOOGLE_CLIENT_ID.length > 20;
  if (isValid) {
    console.log('✅ GOOGLE_CLIENT_ID: Valid');
    console.log(`   Value: ${required.GOOGLE_CLIENT_ID.substring(0, 30)}...`);
  } else {
    console.log('⚠️  GOOGLE_CLIENT_ID: Format may be invalid');
    console.log('   Expected: *.apps.googleusercontent.com or long string');
    allValid = false;
  }
}

// Check GOOGLE_CLIENT_SECRET
if (!required.GOOGLE_CLIENT_SECRET) {
  console.log('⚠️  GOOGLE_CLIENT_SECRET: Not set (optional if not using Google Sheets)');
} else {
  if (required.GOOGLE_CLIENT_SECRET.length > 10) {
    console.log('✅ GOOGLE_CLIENT_SECRET: Valid');
    console.log(`   Value: ${required.GOOGLE_CLIENT_SECRET.substring(0, 10)}...`);
  } else {
    console.log('❌ GOOGLE_CLIENT_SECRET: Too short');
    allValid = false;
  }
}

// Check redirect URI
console.log('\n🔗 Redirect URI Configuration:');
console.log(`   Current: ${redirectUri}`);
console.log(`   Expected: ${expectedRedirectUri}`);

if (redirectUri === expectedRedirectUri) {
  console.log('   ✅ Redirect URI matches production');
} else {
  console.log('   ⚠️  Redirect URI does not match production');
  console.log('   Make sure to add this URI in Google Cloud Console');
}

// Required scopes
console.log('\n📋 Required OAuth Scopes:');
console.log('   - https://www.googleapis.com/auth/spreadsheets.readonly');
console.log('   - https://www.googleapis.com/auth/drive.readonly');
console.log('   - https://www.googleapis.com/auth/userinfo.email');

// Summary
console.log('\n' + '='.repeat(60));
if (!required.GOOGLE_CLIENT_ID || !required.GOOGLE_CLIENT_SECRET) {
  console.log('\nℹ️  Google OAuth not configured (optional if not using Google Sheets)\n');
  console.log('💡 To enable Google Sheets integration:');
  console.log('   1. Go to: https://console.cloud.google.com/apis/credentials');
  console.log('   2. Create OAuth 2.0 Client ID');
  console.log('   3. Add redirect URI: ' + expectedRedirectUri);
  console.log('   4. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET\n');
  process.exit(0);
} else if (allValid) {
  console.log('\n✅ Google OAuth configuration is valid!\n');
  console.log('📝 Next Steps:');
  console.log('   1. Verify redirect URI in Google Cloud Console:');
  console.log(`      ${expectedRedirectUri}`);
  console.log('   2. Test Google Sheets connection\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Google OAuth configuration has warnings\n');
  process.exit(0);
}
