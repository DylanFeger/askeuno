#!/usr/bin/env node
/**
 * OpenAI API Key Validation Script
 * Validates OpenAI API key configuration
 */

const apiKey = process.env.OPENAI_API_KEY;

console.log('\n🤖 OpenAI API Configuration Validation\n');
console.log('='.repeat(60));

if (!apiKey) {
  console.log('⚠️  OPENAI_API_KEY: Not set');
  console.log('   Status: Optional (but recommended for AI features)');
  console.log('\n💡 To enable AI features:');
  console.log('   1. Get API key from: https://platform.openai.com/api-keys');
  console.log('   2. Set OPENAI_API_KEY=sk-your-key in environment\n');
  process.exit(0);
}

// Validate format
const isValidFormat = apiKey.startsWith('sk-') && apiKey.length > 20;

if (!isValidFormat) {
  console.log('❌ OPENAI_API_KEY: Invalid format');
  console.log('   Current: ' + apiKey.substring(0, 10) + '...');
  console.log('   Expected: Must start with "sk-" and be at least 20 characters\n');
  process.exit(1);
}

console.log('✅ OPENAI_API_KEY: Valid');
console.log(`   Value: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
console.log(`   Length: ${apiKey.length} characters`);

// Check if it's a test key
if (apiKey.includes('test') || apiKey.includes('TEST')) {
  console.log('⚠️  Warning: This appears to be a test key');
  console.log('   Use production key (sk-...) for production deployment\n');
}

console.log('\n' + '='.repeat(60));
console.log('\n✅ OpenAI API key is configured correctly!\n');
process.exit(0);
