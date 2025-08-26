import OpenAI from 'openai';
import { storage } from '../storage';
import { logger } from '../utils/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface QueryMapping {
  metric?: string;
  segment?: string;
  timeRange?: string;
  isValid: boolean;
  missingPieces?: string[];
}

export interface SchemaField {
  name: string;
  type: string;
  description?: string;
}

export interface DataSourceInfo {
  id: number;
  name: string;
  type: string;
  schema: Record<string, SchemaField>;
}

/**
 * Maps a user query to available data fields using intelligent interpretation
 * Returns a mapping with metric, segment, and time range if available
 */
export async function mapQueryToSchema(
  query: string,
  dataSources: DataSourceInfo[]
): Promise<QueryMapping> {
  if (!dataSources || dataSources.length === 0) {
    return { isValid: false, missingPieces: ['data source'] };
  }

  // Extract available fields from all data sources
  const availableFields: Set<string> = new Set();
  const fieldDescriptions: Map<string, string> = new Map();
  
  dataSources.forEach(ds => {
    if (ds.schema) {
      Object.entries(ds.schema).forEach(([fieldName, fieldInfo]) => {
        availableFields.add(fieldName.toLowerCase());
        if (fieldInfo.description) {
          fieldDescriptions.set(fieldName.toLowerCase(), fieldInfo.description);
        }
      });
    }
  });

  const availableFieldsList = Array.from(availableFields);
  
  // Use OpenAI to intelligently interpret the query
  try {
    const mappingPrompt = `
You are an intelligent business data analyst who helps users understand their data.
Your job is to interpret what the user is asking about and relate it to their connected business data.

Available fields in their data: ${availableFieldsList.join(', ')}

User query: "${query}"

IMPORTANT INTERPRETATION RULES:
1. Be VERY liberal in interpreting queries as business-related
2. Metaphorical queries should be interpreted as business questions:
   - "How's the weather?" = How is business performing?
   - "Tell me about my data" = Give overview of the data
   - "How are we doing?" = Current business performance
   - "Where are we headed?" = Business trends and direction
   - "How can we improve?" = Performance optimization opportunities
   - "What's cooking?" = What products/trends are hot
   - "Are we healthy?" = Business health metrics
3. General questions about "data", "performance", "trends" are ALWAYS valid
4. ONLY mark as invalid if truly unrelated (like "world record for pushups", "capital of France", etc.)
5. When in doubt, assume the user is asking about their business data

Response rules:
- Set isValid to true for ANY query that could possibly relate to business data
- For general queries, you can leave metric/segment as null but still mark as valid
- Only set isValid to false for truly non-business queries

Respond with JSON only:
{
  "metric": "field_name or null",
  "segment": "field_name or null", 
  "timeRange": "detected time range or null",
  "isValid": true/false,
  "interpretedIntent": "what you think they're asking about",
  "missingPieces": []
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { 
          role: 'system', 
          content: 'You are an intelligent business analyst who interprets queries liberally. Assume users are asking about their business data unless clearly unrelated.'
        },
        { role: 'user', content: mappingPrompt }
      ],
      temperature: 0,
      top_p: 1,
      response_format: { type: 'json_object' },
    });

    const mapping = JSON.parse(response.choices[0].message.content || '{}');
    
    // Be lenient - if the query could possibly be business-related, it's valid
    // Only truly unrelated queries should be marked invalid
    if (mapping.interpretedIntent && 
        !mapping.interpretedIntent.toLowerCase().includes('unrelated') &&
        !mapping.interpretedIntent.toLowerCase().includes('non-business')) {
      mapping.isValid = true;
    }
    
    return mapping;
  } catch (error) {
    logger.error('Error mapping query to schema', { error, query });
    // Default to valid for general queries to avoid false negatives
    return { isValid: true, missingPieces: [] };
  }
}

/**
 * Generates a rewrite request for missing information
 */
export async function generateRewriteRequest(
  originalQuery: string,
  missingPieces: string[]
): Promise<string> {
  try {
    const prompt = `
Rewrite this request in ONE sentence asking for the missing information.
Original: "${originalQuery}"
Missing: ${missingPieces.join(', ')}

Rules:
1. Keep it under 20 words
2. Be specific about what's needed
3. Use simple, clear language

Example: "Please specify which metric you'd like to analyze for that time period."`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'Generate a one-sentence clarification request.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0,
      top_p: 1,
      max_tokens: 50,
    });

    return response.choices[0].message.content?.trim() || 
           `Please specify ${missingPieces.join(' and ')}.`;
  } catch (error) {
    logger.error('Error generating rewrite request', { error });
    return `Please specify ${missingPieces.join(' and ')}.`;
  }
}

/**
 * Generates example questions based on available schema
 */
export function generateExampleQuestions(dataSources: DataSourceInfo[]): string[] {
  const examples: string[] = [];
  
  if (!dataSources || dataSources.length === 0) {
    return [
      "Upload data to get started with analysis",
      "Connect a data source to begin"
    ];
  }

  // Extract metrics and dimensions from schema
  const metrics: string[] = [];
  const dimensions: string[] = [];
  const hasTimeField = dataSources.some(ds => 
    ds.schema && Object.keys(ds.schema).some(field => 
      field.toLowerCase().includes('date') || 
      field.toLowerCase().includes('time') ||
      field.toLowerCase().includes('month') ||
      field.toLowerCase().includes('year')
    )
  );

  dataSources.forEach(ds => {
    if (ds.schema) {
      Object.entries(ds.schema).forEach(([fieldName, fieldInfo]) => {
        const lowerField = fieldName.toLowerCase();
        // Identify metrics (numeric fields)
        if (fieldInfo.type === 'Float' || fieldInfo.type === 'Integer' || 
            lowerField.includes('revenue') || lowerField.includes('sales') || 
            lowerField.includes('amount') || lowerField.includes('count') ||
            lowerField.includes('price') || lowerField.includes('cost')) {
          metrics.push(fieldName);
        }
        // Identify dimensions (categorical fields)
        else if (fieldInfo.type === 'String' || 
                 lowerField.includes('name') || lowerField.includes('category') ||
                 lowerField.includes('type') || lowerField.includes('channel')) {
          dimensions.push(fieldName);
        }
      });
    }
  });

  // Generate examples based on available fields
  if (metrics.length > 0 && dimensions.length > 0) {
    if (metrics.includes('revenue') || metrics.includes('Revenue')) {
      examples.push("What's my total revenue by channel?");
      examples.push("Show revenue breakdown by product");
    }
    if (metrics.includes('units_sold') || metrics.includes('Units_Sold')) {
      examples.push("Which products sold the most units?");
      examples.push("Compare unit sales across channels");
    }
    if (hasTimeField) {
      examples.push("Show me last month's performance");
      examples.push("What are the trends over time?");
    }
  }

  // Add generic examples if we have any metrics
  if (metrics.length > 0) {
    examples.push(`What's the total ${metrics[0]}?`);
    examples.push(`Show me the top 5 by ${metrics[0]}`);
  }

  // Ensure we always have at least 4 examples
  while (examples.length < 4) {
    examples.push("Analyze the data patterns");
  }

  return examples.slice(0, 6); // Return max 6 examples
}

/**
 * Logs a scope mismatch event for analytics
 */
export function logScopeMismatch(
  userId: number,
  tier: string,
  sourceList: string[],
  attemptedMapping: QueryMapping,
  query: string
): void {
  logger.info('Chat scope mismatch', {
    reason: 'scope_mismatch',
    userId,
    tier,
    sourceList,
    attemptedMapping,
    query,
    timestamp: new Date().toISOString()
  });
}