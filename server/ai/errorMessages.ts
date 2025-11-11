import { logger } from "../utils/logger";

export interface ErrorContext {
  type: 'sql_error' | 'no_data' | 'validation_error' | 'missing_columns' | 'data_quality' | 'tier_limit' | 'rate_limit';
  details?: any;
  suggestion?: string;
}

/**
 * Generates transparent, helpful error messages for users
 * Focus: Inform users of issues, proceed where possible, suggest actionable fixes
 */
export function generateUserFriendlyError(context: ErrorContext): string {
  logger.info('Generating user-friendly error message', { type: context.type });

  switch (context.type) {
    case 'sql_error':
      return handleSQLError(context);
    
    case 'no_data':
      return handleNoDataError(context);
    
    case 'validation_error':
      return handleValidationError(context);
    
    case 'missing_columns':
      return handleMissingColumnsError(context);
    
    case 'data_quality':
      return handleDataQualityError(context);
    
    case 'tier_limit':
      return handleTierLimitError(context);
    
    case 'rate_limit':
      return handleRateLimitError(context);
    
    default:
      return "I encountered an issue processing your request. Could you try rephrasing your question?";
  }
}

function handleSQLError(context: ErrorContext): string {
  const error = context.details?.error || '';
  
  // Check for common SQL errors and provide helpful guidance
  if (error.includes('syntax')) {
    return "I had trouble understanding the structure of your data query. Could you rephrase your question in simpler terms? For example, instead of asking about complex calculations, try asking about specific metrics one at a time.";
  }
  
  if (error.includes('column') || error.includes('field')) {
    return "I couldn't find one of the data fields needed for your question. Could you check that your data source includes the information you're asking about? You can also try asking about different fields that might be available.";
  }
  
  if (error.includes('timeout') || error.includes('time')) {
    return "Your query is taking longer than expected. This usually happens with very large datasets or complex calculations. Try asking a simpler question, or if you need this analysis, consider upgrading your plan for faster processing.";
  }
  
  return `I encountered a technical issue: ${error}. ${context.suggestion || "Please try rephrasing your question or contact support if this persists."}`;
}

function handleNoDataError(context: ErrorContext): string {
  const hasDataSource = context.details?.hasDataSource;
  
  if (!hasDataSource) {
    return "I don't see any data connected to your account yet. To get insights, you'll need to upload a file (CSV or Excel) or connect a data source like Google Sheets or your database. You can do this from the Data Sources page.";
  }
  
  return "Your data source appears to be empty or I couldn't access it. Please check that your uploaded file has data, or if you're using a live connection, verify it's still active. You may need to re-upload your file or reconnect your data source.";
}

function handleValidationError(context: ErrorContext): string {
  const validationErrors = context.details?.errors || [];
  
  if (validationErrors.length > 0) {
    const firstError = validationErrors[0];
    
    if (firstError.includes('Forbidden operation')) {
      return "For security, I can only read your data, not modify it. Your question seems to require making changes to your data. If you need to update your data, please do so in the original file or database, then refresh your connection here.";
    }
    
    if (firstError.includes('JOIN')) {
      return "Your question requires combining data from multiple sources, which isn't available in your current plan. You can either simplify your question to focus on one dataset, or upgrade to Professional or Enterprise for multi-source analysis.";
    }
  }
  
  return "I couldn't process your request due to security or plan restrictions. Please try a simpler question, or upgrade your plan for advanced features.";
}

function handleMissingColumnsError(context: ErrorContext): string {
  const missingColumns = context.details?.missingColumns || [];
  const availableColumns = context.details?.availableColumns || [];
  
  let message = `I couldn't find the following information in your data: ${missingColumns.join(', ')}.`;
  
  if (availableColumns.length > 0) {
    message += ` Your data currently includes: ${availableColumns.slice(0, 10).join(', ')}${availableColumns.length > 10 ? '...' : ''}.`;
  }
  
  message += ` To get insights about ${missingColumns.join(' or ')}, you'll need to update your data source to include this information. You can upload a new file with these fields or modify your existing data.`;
  
  return message;
}

function handleDataQualityError(context: ErrorContext): string {
  const qualityIssue = context.details?.issue || 'data quality issues';
  const percentage = context.details?.percentage || 0;
  const affectedCount = context.details?.affectedCount || 0;
  const totalCount = context.details?.totalCount || 0;
  
  let message = `I found ${qualityIssue} in your data`;
  
  if (percentage > 0) {
    message += ` (${Math.round(percentage)}% of records affected)`;
  } else if (affectedCount > 0) {
    message += ` (${affectedCount} of ${totalCount} records)`;
  }
  
  message += '. ';
  
  if (percentage > 50) {
    message += "This is a significant data quality issue that may make results unreliable. I recommend reviewing and cleaning your data source before proceeding with analysis. ";
  } else if (percentage > 20) {
    message += "Results may not reflect the full picture due to missing or invalid data. ";
  }
  
  message += "Would you like me to proceed with the available data, or would you prefer to update your data source first?";
  
  return message;
}

function handleTierLimitError(context: ErrorContext): string {
  const limit = context.details?.limit || 100;
  const tier = context.details?.tier || 'current plan';
  
  return `Your ${tier} allows analyzing up to ${limit} rows at a time. Your query would return more data than this limit. To analyze larger datasets, consider upgrading to a higher plan. You can also try filtering your data to a smaller date range or specific category to stay within the limit.`;
}

function handleRateLimitError(context: ErrorContext): string {
  const waitTime = context.details?.waitTime || 'a few moments';
  const limit = context.details?.limit;
  
  let message = `You've reached your query limit for now. `;
  
  if (limit) {
    message += `Your plan allows ${limit} queries per hour. `;
  }
  
  message += `Please wait ${waitTime} before asking another question`;
  
  if (context.details?.tier === 'starter') {
    message += ", or upgrade to Professional or Enterprise for higher limits";
  }
  
  message += ".";
  
  return message;
}

/**
 * Suggests actionable next steps based on error type
 */
export function suggestNextSteps(context: ErrorContext): string[] {
  const suggestions: string[] = [];
  
  switch (context.type) {
    case 'no_data':
      suggestions.push("Upload a CSV or Excel file from the Data Sources page");
      suggestions.push("Connect Google Sheets or your database");
      break;
    
    case 'missing_columns':
      suggestions.push("Update your data file to include the missing fields");
      suggestions.push("Try asking about information that exists in your current data");
      break;
    
    case 'data_quality':
      const percentage = context.details?.percentage || 0;
      if (percentage > 20) {
        suggestions.push("Review and clean your data source");
        suggestions.push("Re-upload a corrected version of your data");
      }
      suggestions.push("Proceed with analysis using available data");
      break;
    
    case 'tier_limit':
      suggestions.push("Upgrade to a higher plan for larger datasets");
      suggestions.push("Filter your query to a smaller time period or category");
      break;
    
    case 'rate_limit':
      suggestions.push("Wait a moment before trying again");
      if (context.details?.tier === 'starter') {
        suggestions.push("Upgrade for higher query limits");
      }
      break;
  }
  
  return suggestions;
}
