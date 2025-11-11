import { logger } from "../utils/logger";

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Validates AI responses to prevent hallucinations
 * Checks:
 * 1. Numbers mentioned exist in query results
 * 2. Columns referenced actually exist in data
 * 3. Response is substantive, not suspiciously generic
 */
export function validateAIResponse(
  responseText: string,
  queryResult: { rows: any[]; rowCount: number; tables: string[] },
  userQuestion: string
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'high';

  if (!responseText || responseText.trim().length === 0) {
    errors.push('Response is empty');
    return { isValid: false, warnings, errors, confidence: 'low' };
  }

  // 1. Check for suspiciously short or generic responses
  const responseLength = responseText.trim().length;
  const wordCount = responseText.trim().split(/\s+/).length;

  // Flag generic filler phrases
  const genericPhrases = [
    "I don't have enough information",
    "I cannot determine",
    "I apologize",
    "I'm sorry",
    "I don't know",
    "no data available",
    "unable to answer"
  ];

  const hasGenericPhrase = genericPhrases.some(phrase => 
    responseText.toLowerCase().includes(phrase.toLowerCase())
  );

  if (wordCount < 5 && !hasGenericPhrase) {
    warnings.push('Response is very short - may lack substantive insight');
    confidence = 'medium';
  }

  if (hasGenericPhrase && wordCount < 20) {
    warnings.push('Response appears to be a generic non-answer');
    confidence = 'low';
  }

  // 2. Extract numbers from response
  const numbersInResponse = extractNumbers(responseText);
  
  if (numbersInResponse.length > 0 && queryResult.rows.length > 0) {
    // Validate that numbers mentioned exist in the actual data
    const numbersInData = extractAllNumbers(queryResult.rows);
    
    // Check if at least some of the mentioned numbers exist in the data
    const matchedNumbers = numbersInResponse.filter(respNum => 
      numbersInData.some(dataNum => Math.abs(dataNum - respNum) < 0.01) // Tolerance: 0.01 for floating point precision
    );

    const matchRate = numbersInResponse.length > 0 ? matchedNumbers.length / numbersInResponse.length : 0;
    
    // CRITICAL: Flag ANY unmatched numbers, including single hallucinated KPIs
    if (matchRate === 0 && numbersInResponse.length >= 1) {
      // Zero matches = all numbers are invented
      errors.push('Response mentions numbers not found in query results - possible hallucination');
      confidence = 'low';
    } else if (matchRate < 0.5 && numbersInResponse.length >= 2) {
      // Less than 50% match rate with multiple numbers = partial hallucination
      warnings.push('Response mentions several numbers not directly from data - verify accuracy');
      confidence = 'medium';
    } else if (matchRate < 1.0 && numbersInResponse.length === 1) {
      // Single number doesn't match = likely hallucination
      errors.push('Response mentions a number not found in query results');
      confidence = 'low';
    }

    logger.info('Number validation', {
      numbersInResponse: numbersInResponse.length,
      numbersInData: numbersInData.length,
      matchedNumbers: matchedNumbers.length,
      matchRate,
      tolerance: 0.01
    });
  }

  // 3. Check for column references that don't exist
  if (queryResult.rows.length > 0) {
    const actualColumns = new Set(Object.keys(queryResult.rows[0]));
    const columnReferences = extractColumnReferences(responseText);
    
    const invalidColumns = columnReferences.filter(col => {
      // Case-insensitive check and fuzzy matching for common variations
      const colLower = col.toLowerCase();
      return !Array.from(actualColumns).some(actualCol => 
        actualCol.toLowerCase() === colLower ||
        actualCol.toLowerCase().includes(colLower) ||
        colLower.includes(actualCol.toLowerCase())
      );
    });

    if (invalidColumns.length > 0) {
      warnings.push(`Response references potentially non-existent columns: ${invalidColumns.join(', ')}`);
      confidence = confidence === 'high' ? 'medium' : confidence;
    }
  }

  // 4. Check for data-question alignment
  if (queryResult.rowCount === 0 && !hasGenericPhrase) {
    // If there's no data but response provides specific insights, it's suspicious
    if (numbersInResponse.length > 0) {
      errors.push('Response provides specific numbers despite empty query results');
      confidence = 'low';
    }
  }

  const isValid = errors.length === 0;

  logger.info('Response validation complete', {
    isValid,
    warnings: warnings.length,
    errors: errors.length,
    confidence
  });

  return {
    isValid,
    warnings,
    errors,
    confidence
  };
}

/**
 * Extracts numeric values from text, including negative numbers
 */
function extractNumbers(text: string): number[] {
  // Match numbers including:
  // - Negative signs
  // - Decimals
  // - Percentages
  // - Currency with $ prefix
  // - Parentheses notation for negatives (accounting style)
  const patterns = [
    /-?\$?\d+(?:,\d{3})*(?:\.\d+)?%?/g,  // Standard numbers with optional negative, currency, percentage
    /\(\$?\d+(?:,\d{3})*(?:\.\d+)?\)/g   // Parentheses notation (accounting negative)
  ];
  
  const matches: string[] = [];
  patterns.forEach(pattern => {
    const found = text.match(pattern);
    if (found) matches.push(...found);
  });
  
  return matches
    .map(match => {
      // Handle parentheses notation as negative
      let cleaned = match;
      let isNegative = false;
      
      if (match.startsWith('(') && match.endsWith(')')) {
        cleaned = match.slice(1, -1);
        isNegative = true;
      }
      
      // Remove currency symbols, commas, percentages
      cleaned = cleaned.replace(/[$,%]/g, '').replace(/,/g, '');
      
      let num = parseFloat(cleaned);
      if (isNegative && num > 0) {
        num = -num;
      }
      
      return num;
    })
    .filter(num => !isNaN(num));
}

/**
 * Extracts all numeric values from query result rows
 */
function extractAllNumbers(rows: any[]): number[] {
  const numbers: number[] = [];
  
  for (const row of rows) {
    for (const key in row) {
      const value = row[key];
      if (typeof value === 'number') {
        numbers.push(value);
      } else if (typeof value === 'string') {
        // Try to parse numeric strings
        const parsed = parseFloat(value);
        if (!isNaN(parsed)) {
          numbers.push(parsed);
        }
      }
    }
  }
  
  return numbers;
}

/**
 * Extracts potential column name references from response text
 */
function extractColumnReferences(text: string): string[] {
  const references: string[] = [];
  
  // Look for quoted terms that might be column names
  const quotedPattern = /["']([^"']+)["']/g;
  let match;
  
  while ((match = quotedPattern.exec(text)) !== null) {
    references.push(match[1]);
  }
  
  // Look for common column-reference patterns like "the X column" or "field X"
  const columnPattern = /\b(?:column|field|metric|dimension)\s+["']?(\w+)["']?/gi;
  while ((match = columnPattern.exec(text)) !== null) {
    references.push(match[1]);
  }
  
  return references;
}

/**
 * Checks if response provides actionable business insights
 * Used to detect overly generic or unhelpful responses
 */
export function hasActionableInsights(responseText: string): boolean {
  // Indicators of actionable insights
  const actionIndicators = [
    /increase(?:d)?|decrease(?:d)?|grow(?:th)?|decline/i,
    /recommend|suggest|consider|should/i,
    /improve|optimize|focus on|prioritize/i,
    /opportunity|risk|concern|strength/i,
    /\d+%|\$\d+|top \d+|bottom \d+/i  // Specific metrics
  ];

  return actionIndicators.some(indicator => indicator.test(responseText));
}
