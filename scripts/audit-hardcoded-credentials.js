#!/usr/bin/env node
/**
 * Security Audit Script - Hardcoded Credentials Scanner
 * Scans codebase for potential hardcoded credentials and secrets
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Patterns to detect potential hardcoded credentials
const credentialPatterns = [
  {
    name: 'API Keys',
    patterns: [
      /(?:api[_-]?key|apikey)\s*[:=]\s*['"](sk-[a-zA-Z0-9]{20,}|pk_[a-zA-Z0-9]{20,})['"]/i,
      /(?:api[_-]?key|apikey)\s*[:=]\s*['"][a-zA-Z0-9]{32,}['"]/i,
    ],
    severity: 'high'
  },
  {
    name: 'AWS Credentials',
    patterns: [
      /AWS[_-]?ACCESS[_-]?KEY[_-]?ID\s*[:=]\s*['"](AKIA[0-9A-Z]{16})['"]/i,
      /AWS[_-]?SECRET[_-]?ACCESS[_-]?KEY\s*[:=]\s*['"][a-zA-Z0-9/+=]{40,}['"]/i,
    ],
    severity: 'critical'
  },
  {
    name: 'Database URLs',
    patterns: [
      /(?:database[_-]?url|db[_-]?url|connection[_-]?string)\s*[:=]\s*['"](postgresql?|mysql|mongodb):\/\/[^'"]+['"]/i,
      /(?:postgresql?|mysql|mongodb):\/\/[^'"]+:[^'"]+@[^'"]+/i,
    ],
    severity: 'critical',
    excludeFiles: ['.env.example', '.env.production.template', 'env.example'] // Allow in templates
  },
  {
    name: 'OAuth Secrets',
    patterns: [
      /(?:client[_-]?secret|oauth[_-]?secret)\s*[:=]\s*['"][a-zA-Z0-9]{32,}['"]/i,
      /(?:LS[_-]?CLIENT[_-]?SECRET|GOOGLE[_-]?CLIENT[_-]?SECRET|STRIPE[_-]?SECRET)\s*[:=]\s*['"][a-zA-Z0-9]{32,}['"]/i,
    ],
    severity: 'critical'
  },
  {
    name: 'JWT/Token Secrets',
    patterns: [
      /(?:jwt[_-]?secret|token[_-]?secret|session[_-]?secret)\s*[:=]\s*['"][a-zA-Z0-9]{32,}['"]/i,
      /(?:ENCRYPTION[_-]?KEY|SESSION[_-]?SECRET)\s*[:=]\s*['"][a-zA-Z0-9]{32,}['"]/i,
    ],
    severity: 'high',
    excludeFiles: ['.env.example', '.env.production.template', 'env.example']
  },
  {
    name: 'Private Keys',
    patterns: [
      /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/i,
      /-----BEGIN\s+EC\s+PRIVATE\s+KEY-----/i,
    ],
    severity: 'critical'
  },
  {
    name: 'Passwords',
    patterns: [
      /(?:password|pwd|pass)\s*[:=]\s*['"][^'"]{8,}['"]/i,
      /(?:PGPASSWORD|MYSQL_PASSWORD|MONGODB_PASSWORD)\s*[:=]\s*['"][^'"]+['"]/i,
    ],
    severity: 'high',
    excludeFiles: ['.env.example', '.env.production.template', 'env.example']
  }
];

// Files and directories to exclude from scanning
const excludePaths = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '.env',
  '.env.local',
  '.env.production',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.DS_Store',
  'coverage',
  '.nyc_output',
  'scripts/validate-credentials.js',
  'scripts/audit-hardcoded-credentials.js',
  '.env.save'
];

// File extensions to scan
const scanExtensions = ['.js', '.ts', '.tsx', '.jsx', '.json', '.py', '.sh', '.md', '.txt'];

function shouldExcludeFile(filePath) {
  // Check if file is in exclude paths
  for (const exclude of excludePaths) {
    if (filePath.includes(exclude)) {
      return true;
    }
  }
  
  // Check file extension
  const ext = path.extname(filePath);
  return !scanExtensions.includes(ext);
}

function scanFile(filePath, content) {
  const findings = [];
  const lines = content.split('\n');

  for (const patternGroup of credentialPatterns) {
    // Check if file should be excluded for this pattern
    if (patternGroup.excludeFiles) {
      const fileName = path.basename(filePath);
      if (patternGroup.excludeFiles.some(ex => fileName.includes(ex))) {
        continue;
      }
    }

    for (const pattern of patternGroup.patterns) {
      lines.forEach((line, lineNumber) => {
        const matches = line.match(pattern);
        if (matches) {
          // Check if it's in a comment or documentation
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('//') || 
              trimmedLine.startsWith('#') || 
              trimmedLine.startsWith('*') ||
              trimmedLine.startsWith('<!--')) {
            return; // Skip comments
          }

          findings.push({
            file: filePath,
            line: lineNumber + 1,
            pattern: patternGroup.name,
            severity: patternGroup.severity,
            match: matches[0].substring(0, 100), // Truncate for display
            context: line.trim().substring(0, 150)
          });
        }
      });
    }
  }

  return findings;
}

function scanDirectory(dir, findings = []) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (shouldExcludeFile(fullPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        scanDirectory(fullPath, findings);
      } else if (entry.isFile()) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const fileFindings = scanFile(fullPath, content);
          findings.push(...fileFindings);
        } catch (error) {
          // Skip binary files or files that can't be read
        }
      }
    }
  } catch (error) {
    // Skip directories that can't be accessed
  }

  return findings;
}

function generateReport(findings) {
  console.log('\n🔒 Security Audit Report - Hardcoded Credentials\n');
  console.log('='.repeat(80));

  if (findings.length === 0) {
    console.log('\n✅ No hardcoded credentials detected!\n');
    return;
  }

  // Group by severity
  const bySeverity = {
    critical: [],
    high: [],
    medium: [],
    low: []
  };

  findings.forEach(finding => {
    bySeverity[finding.severity] = bySeverity[finding.severity] || [];
    bySeverity[finding.severity].push(finding);
  });

  // Print findings by severity
  for (const [severity, items] of Object.entries(bySeverity)) {
    if (items.length === 0) continue;

    const emoji = severity === 'critical' ? '🚨' : severity === 'high' ? '⚠️' : 'ℹ️';
    console.log(`\n${emoji} ${severity.toUpperCase()} SEVERITY (${items.length} findings)\n`);
    console.log('-'.repeat(80));

    items.forEach((finding, index) => {
      console.log(`\n${index + 1}. ${finding.pattern}`);
      console.log(`   File: ${finding.file}`);
      console.log(`   Line: ${finding.line}`);
      console.log(`   Context: ${finding.context}`);
      console.log(`   Match: ${finding.match.substring(0, 60)}...`);
    });
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 SUMMARY\n');
  console.log(`  🚨 Critical: ${bySeverity.critical.length}`);
  console.log(`  ⚠️  High: ${bySeverity.high.length}`);
  console.log(`  ℹ️  Medium: ${bySeverity.medium.length}`);
  console.log(`  📝 Low: ${bySeverity.low.length}`);
  console.log(`  📈 Total: ${findings.length}`);

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS\n');
  console.log('  1. Move all credentials to environment variables');
  console.log('  2. Never commit .env files to version control');
  console.log('  3. Use .env.example or .env.template for documentation');
  console.log('  4. Rotate any exposed credentials immediately');
  console.log('  5. Review findings marked as CRITICAL first\n');
}

// Main execution
if (require.main === module) {
  const rootDir = path.resolve(__dirname, '..');
  console.log(`\n🔍 Scanning directory: ${rootDir}\n`);

  const findings = scanDirectory(rootDir);
  generateReport(findings);

  // Exit with error code if critical findings
  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  process.exit(criticalCount > 0 ? 1 : 0);
}

module.exports = { scanDirectory, scanFile, credentialPatterns };
