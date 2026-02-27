#!/usr/bin/env node
/**
 * Stripe Configuration Validation Script
 * Validates Stripe payment configuration
 */

console.log('\n💳 Stripe Configuration Validation\n');
console.log('='.repeat(60));

const config = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  VITE_STRIPE_PUBLIC_KEY: process.env.VITE_STRIPE_PUBLIC_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_PROFESSIONAL_MONTHLY: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
  STRIPE_PRICE_PROFESSIONAL_ANNUAL: process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL,
  STRIPE_PRICE_ENTERPRISE_MONTHLY: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
  STRIPE_PRICE_ENTERPRISE_ANNUAL: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL
};

let hasErrors = false;
let hasWarnings = false;

// Check STRIPE_SECRET_KEY
if (!config.STRIPE_SECRET_KEY) {
  console.log('⚠️  STRIPE_SECRET_KEY: Not set (optional if not using payments)');
  hasWarnings = true;
} else {
  const isValid = config.STRIPE_SECRET_KEY.startsWith('sk_live_') || 
                  config.STRIPE_SECRET_KEY.startsWith('sk_test_');
  if (isValid) {
    console.log('✅ STRIPE_SECRET_KEY: Valid');
    const isLive = config.STRIPE_SECRET_KEY.startsWith('sk_live_');
    console.log(`   Type: ${isLive ? 'LIVE (Production)' : 'TEST'}`);
    if (!isLive) {
      console.log('   ⚠️  Using test key - switch to live key for production');
      hasWarnings = true;
    }
  } else {
    console.log('❌ STRIPE_SECRET_KEY: Invalid format');
    console.log('   Must start with "sk_live_" or "sk_test_"');
    hasErrors = true;
  }
}

// Check VITE_STRIPE_PUBLIC_KEY
if (!config.VITE_STRIPE_PUBLIC_KEY) {
  console.log('⚠️  VITE_STRIPE_PUBLIC_KEY: Not set (optional if not using payments)');
  hasWarnings = true;
} else {
  const isValid = config.VITE_STRIPE_PUBLIC_KEY.startsWith('pk_live_') || 
                  config.VITE_STRIPE_PUBLIC_KEY.startsWith('pk_test_');
  if (isValid) {
    console.log('✅ VITE_STRIPE_PUBLIC_KEY: Valid');
    const isLive = config.VITE_STRIPE_PUBLIC_KEY.startsWith('pk_live_');
    console.log(`   Type: ${isLive ? 'LIVE (Production)' : 'TEST'}`);
  } else {
    console.log('❌ VITE_STRIPE_PUBLIC_KEY: Invalid format');
    console.log('   Must start with "pk_live_" or "pk_test_"');
    hasErrors = true;
  }
}

// Check STRIPE_WEBHOOK_SECRET
if (!config.STRIPE_WEBHOOK_SECRET) {
  console.log('⚠️  STRIPE_WEBHOOK_SECRET: Not set (required for webhooks)');
  hasWarnings = true;
} else {
  const isValid = config.STRIPE_WEBHOOK_SECRET.startsWith('whsec_');
  if (isValid) {
    console.log('✅ STRIPE_WEBHOOK_SECRET: Valid');
  } else {
    console.log('❌ STRIPE_WEBHOOK_SECRET: Invalid format');
    console.log('   Must start with "whsec_"');
    hasErrors = true;
  }
}

// Check Price IDs (if using subscriptions)
console.log('\n📋 Subscription Price IDs:');
const priceIds = {
  'Professional Monthly': config.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
  'Professional Annual': config.STRIPE_PRICE_PROFESSIONAL_ANNUAL,
  'Enterprise Monthly': config.STRIPE_PRICE_ENTERPRISE_MONTHLY,
  'Enterprise Annual': config.STRIPE_PRICE_ENTERPRISE_ANNUAL
};

for (const [name, priceId] of Object.entries(priceIds)) {
  if (!priceId) {
    console.log(`   ⚠️  ${name}: Not set (optional)`);
  } else {
    console.log(`   ✅ ${name}: ${priceId}`);
  }
}

// OAuth Redirect URI
console.log('\n🔗 OAuth Redirect URI:');
const redirectUri = `${process.env.APP_URL || 'https://askeuno.com'}/api/auth/stripe/callback`;
console.log(`   ${redirectUri}`);
console.log('   Configure this in Stripe Connect settings if using Stripe Connect');

// Summary
console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.log('\n❌ Stripe configuration has errors\n');
  process.exit(1);
} else if (hasWarnings && config.STRIPE_SECRET_KEY) {
  console.log('\n⚠️  Stripe configuration has warnings (see above)\n');
  process.exit(0);
} else if (!config.STRIPE_SECRET_KEY) {
  console.log('\nℹ️  Stripe not configured (optional if not using payments)\n');
  process.exit(0);
} else {
  console.log('\n✅ Stripe configuration is valid!\n');
  console.log('📝 Next Steps:');
  console.log('   1. Verify webhook endpoint: https://askeuno.com/api/subscription/webhook');
  console.log('   2. Test payment flow end-to-end\n');
  process.exit(0);
}
