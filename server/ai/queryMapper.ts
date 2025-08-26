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
 * Maps a user query to available data fields using strict field matching
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
  
  // Use OpenAI to map the query to available fields with strict instructions
  try {
    const mappingPrompt = `
You are a strict data field mapper. Your job is to map user queries to ONLY the available data fields.

Available fields: ${availableFieldsList.join(', ')}

User query: "${query}"

Rules:
1. ONLY use fields that exist in the available fields list
2. Map the query to: metric (what to measure), segment (how to group), timeRange (when)
3. If a required piece is missing, note it in missingPieces
4. If the query cannot be mapped to available fields, set isValid to false
5. Never invent or assume fields that don't exist

Respond with JSON only:
{
  "metric": "field_name or null",
  "segment": "field_name or null", 
  "timeRange": "detected time range or null",
  "isValid": true/false,
  "missingPieces": ["list of missing pieces"]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { 
          role: 'system', 
          content: 'You are a strict data field mapper. Only map to fields that actually exist. Never invent fields.'
        },
        { role: 'user', content: mappingPrompt }
      ],
      temperature: 0,
      top_p: 1,
      response_format: { type: 'json_object' },
    });

    const mapping = JSON.parse(response.choices[0].message.content || '{}');
    
    // Validate that mapped fields actually exist
    if (mapping.metric && !availableFields.has(mapping.metric.toLowerCase())) {
      mapping.metric = null;
      mapping.missingPieces = mapping.missingPieces || [];
      mapping.missingPieces.push('valid metric field');
    }
    
    if (mapping.segment && !availableFields.has(mapping.segment.toLowerCase())) {
      mapping.segment = null;
      mapping.missingPieces = mapping.missingPieces || [];
      mapping.missingPieces.push('valid segment field');
    }
    
    // Check if we have enough to answer
    mapping.isValid = !!(mapping.metric || (mapping.segment && mapping.timeRange));
    
    return mapping;
  } catch (error) {
    logger.error('Error mapping query to schema', { error, query });
    return { isValid: false, missingPieces: ['unable to process query'] };
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