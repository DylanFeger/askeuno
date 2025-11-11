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
 * Generates basic schema-based suggestions when no AI response is available
 */
export function generateSchemaBasedSuggestions(schema: any): FollowUpSuggestion[] {
  const suggestions: FollowUpSuggestion[] = [];
  const fields = Object.values(schema || {}).map((f: any) => f.name);
  
  // Find key fields in schema
  const hasPrice = fields.some((f: string) => f.toLowerCase().includes('price'));
  const hasStock = fields.some((f: string) => f.toLowerCase().includes('stock') || f.toLowerCase().includes('inventory'));
  const hasCategory = fields.some((f: string) => f.toLowerCase().includes('category') || f.toLowerCase().includes('type'));
  const hasDate = fields.some((f: string) => f.toLowerCase().includes('date') || f.toLowerCase().includes('time'));
  
  // Generate contextual suggestions based on available fields
  if (hasStock) {
    suggestions.push({ text: "Show low stock items", category: 'action' });
  }
  if (hasPrice && hasCategory) {
    suggestions.push({ text: "Compare prices by category", category: 'comparison' });
  }
  if (hasDate) {
    suggestions.push({ text: "Show recent activity", category: 'deep_dive' });
  }
  if (hasCategory) {
    suggestions.push({ text: "Top performing categories", category: 'next_step' });
  }
  
  // Return up to 4 suggestions
  return suggestions.slice(0, 4);
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
Based on this specific conversation, generate ${maxSuggestions} highly relevant follow-up questions.

Original Question: "${originalQuery}"
AI Response: "${aiResponse}"
Available Data Fields: ${availableFields.join(', ')}

Generate follow-up suggestions that DIRECTLY relate to what was just discussed:
1. If discussing stock levels → suggest checking reorder points, low stock alerts, or specific product stock
2. If discussing sales → suggest time comparisons, top products, or customer segments
3. If discussing trends → suggest forecasts, seasonality, or growth rates
4. If discussing products → suggest inventory, pricing, or performance metrics

Rules:
- Each suggestion must be DIRECTLY RELATED to the current topic
- Keep them 5-10 words max
- Be specific - mention actual metrics or segments discussed
- Don't be generic - tailor to the exact conversation
- Example: If discussing "necklace sales", suggest "Compare necklace styles" not "View all products"

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
      temperature: 0, // Deterministic for maximum consistency
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

