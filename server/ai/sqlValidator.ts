import { logger } from "../utils/logger";

export interface SQLValidationResult {
  isValid: boolean;
  enhancedSQL: string;
  warnings: string[];
  errors: string[];
  estimatedCost: 'low' | 'medium' | 'high';
}

export interface SQLValidationOptions {
  maxLimit?: number;
  maxExecutionTimeMs?: number;
  allowJoins?: boolean;
  maxJoins?: number;
}

const DEFAULT_OPTIONS: SQLValidationOptions = {
  maxLimit: 5000,
  maxExecutionTimeMs: 30000, // 30 seconds
  allowJoins: true,
  maxJoins: 3
};

/**
 * Comprehensive SQL validation with security and performance checks
 */
export async function validateSQL(
  sql: string,
  options: SQLValidationOptions = DEFAULT_OPTIONS
): Promise<SQLValidationResult> {
  const warnings: string[] = [];
  const errors: string[] = [];
  let enhancedSQL = sql.trim();
  let estimatedCost: 'low' | 'medium' | 'high' = 'low';

  // 1. Check for forbidden operations (security)
  const forbiddenKeywords = [
    'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP',
    'ALTER', 'TRUNCATE', 'PRAGMA', 'GRANT', 'REVOKE',
    'EXEC', 'EXECUTE', 'CALL', 'RENAME', 'REPLACE'
  ];

  const upperSQL = sql.toUpperCase();
  for (const keyword of forbiddenKeywords) {
    if (upperSQL.includes(keyword)) {
      errors.push(`Forbidden operation detected: ${keyword}. Only SELECT queries are allowed.`);
      return {
        isValid: false,
        enhancedSQL: sql,
        warnings,
        errors,
        estimatedCost: 'low'
      };
    }
  }

  // 2. Ensure query has SELECT or WITH (valid read operations)
  if (!upperSQL.startsWith('SELECT') && !upperSQL.startsWith('WITH')) {
    errors.push('Query must start with SELECT or WITH for read-only operations.');
    return {
      isValid: false,
      enhancedSQL: sql,
      warnings,
      errors,
      estimatedCost: 'low'
    };
  }

  // 3. Check for LIMIT clause (prevent runaway queries)
  const limitMatch = upperSQL.match(/LIMIT\s+(\d+)/);
  if (!limitMatch) {
    // Add LIMIT if missing
    enhancedSQL += ` LIMIT ${options.maxLimit}`;
    warnings.push(`Added LIMIT ${options.maxLimit} for safety.`);
  } else {
    const requestedLimit = parseInt(limitMatch[1]);
    if (requestedLimit > (options.maxLimit || DEFAULT_OPTIONS.maxLimit!)) {
      // Reduce limit to safe maximum
      enhancedSQL = enhancedSQL.replace(
        /LIMIT\s+\d+/i,
        `LIMIT ${options.maxLimit}`
      );
      warnings.push(`Reduced LIMIT from ${requestedLimit} to ${options.maxLimit} (tier maximum).`);
    }
    if (requestedLimit > 1000) {
      estimatedCost = 'medium';
    }
  }

  // 4. Detect expensive JOIN operations
  const joinMatches = upperSQL.match(/\bJOIN\b/g);
  const joinCount = joinMatches ? joinMatches.length : 0;

  if (joinCount > 0) {
    if (!options.allowJoins) {
      errors.push('JOIN operations are not allowed in your tier.');
      return {
        isValid: false,
        enhancedSQL: sql,
        warnings,
        errors,
        estimatedCost: 'high'
      };
    }

    if (joinCount > (options.maxJoins || 3)) {
      errors.push(`Too many JOINs detected (${joinCount}). Maximum allowed: ${options.maxJoins}.`);
      return {
        isValid: false,
        enhancedSQL: sql,
        warnings,
        errors,
        estimatedCost: 'high'
      };
    }

    if (joinCount >= 2) {
      warnings.push(`Multiple JOINs detected (${joinCount}). Query may take longer.`);
      estimatedCost = joinCount >= 3 ? 'high' : 'medium';
    }
  }

  // 5. Check for wildcard SELECT * (performance warning)
  if (upperSQL.includes('SELECT *')) {
    warnings.push('Using SELECT * may return unnecessary data. Consider selecting specific columns.');
    if (estimatedCost === 'low') estimatedCost = 'medium';
  }

  // 6. Detect potential SQL injection patterns
  const injectionPatterns = [
    /;\s*--/,           // Comment-based injection
    /\/\*.*\*\//,       // Multi-line comment injection
    /;\s*DROP/i,        // Drop table attempts
    /;\s*DELETE/i,      // Delete attempts
    /UNION\s+SELECT/i,  // Union-based injection
    /'\s*OR\s+'1'\s*=\s*'1/i, // Classic OR injection
    /--\s*$/            // Trailing comment
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(sql)) {
      errors.push('Potential SQL injection pattern detected. Query blocked for security.');
      return {
        isValid: false,
        enhancedSQL: sql,
        warnings,
        errors,
        estimatedCost: 'low'
      };
    }
  }

  // 7. Check for subqueries (performance concern)
  const subqueryMatches = upperSQL.match(/SELECT.*FROM.*\(.*SELECT/g);
  if (subqueryMatches && subqueryMatches.length > 0) {
    warnings.push('Subqueries detected. Query may be slower.');
    if (estimatedCost === 'low') estimatedCost = 'medium';
  }

  // 8. Validate WHERE clause exists for filtering (best practice)
  if (!upperSQL.includes('WHERE') && !upperSQL.includes('LIMIT')) {
    warnings.push('No WHERE clause detected. Consider filtering data for better performance.');
  }

  // 9. Check for GROUP BY without aggregate functions
  if (upperSQL.includes('GROUP BY')) {
    const hasAggregates = /\b(COUNT|SUM|AVG|MAX|MIN|STRING_AGG|ARRAY_AGG)\(/i.test(upperSQL);
    if (!hasAggregates) {
      warnings.push('GROUP BY detected without aggregate functions. This may not produce expected results.');
    }
  }

  // 10. Log validation result
  logger.info('SQL validation complete', {
    isValid: errors.length === 0,
    warnings: warnings.length,
    errors: errors.length,
    estimatedCost,
    joinCount,
    hasLimit: !!limitMatch
  });

  return {
    isValid: errors.length === 0,
    enhancedSQL,
    warnings,
    errors,
    estimatedCost
  };
}

/**
 * Get tier-specific validation options
 */
export function getTierValidationOptions(tier: string): SQLValidationOptions {
  switch (tier) {
    case 'starter':
    case 'beginner':
      return {
        maxLimit: 100,
        maxExecutionTimeMs: 10000, // 10 seconds
        allowJoins: false,
        maxJoins: 0
      };

    case 'professional':
    case 'pro':
      return {
        maxLimit: 1000,
        maxExecutionTimeMs: 30000, // 30 seconds
        allowJoins: true,
        maxJoins: 2
      };

    case 'enterprise':
    case 'elite':
      return {
        maxLimit: 5000,
        maxExecutionTimeMs: 60000, // 60 seconds
        allowJoins: true,
        maxJoins: 5
      };

    default:
      return DEFAULT_OPTIONS;
  }
}
