import OpenAI from "openai";
import { logger } from "../utils/logger";
import { FollowUpSuggestion } from "./suggestionGenerator";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface DataSourceInfo {
  name: string;
  schema: any;
  rowCount: number;
}

/**
 * Analyzes schema to extract meaningful field patterns
 */
function analyzeSchema(schema: any): {
  categoricalFields: string[];
  numericFields: string[];
  dateFields: string[];
  keyInsights: string[];
} {
  const fields = Object.values(schema || {}) as Array<{ name: string; type: string; description?: string }>;
  
  const categoricalFields: string[] = [];
  const numericFields: string[] = [];
  const dateFields: string[] = [];
  const keyInsights: string[] = [];
  
  fields.forEach(field => {
    const name = field.name.toLowerCase();
    const type = field.type?.toLowerCase() || '';
    
    // Categorize by type and name patterns
    if (type.includes('string') || type.includes('text')) {
      if (name.includes('category') || name.includes('type') || name.includes('region') ||
          name.includes('segment') || name.includes('status') || name.includes('method') ||
          name.includes('channel') || name.includes('source')) {
        categoricalFields.push(field.name);
        keyInsights.push(`Can break down by ${field.name}`);
      }
    } else if (type.includes('integer') || type.includes('float') || type.includes('number')) {
      if (name.includes('revenue') || name.includes('sales') || name.includes('price') ||
          name.includes('cost') || name.includes('profit') || name.includes('quantity') ||
          name.includes('amount') || name.includes('total')) {
        numericFields.push(field.name);
        keyInsights.push(`Can analyze ${field.name} metrics`);
      }
    } else if (name.includes('date') || name.includes('time') || name.includes('created') ||
               name.includes('updated') || type.includes('timestamp')) {
      dateFields.push(field.name);
      keyInsights.push(`Can show trends over ${field.name}`);
    }
  });
  
  return { categoricalFields, numericFields, dateFields, keyInsights };
}

/**
 * Generates intelligent, schema-aware suggestions without sampling data
 */
export async function generateSmartSuggestions(
  query: string,
  dataSources: DataSourceInfo[],
  tier: string = 'starter'
): Promise<FollowUpSuggestion[]> {
  try {
    const maxSuggestions = tier === 'starter' ? 2 : 4;
    
    // Analyze all data sources
    const dataContext = dataSources.map(ds => {
      const analysis = analyzeSchema(ds.schema);
      const allFields = Object.values(ds.schema || {}).map((f: any) => f.name);
      
      return `"${ds.name}" (${ds.rowCount} rows):
- Fields: ${allFields.join(', ')}
- Categorical: ${analysis.categoricalFields.join(', ') || 'none'}
- Numeric: ${analysis.numericFields.join(', ') || 'none'}
- Date/Time: ${analysis.dateFields.join(', ') || 'none'}
- Insights: ${analysis.keyInsights.join('; ')}`;
    }).join('\n\n');
    
    const prompt = `You are analyzing business data schemas to suggest intelligent, actionable follow-up questions.

User Query: "${query}"

Available Data:
${dataContext}

Generate ${maxSuggestions} SPECIFIC, ACTIONABLE follow-up suggestions based on the actual schema structure.

Rules:
1. Reference REAL field names from the schema (e.g., "Compare revenue by category" if "category" and "revenue" fields exist)
2. Be concrete and specific - use actual field names
3. Make suggestions immediately actionable
4. Focus on valuable business insights
5. Keep suggestions 5-10 words max
6. Prioritize comparisons, trends, and breakdowns that the data supports

Good examples:
- "Compare revenue by payment_method" (uses real fields)
- "Show sales trends by date" (uses real fields)
- "Top 5 products by quantity" (uses real fields)
- "Revenue breakdown by customer_region" (uses real fields)

Bad examples:
- "Analyze your data" (too vague)
- "Show reports" (not specific)
- "View dashboard" (not actionable)

Return JSON:
{
  "suggestions": [
    {"text": "specific suggestion using real field names", "category": "deep_dive|next_step|comparison|action"}
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a data analyst generating specific, actionable questions based on database schema. Use real field names. Return JSON only."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0,
      max_tokens: 300,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      logger.warn('No content from smart suggestions');
      return getFallbackSuggestions(dataSources);
    }

    const parsed = JSON.parse(content);
    const suggestions = parsed.suggestions || [];
    
    if (Array.isArray(suggestions) && suggestions.length > 0) {
      logger.info('Generated smart suggestions', { count: suggestions.length });
      return suggestions.slice(0, maxSuggestions);
    }
    
    return getFallbackSuggestions(dataSources);
    
  } catch (error) {
    logger.error('Error generating smart suggestions', { error });
    return getFallbackSuggestions(dataSources);
  }
}

/**
 * Fallback suggestions based on schema patterns
 */
function getFallbackSuggestions(dataSources: DataSourceInfo[]): FollowUpSuggestion[] {
  const suggestions: FollowUpSuggestion[] = [];
  
  // Analyze combined schema
  const allAnalyses = dataSources.map(ds => analyzeSchema(ds.schema));
  const allCategorical = allAnalyses.flatMap(a => a.categoricalFields);
  const allNumeric = allAnalyses.flatMap(a => a.numericFields);
  const allDate = allAnalyses.flatMap(a => a.dateFields);
  
  // Generate specific suggestions based on available fields
  if (allNumeric.length > 0 && allCategorical.length > 0) {
    suggestions.push({
      text: `Compare ${allNumeric[0]} by ${allCategorical[0]}`,
      category: "comparison"
    });
  }
  
  if (allDate.length > 0 && allNumeric.length > 0) {
    suggestions.push({
      text: `Show ${allNumeric[0]} trends over time`,
      category: "deep_dive"
    });
  }
  
  if (allNumeric.length > 0) {
    suggestions.push({
      text: `Top performers by ${allNumeric[0]}`,
      category: "action"
    });
  }
  
  if (allCategorical.length > 0) {
    suggestions.push({
      text: `Breakdown by ${allCategorical[0]}`,
      category: "next_step"
    });
  }
  
  // If we don't have enough, add generic ones
  if (suggestions.length < 2) {
    suggestions.push({ text: "Show performance summary", category: "next_step" });
    suggestions.push({ text: "Find key insights", category: "deep_dive" });
  }
  
  return suggestions.slice(0, 4);
}
