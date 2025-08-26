import OpenAI from "openai";
import { logger } from "../utils/logger";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface FollowUpSuggestion {
  text: string;
  category: 'deep_dive' | 'next_step' | 'comparison' | 'action';
}

/**
 * Generates intelligent follow-up suggestions based on the query and response context
 */
export async function generateFollowUpSuggestions(
  originalQuery: string,
  aiResponse: string,
  availableFields: string[],
  tier?: string
): Promise<FollowUpSuggestion[]> {
  try {
    // For starter tier, provide basic suggestions only
    const maxSuggestions = tier === 'starter' ? 2 : 4;
    
    const prompt = `
You are a business analyst helping users explore their data more deeply.
Based on this conversation, generate ${maxSuggestions} follow-up questions that would be valuable next steps.

Original Question: "${originalQuery}"
AI Response: "${aiResponse}"
Available Data Fields: ${availableFields.join(', ')}

Generate follow-up suggestions that:
1. Deep dive into the topic (drill down on specifics)
2. Explore related metrics (logical next questions)
3. Compare different segments or time periods
4. Take actionable next steps

Rules:
- Each suggestion should be 5-10 words max
- Make them specific to the business context
- Use natural, conversational language
- Focus on actionable insights
- Vary the types (don't make all comparisons, etc.)

Return JSON array of suggestions with categories:
[
  {"text": "suggestion text", "category": "deep_dive|next_step|comparison|action"}
]`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { 
          role: "system", 
          content: "Generate contextual follow-up business questions. Return JSON array only."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3, // Some creativity for varied suggestions
      top_p: 1,
      max_tokens: 200,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) return getDefaultSuggestions(originalQuery, availableFields);

    const parsed = JSON.parse(content);
    const suggestions = parsed.suggestions || parsed.followUps || parsed.questions || parsed;
    
    if (Array.isArray(suggestions)) {
      return suggestions.slice(0, maxSuggestions);
    }
    
    return getDefaultSuggestions(originalQuery, availableFields);
    
  } catch (error) {
    logger.error('Error generating follow-up suggestions', { error });
    return getDefaultSuggestions(originalQuery, availableFields);
  }
}

/**
 * Returns contextual default suggestions based on query patterns
 */
function getDefaultSuggestions(query: string, fields: string[]): FollowUpSuggestion[] {
  const lowercaseQuery = query.toLowerCase();
  
  // Revenue/Sales related
  if (lowercaseQuery.includes('revenue') || lowercaseQuery.includes('sales')) {
    return [
      { text: "Compare to last month", category: "comparison" },
      { text: "Show top products", category: "deep_dive" },
      { text: "Break down by category", category: "next_step" },
      { text: "Identify growth opportunities", category: "action" }
    ];
  }
  
  // Product related
  if (lowercaseQuery.includes('product')) {
    return [
      { text: "Check inventory levels", category: "next_step" },
      { text: "Compare product performance", category: "comparison" },
      { text: "Show pricing analysis", category: "deep_dive" },
      { text: "Find slow-moving items", category: "action" }
    ];
  }
  
  // Trend related
  if (lowercaseQuery.includes('trend') || lowercaseQuery.includes('over time')) {
    return [
      { text: "Predict next month", category: "next_step" },
      { text: "Show seasonal patterns", category: "deep_dive" },
      { text: "Compare year-over-year", category: "comparison" },
      { text: "Identify anomalies", category: "action" }
    ];
  }
  
  // Customer related
  if (lowercaseQuery.includes('customer')) {
    return [
      { text: "Segment by value", category: "deep_dive" },
      { text: "Show repeat rate", category: "next_step" },
      { text: "Compare demographics", category: "comparison" },
      { text: "Improve retention", category: "action" }
    ];
  }
  
  // Generic business suggestions
  return [
    { text: "Show performance summary", category: "next_step" },
    { text: "Compare time periods", category: "comparison" },
    { text: "Find top opportunities", category: "action" },
    { text: "Analyze by segment", category: "deep_dive" }
  ];
}

/**
 * Generates smart suggestions based on the data schema
 */
export function generateSchemaBasedSuggestions(
  schema: Record<string, any>
): FollowUpSuggestion[] {
  const suggestions: FollowUpSuggestion[] = [];
  const fields = Object.values(schema).map((field: any) => field.name.toLowerCase());
  
  // Price/Revenue suggestions
  if (fields.some(f => f.includes('price') || f.includes('revenue') || f.includes('amount'))) {
    suggestions.push({ text: "Analyze pricing trends", category: "deep_dive" });
  }
  
  // Date/Time suggestions
  if (fields.some(f => f.includes('date') || f.includes('time'))) {
    suggestions.push({ text: "Show monthly patterns", category: "comparison" });
  }
  
  // Category/Type suggestions
  if (fields.some(f => f.includes('category') || f.includes('type') || f.includes('group'))) {
    suggestions.push({ text: "Compare categories", category: "comparison" });
  }
  
  // Stock/Inventory suggestions
  if (fields.some(f => f.includes('stock') || f.includes('inventory') || f.includes('quantity'))) {
    suggestions.push({ text: "Check stock levels", category: "action" });
  }
  
  return suggestions.slice(0, 4);
}