#!/usr/bin/env node
/**
 * Credential Validation Script
 * Validates all required credentials for Ask Euno MVP production deployment
 */

const requiredCredentials = {
  // Core Configuration
  core: {
    DATABASE_URL: {
      required: true,
      description: 'PostgreSQL database connection string',
      validate: (value) => value && value.startsWith('postgresql://'),
      error: 'Must be a valid PostgreSQL connection string (postgresql://...)'
    },
    SESSION_SECRET: {
      required: true,
      description: 'Session encryption secret',
      validate: (value) => value && value.length >= 32,
      error: 'Must be at least 32 characters long'
    },
    ENCRYPTION_KEY: {
      required: true,
      description: 'AES-256 encryption key (64 hex characters)',
      validate: (value) => value && value.length === 64 && /^[0-9a-fA-F]+$/.test(value),
      error: 'Must be exactly 64 hex characters (32 bytes for AES-256)'
    },
    APP_URL: {
      required: true,
      description: 'Production application URL',
      validate: (value) => value && (value.startsWith('https://') || value.startsWith('http://')),
      error: 'Must be a valid URL (https://askeuno.com)'
    }
  },

  // Lightspeed OAuth
  lightspeed: {
    LS_CLIENT_ID: {
      required: true,
      description: 'Lightspeed R-Series OAuth Client ID',
      validate: (value) => value && value.length > 0,
      error: 'Lightspeed Client ID is required'
    },
    LS_CLIENT_SECRET: {
      required: true,
      description: 'Lightspeed R-Series OAuth Client Secret',
      validate: (value) => value && value.length > 0,
      error: 'Lightspeed Client Secret is required'
    },
    LS_REDIRECT_URI: {
      required: true,
      description: 'Lightspeed OAuth redirect URI',
      validate: (value) => value && value === 'https://askeuno.com/api/oauth/callback/lightspeed',
      error: 'Must be exactly: https://askeuno.com/api/oauth/callback/lightspeed'
    }
  },

  // OpenAI
  openai: {
    OPENAI_API_KEY: {
      required: false, // Optional for MVP, but recommended
      description: 'OpenAI API key for AI features',
      validate: (value) => !value || (value.startsWith('sk-') && value.length > 20),
      error: 'Must start with "sk-" and be a valid OpenAI API key'
    }
  },

  // Stripe (if using payments)
  stripe: {
    STRIPE_SECRET_KEY: {
      required: false,
      description: 'Stripe secret key for payment processing',
      validate: (value) => !value || (value.startsWith('sk_live_') || value.startsWith('sk_test_')),
      error: 'Must start with "sk_live_" or "sk_test_"'
    },
    VITE_STRIPE_PUBLIC_KEY: {
      required: false,
      description: 'Stripe publishable key (for frontend)',
      validate: (value) => !value || (value.startsWith('pk_live_') || value.startsWith('pk_test_')),
      error: 'Must start with "pk_live_" or "pk_test_"'
    },
    STRIPE_WEBHOOK_SECRET: {
      required: false,
      description: 'Stripe webhook signing secret',
      validate: (value) => !value || value.startsWith('whsec_'),
      error: 'Must start with "whsec_"'
    }
  },

  // Google OAuth
  google: {
    GOOGLE_CLIENT_ID: {
      required: false,
      description: 'Google OAuth Client ID for Google Sheets',
      validate: (value) => !value || (value.includes('.apps.googleusercontent.com') || value.length > 20),
      error: 'Must be a valid Google OAuth Client ID'
    },
    GOOGLE_CLIENT_SECRET: {
      required: false,
      description: 'Google OAuth Client Secret',
      validate: (value) => !value || value.length > 10,
      error: 'Must be a valid Google OAuth Client Secret'
    },
    GOOGLE_REDIRECT_URI: {
      required: false,
      description: 'Google OAuth redirect URI',
      validate: (value) => !value || value === 'https://askeuno.com/api/oauth/callback/google-sheets',
      error: 'Should be: https://askeuno.com/api/oauth/callback/google-sheets'
    }
  },

  // AWS S3
  aws: {
    AWS_ACCESS_KEY_ID: {
      required: false, // May use S3_ACCESS_KEY_ID instead
      description: 'AWS Access Key ID for S3 storage',
      validate: (value) => !value || (value.startsWith('AKIA') && value.length === 20),
      error: 'Must be a valid AWS Access Key ID (starts with AKIA, 20 characters)'
    },
    AWS_SECRET_ACCESS_KEY: {
      required: false,
      description: 'AWS Secret Access Key',
      validate: (value) => !value || value.length >= 40,
      error: 'Must be at least 40 characters long'
    },
    AWS_REGION: {
      required: false,
      description: 'AWS region for S3',
      validate: (value) => !value || /^[a-z0-9-]+$/.test(value),
      error: 'Must be a valid AWS region (e.g., us-east-1)'
    },
    AWS_S3_BUCKET: {
      required: false,
      description: 'S3 bucket name for file storage',
      validate: (value) => !value || /^[a-z0-9.-]+$/.test(value),
      error: 'Must be a valid S3 bucket name'
    },
    // Alternative S3 variable names
    S3_ACCESS_KEY_ID: {
      required: false,
      description: 'S3 Access Key ID (alternative to AWS_ACCESS_KEY_ID)',
      validate: (value) => !value || (value.startsWith('AKIA') && value.length === 20),
      error: 'Must be a valid AWS Access Key ID'
    },
    S3_SECRET_ACCESS_KEY: {
      required: false,
      description: 'S3 Secret Access Key (alternative to AWS_SECRET_ACCESS_KEY)',
      validate: (value) => !value || value.length >= 40,
      error: 'Must be at least 40 characters long'
    },
    S3_REGION: {
      required: false,
      description: 'S3 region (alternative to AWS_REGION)',
      validate: (value) => !value || /^[a-z0-9-]+$/.test(value),
      error: 'Must be a valid AWS region'
    },
    S3_BUCKET: {
      required: false,
      description: 'S3 bucket name (alternative to AWS_S3_BUCKET)',
      validate: (value) => !value || /^[a-z0-9.-]+$/.test(value),
      error: 'Must be a valid S3 bucket name'
    }
  },

  // Error Monitoring
  sentry: {
    SENTRY_DSN: {
      required: false,
      description: 'Sentry DSN for error monitoring',
      validate: (value) => !value || value.startsWith('https://'),
      error: 'Must be a valid Sentry DSN URL'
    }
  }
};

function validateCredentials() {
  const results = {
    passed: [],
    failed: [],
    warnings: [],
    missing: []
  };

  console.log('\n🔐 Ask Euno MVP - Credential Validation\n');
  console.log('=' .repeat(60));

  // Check each credential category
  for (const [category, credentials] of Object.entries(requiredCredentials)) {
    console.log(`\n📦 ${category.toUpperCase()}`);
    console.log('-'.repeat(60));

    for (const [key, config] of Object.entries(credentials)) {
      const value = process.env[key];
      const isSet = value !== undefined && value !== '';

      if (!isSet) {
        if (config.required) {
          results.missing.push({ key, category, config });
          console.log(`  ❌ ${key}: MISSING (REQUIRED)`);
          console.log(`     ${config.description}`);
        } else {
          results.warnings.push({ key, category, config });
          console.log(`  ⚠️  ${key}: Not set (optional)`);
          console.log(`     ${config.description}`);
        }
        continue;
      }

      // Validate the value
      if (config.validate) {
        const isValid = config.validate(value);
        if (isValid) {
          results.passed.push({ key, category, config });
          console.log(`  ✅ ${key}: Valid`);
          // Don't show full value for security
          const masked = value.length > 20 ? value.substring(0, 10) + '...' + value.substring(value.length - 4) : '***';
          console.log(`     Value: ${masked}`);
        } else {
          results.failed.push({ key, category, config, value });
          console.log(`  ❌ ${key}: INVALID`);
          console.log(`     ${config.error}`);
        }
      } else {
        results.passed.push({ key, category, config });
        console.log(`  ✅ ${key}: Set`);
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 VALIDATION SUMMARY\n');
  console.log(`  ✅ Passed: ${results.passed.length}`);
  console.log(`  ❌ Failed: ${results.failed.length}`);
  console.log(`  ⚠️  Warnings: ${results.warnings.length}`);
  console.log(`  🚫 Missing (Required): ${results.missing.length}`);

  if (results.missing.length > 0) {
    console.log('\n❌ REQUIRED CREDENTIALS MISSING:');
    results.missing.forEach(({ key, config }) => {
      console.log(`   - ${key}: ${config.description}`);
    });
  }

  if (results.failed.length > 0) {
    console.log('\n❌ INVALID CREDENTIALS:');
    results.failed.forEach(({ key, config }) => {
      console.log(`   - ${key}: ${config.error}`);
    });
  }

  // Check OAuth redirect URIs
  console.log('\n🔗 OAUTH REDIRECT URI CHECK\n');
  const redirectUris = {
    'Lightspeed': process.env.LS_REDIRECT_URI,
    'Google Sheets': process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL || 'https://askeuno.com'}/api/oauth/callback/google-sheets`,
    'Stripe': `${process.env.APP_URL || 'https://askeuno.com'}/api/auth/stripe/callback`,
    'QuickBooks': `${process.env.APP_URL || 'https://askeuno.com'}/api/auth/quickbooks/callback`
  };

  const expectedUris = {
    'Lightspeed': 'https://askeuno.com/api/oauth/callback/lightspeed',
    'Google Sheets': 'https://askeuno.com/api/oauth/callback/google-sheets',
    'Stripe': 'https://askeuno.com/api/auth/stripe/callback',
    'QuickBooks': 'https://askeuno.com/api/auth/quickbooks/callback'
  };

  for (const [provider, uri] of Object.entries(redirectUris)) {
    const expected = expectedUris[provider];
    if (uri === expected) {
      console.log(`  ✅ ${provider}: ${uri}`);
    } else {
      console.log(`  ⚠️  ${provider}: ${uri || 'Not set'}`);
      console.log(`     Expected: ${expected}`);
    }
  }

  // Final status
  const hasErrors = results.missing.length > 0 || results.failed.length > 0;
  const exitCode = hasErrors ? 1 : 0;

  console.log('\n' + '='.repeat(60));
  if (exitCode === 0) {
    console.log('\n✅ All required credentials are valid!\n');
  } else {
    console.log('\n❌ Validation failed. Please fix the errors above.\n');
  }

  return exitCode;
}

// Run validation
if (require.main === module) {
  const exitCode = validateCredentials();
  process.exit(exitCode);
}

module.exports = { validateCredentials, requiredCredentials };
