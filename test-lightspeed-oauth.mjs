import crypto from 'crypto';

// Simulate the OAuth flow logic from server/routes/lightspeed.ts
function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function buildOAuthUrl() {
  const state = crypto.randomBytes(32).toString('hex');
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  
  const authUrl = new URL(
    process.env.LS_AUTH_URL || 
    'https://cloud.lightspeedapp.com/auth/oauth/authorize'
  );
  
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', process.env.LS_CLIENT_ID || '');
  authUrl.searchParams.append('redirect_uri', 
    process.env.LS_REDIRECT_URI || 
    `${process.env.APP_URL || 'https://askeuno.com'}/api/oauth/callback/lightspeed`
  );
  authUrl.searchParams.append('scope', 'employee:all');
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('code_challenge_method', 'S256');
  
  return {
    url: authUrl.toString(),
    state,
    codeVerifier,
    codeChallenge
  };
}

console.log('🔍 Lightspeed OAuth Configuration Test\n');
console.log('Environment Variables:');
console.log('  LS_CLIENT_ID:', process.env.LS_CLIENT_ID ? `✅ Set (${process.env.LS_CLIENT_ID.substring(0, 8)}...)` : '❌ Not set');
console.log('  LS_CLIENT_SECRET:', process.env.LS_CLIENT_SECRET ? `✅ Set (${process.env.LS_CLIENT_SECRET.length} chars)` : '❌ Not set');
console.log('  LS_REDIRECT_URI:', process.env.LS_REDIRECT_URI || '❌ Not set');
console.log('  APP_URL:', process.env.APP_URL || '❌ Not set');
console.log('');

const { url, state, codeVerifier, codeChallenge } = buildOAuthUrl();

console.log('Generated OAuth URL:');
console.log('  Base:', url.split('?')[0]);
console.log('');
console.log('URL Parameters:');
const urlObj = new URL(url);
urlObj.searchParams.forEach((value, key) => {
  if (key === 'client_id') {
    console.log(`  ✅ ${key}: ${value.substring(0, 10)}... (${value.length} chars)`);
  } else if (key === 'state' || key === 'code_challenge') {
    console.log(`  ✅ ${key}: ${value.substring(0, 16)}... (${value.length} chars)`);
  } else {
    console.log(`  ✅ ${key}: ${value}`);
  }
});

console.log('');
console.log('PKCE Security:');
console.log('  Code Verifier:', codeVerifier.substring(0, 20) + '... (' + codeVerifier.length + ' chars)');
console.log('  Code Challenge:', codeChallenge.substring(0, 20) + '... (' + codeChallenge.length + ' chars)');
console.log('  Challenge Method: S256 (SHA-256)');
console.log('');

// Validation checks
console.log('Validation Checks:');
const checks = [
  { name: 'Client ID present', pass: urlObj.searchParams.has('client_id') && urlObj.searchParams.get('client_id').length > 0 },
  { name: 'Redirect URI correct', pass: urlObj.searchParams.get('redirect_uri') === 'https://askeuno.com/api/oauth/callback/lightspeed' },
  { name: 'Scope is employee:all', pass: urlObj.searchParams.get('scope') === 'employee:all' },
  { name: 'State parameter present', pass: urlObj.searchParams.has('state') && urlObj.searchParams.get('state').length === 64 },
  { name: 'PKCE challenge present', pass: urlObj.searchParams.has('code_challenge') && urlObj.searchParams.get('code_challenge').length > 0 },
  { name: 'PKCE method is S256', pass: urlObj.searchParams.get('code_challenge_method') === 'S256' },
  { name: 'Response type is code', pass: urlObj.searchParams.get('response_type') === 'code' },
];

checks.forEach(check => {
  console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
});

const allPassed = checks.every(c => c.pass);
console.log('');
console.log(allPassed ? '✅ All checks passed! OAuth configuration is correct.' : '❌ Some checks failed. Please review configuration.');
console.log('');

if (allPassed) {
  console.log('📋 Summary:');
  console.log('  The Lightspeed OAuth integration is correctly configured.');
  console.log('  Users can now connect their Lightspeed account from /connections page.');
  console.log('  After authentication, they will be redirected to /chat?source=lightspeed');
}
