/**
 * Advanced Analytics AI Agent
 * Uses multiple specialized models for optimal data analytics performance
 */

import OpenAI from "openai";
import { db } from "../db";
import { logger } from "../utils/logger";
import { dataSources, dataRows } from "@shared/schema";
import { eq } from "drizzle-orm";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ""
});

// Model selection based on task type
export enum AnalyticsTaskType {
  SQL_GENERATION = "sql_generation",
  DATA_ANALYSIS = "data_analysis", 
  TREND_PREDICTION = "trend_prediction",
  ANOMALY_DETECTION = "anomaly_detection",
  NATURAL_LANGUAGE = "natural_language"
}

// Model configurations for different tasks
const MODEL_CONFIGS = {
  [AnalyticsTaskType.SQL_GENERATION]: {
    model: "gpt-4-turbo-preview", // Best for SQL accuracy
    temperature: 0.1, // Very low for precise SQL
    maxTokens: 2000
  },
  [AnalyticsTaskType.DATA_ANALYSIS]: {
    model: "gpt-4o", // Balanced for analysis
    temperature: 0.3,
    maxTokens: 3000
  },
  [AnalyticsTaskType.TREND_PREDICTION]: {
    model: "gpt-4o", 
    temperature: 0.5, // Higher for creative predictions
    maxTokens: 2500
  },
  [AnalyticsTaskType.ANOMALY_DETECTION]: {
    model: "gpt-4-turbo-preview",
    temperature: 0.2,
    maxTokens: 2000
  },
  [AnalyticsTaskType.NATURAL_LANGUAGE]: {
    model: "gpt-4o",
    temperature: 0.4,
    maxTokens: 1500
  }
};

// Enhanced system prompts for each task type
const SYSTEM_PROMPTS = {
  [AnalyticsTaskType.SQL_GENERATION]: `You are an expert SQL engineer with 20+ years of experience.
Your role is to generate PERFECT, OPTIMIZED SQL queries that are:
1. Syntactically correct for the target database (PostgreSQL/MySQL)
2. Performance-optimized with proper indexes and joins
3. Safe from SQL injection (read-only operations only)
4. Include proper error handling comments

CRITICAL RULES:
- ONLY use SELECT, WITH, and read-only operations
- ALWAYS include LIMIT clause (max 5000 rows)
- ALWAYS validate column existence before using
- NEVER make assumptions about data types
- If a column is missing, comment: -- COLUMN_MISSING: column_name
- Include execution plan hints when dealing with large datasets

Output format:
\`\`\`sql
-- Query purpose: [brief description]
-- Expected runtime: [fast/medium/slow]
[Your SQL query here]
\`\`\``,

  [AnalyticsTaskType.DATA_ANALYSIS]: `You are a Senior Data Analyst with expertise in business intelligence.
Your analysis must be:
1. Data-driven - use ONLY the provided data
2. Accurate - double-check all calculations
3. Actionable - provide specific recommendations
4. Clear - explain complex findings simply

Analysis Framework:
- Start with key findings (1-2 sentences)
- Provide supporting data points
- Identify patterns and anomalies
- Suggest actionable next steps
- Confidence level: High/Medium/Low based on data completeness`,

  [AnalyticsTaskType.TREND_PREDICTION]: `You are a Data Scientist specializing in time-series analysis and forecasting.
Your predictions must:
1. Be based on historical patterns in the data
2. Account for seasonality and trends
3. Provide confidence intervals
4. Explain the methodology used

Include:
- Trend direction and strength
- Key inflection points
- Risk factors that could affect predictions
- Recommended monitoring metrics`,

  [AnalyticsTaskType.ANOMALY_DETECTION]: `You are an expert in statistical anomaly detection and data quality.
Your role is to:
1. Identify outliers and unusual patterns
2. Assess data quality issues (nulls, duplicates, inconsistencies)
3. Flag potential data integrity problems
4. Suggest data cleaning steps

Report format:
- Anomalies found: [list with severity]
- Data quality score: [0-100]
- Recommended actions: [specific steps]`,

  [AnalyticsTaskType.NATURAL_LANGUAGE]: `You are Euno AI, a friendly data assistant that helps businesses understand their data.
Guidelines:
- Use simple, everyday language
- Be concise but complete
- Focus on business impact
- Suggest relevant follow-up questions`
};

interface AnalyticsRequest {
  query: string;
  taskType?: AnalyticsTaskType;
  dataSourceId?: number;
  userId: number;
  schema?: any;
  sampleData?: any[];
  context?: string;
}

interface AnalyticsResponse {
  result: string;
  sql?: string;
  confidence: number;
  taskType: AnalyticsTaskType;
  executionTime: number;
  metadata?: {
    rowsAnalyzed?: number;
    dataQuality?: number;
    suggestions?: string[];
    visualization?: any;
  };
}

/**
 * Detect the type of analytics task from the query
 */
function detectTaskType(query: string): AnalyticsTaskType {
  const lowerQuery = query.toLowerCase();
  
  // SQL generation keywords
  if (lowerQuery.includes('sql') || 
      lowerQuery.includes('query') ||
      lowerQuery.includes('select') ||
      lowerQuery.includes('count') ||
      lowerQuery.includes('sum') ||
      lowerQuery.includes('average') ||
      lowerQuery.includes('group by')) {
    return AnalyticsTaskType.SQL_GENERATION;
  }
  
  // Prediction keywords
  if (lowerQuery.includes('predict') ||
      lowerQuery.includes('forecast') ||
      lowerQuery.includes('future') ||
      lowerQuery.includes('will') ||
      lowerQuery.includes('trend') ||
      lowerQuery.includes('projection')) {
    return AnalyticsTaskType.TREND_PREDICTION;
  }
  
  // Anomaly detection keywords
  if (lowerQuery.includes('anomal') ||
      lowerQuery.includes('outlier') ||
      lowerQuery.includes('unusual') ||
      lowerQuery.includes('strange') ||
      lowerQuery.includes('quality') ||
      lowerQuery.includes('issue')) {
    return AnalyticsTaskType.ANOMALY_DETECTION;
  }
  
  // Analysis keywords
  if (lowerQuery.includes('analyze') ||
      lowerQuery.includes('analysis') ||
      lowerQuery.includes('insight') ||
      lowerQuery.includes('pattern') ||
      lowerQuery.includes('compare')) {
    return AnalyticsTaskType.DATA_ANALYSIS;
  }
  
  // Default to natural language
  return AnalyticsTaskType.NATURAL_LANGUAGE;
}

/**
 * Validate and enhance SQL query
 */
async function validateSQL(sql: string, schema: any): Promise<{ valid: boolean; enhanced: string; issues: string[] }> {
  const issues: string[] = [];
  let enhanced = sql;
  
  // Check for forbidden operations
  const forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE'];
  for (const op of forbidden) {
    if (sql.toUpperCase().includes(op)) {
      issues.push(`Forbidden operation: ${op}`);
      return { valid: false, enhanced, issues };
    }
  }
  
  // Check for LIMIT clause
  if (!sql.toUpperCase().includes('LIMIT')) {
    enhanced += ' LIMIT 1000'; // Add default limit
    issues.push('Added LIMIT clause for safety');
  }
  
  // Validate column names against schema if provided
  if (schema) {
    const columnPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    const matches = sql.match(columnPattern) || [];
    const schemaColumns = Object.keys(schema).map(c => c.toLowerCase());
    
    for (const match of matches) {
      if (!schemaColumns.includes(match.toLowerCase()) && 
          !['select', 'from', 'where', 'and', 'or', 'limit', 'order', 'by', 'group', 'having', 'as', 'join', 'on', 'inner', 'left', 'right'].includes(match.toLowerCase())) {
        issues.push(`Possible unknown column: ${match}`);
      }
    }
  }
  
  return { 
    valid: issues.filter(i => i.includes('Forbidden')).length === 0, 
    enhanced, 
    issues 
  };
}

/**
 * Main analytics processing function
 */
export async function processAnalyticsQuery(request: AnalyticsRequest): Promise<AnalyticsResponse> {
  const startTime = Date.now();
  
  try {
    // Detect task type if not provided
    const taskType = request.taskType || detectTaskType(request.query);
    const config = MODEL_CONFIGS[taskType];
    const systemPrompt = SYSTEM_PROMPTS[taskType];
    
    logger.info('Processing analytics query', {
      taskType,
      model: config.model,
      userId: request.userId
    });
    
    // Build context from schema and data
    let context = request.context || '';
    if (request.schema) {
      context += `\nData Schema: ${JSON.stringify(request.schema, null, 2)}`;
    }
    if (request.sampleData && request.sampleData.length > 0) {
      context += `\nSample Data (first 5 rows): ${JSON.stringify(request.sampleData.slice(0, 5), null, 2)}`;
      context += `\nTotal rows available: ${request.sampleData.length}`;
    }
    
    // Prepare the prompt
    const userPrompt = `${request.query}\n\nContext:\n${context}`;
    
    // Call the appropriate model
    const completion = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      response_format: taskType === AnalyticsTaskType.SQL_GENERATION ? undefined : { type: "json_object" }
    });
    
    const response = completion.choices[0].message.content || '';
    
    // Process response based on task type
    let result: AnalyticsResponse = {
      result: response,
      taskType,
      confidence: 0.9, // Default high confidence
      executionTime: Date.now() - startTime,
      metadata: {}
    };
    
    // Special handling for SQL generation
    if (taskType === AnalyticsTaskType.SQL_GENERATION) {
      const sqlMatch = response.match(/```sql\n([\s\S]*?)```/);
      if (sqlMatch) {
        const sql = sqlMatch[1].replace(/^--.*$/gm, '').trim(); // Remove comments
        const validation = await validateSQL(sql, request.schema);
        
        result.sql = validation.enhanced;
        result.confidence = validation.valid ? 0.95 : 0.5;
        result.metadata!.suggestions = validation.issues;
      }
    }
    
    // Parse JSON responses for other task types
    if (taskType !== AnalyticsTaskType.SQL_GENERATION && response.startsWith('{')) {
      try {
        const parsed = JSON.parse(response);
        result.result = parsed.answer || parsed.result || response;
        result.confidence = parsed.confidence || 0.85;
        result.metadata = {
          ...result.metadata,
          ...parsed.metadata,
          suggestions: parsed.suggestions || parsed.followUp
        };
      } catch (e) {
        // Keep original response if JSON parsing fails
        logger.warn('Failed to parse JSON response', { error: e });
      }
    }
    
    // Log the result for monitoring
    logger.info('Analytics query completed', {
      taskType,
      executionTime: result.executionTime,
      confidence: result.confidence,
      userId: request.userId
    });
    
    return result;
    
  } catch (error) {
    logger.error('Analytics processing error', { 
      error, 
      userId: request.userId,
      query: request.query 
    });
    
    return {
      result: 'I encountered an error processing your request. Please try rephrasing your question.',
      taskType: AnalyticsTaskType.NATURAL_LANGUAGE,
      confidence: 0,
      executionTime: Date.now() - startTime,
      metadata: {
        suggestions: ['Try being more specific', 'Check if your data is properly connected']
      }
    };
  }
}

/**
 * Execute SQL and return results
 */
export async function executeSQLQuery(
  sql: string, 
  dataSourceId: number
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    // Get data source
    const [dataSource] = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.id, dataSourceId))
      .limit(1);
    
    if (!dataSource) {
      return { success: false, error: 'Data source not found' };
    }
    
    // For now, execute against our data_rows table
    // In production, this would connect to the actual data source
    const rows = await db
      .select()
      .from(dataRows)
      .where(eq(dataRows.dataSourceId, dataSourceId))
      .limit(5000);
    
    // Apply SQL logic to the rows (simplified for demo)
    // In production, use a proper SQL engine or database connection
    return {
      success: true,
      data: rows.map(r => r.rowData)
    };
    
  } catch (error) {
    logger.error('SQL execution error', { error, sql, dataSourceId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'SQL execution failed'
    };
  }
}

/**
 * Generate smart follow-up questions based on the analysis
 */
export function generateFollowUpQuestions(
  taskType: AnalyticsTaskType,
  result: string,
  schema?: any
): string[] {
  const questions: string[] = [];
  
  switch (taskType) {
    case AnalyticsTaskType.SQL_GENERATION:
      questions.push(
        'Would you like me to optimize this query for better performance?',
        'Should I add any additional filters or groupings?',
        'Do you want to export these results?'
      );
      break;
      
    case AnalyticsTaskType.DATA_ANALYSIS:
      questions.push(
        'Would you like to dive deeper into any specific metric?',
        'Should I compare this with a different time period?',
        'Do you want to see a visualization of these findings?'
      );
      break;
      
    case AnalyticsTaskType.TREND_PREDICTION:
      questions.push(
        'What factors might influence this prediction?',
        'Should I analyze seasonal patterns in more detail?',
        'Would you like to see different scenario forecasts?'
      );
      break;
      
    case AnalyticsTaskType.ANOMALY_DETECTION:
      questions.push(
        'Should I investigate the root cause of these anomalies?',
        'Do you want to set up alerts for similar patterns?',
        'Would you like suggestions for data cleaning?'
      );
      break;
      
    default:
      // Generate context-aware questions based on schema
      if (schema) {
        const columns = Object.keys(schema);
        if (columns.includes('revenue') || columns.includes('sales')) {
          questions.push('How are sales trending this month?');
        }
        if (columns.includes('customer_id') || columns.includes('user_id')) {
          questions.push('What\'s our customer retention rate?');
        }
        if (columns.includes('date') || columns.includes('created_at')) {
          questions.push('Can you show me a timeline of activity?');
        }
      }
  }
  
  return questions.slice(0, 3); // Return top 3 most relevant
}