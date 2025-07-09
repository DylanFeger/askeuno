import OpenAI from "openai";
import { logger, logAICall } from "../utils/logger";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface AIResponse {
  answer: string;
  queryUsed?: string;
  confidence: number;
  suggestedFollowUps?: string[];
}

export async function generateDataInsight(
  question: string,
  dataSchema: any,
  sampleData: any[],
  conversationHistory: { role: string; content: string }[] = [],
  userId?: number,
  conversationId?: number,
  extendedThinking: boolean = false
): Promise<AIResponse> {
  const startTime = Date.now();
  
  try {
    const systemPrompt = extendedThinking 
      ? `You are an AI assistant specialized in business data analysis. 
    
Your role is to help small business owners understand their data by providing detailed, comprehensive insights.

Context:
- Data Schema: ${JSON.stringify(dataSchema)}
- Sample Data: ${JSON.stringify(sampleData.slice(0, 5))}

Guidelines for Extended Analysis:
- Provide thorough, detailed analysis with multiple perspectives
- Include specific examples and calculations when relevant
- Use business language but include technical details where helpful
- Break down complex insights into digestible sections
- Consider trends, patterns, and anomalies in the data
- Provide actionable recommendations with step-by-step guidance
- Always provide confidence level in your analysis
- Suggest relevant follow-up questions for deeper exploration

Response format should be JSON with:
- answer: Comprehensive, detailed answer with multiple insights
- queryUsed: If a specific query was implied, describe it
- confidence: Number between 0-1 indicating confidence in the answer
- suggestedFollowUps: Array of 3-5 relevant follow-up questions

Remember: Provide in-depth analysis that helps business owners make informed decisions.`
      : `You are an AI assistant specialized in business data analysis. 
    
Your role is to help small business owners understand their data by providing clear, actionable insights.

Context:
- Data Schema: ${JSON.stringify(dataSchema)}
- Sample Data: ${JSON.stringify(sampleData.slice(0, 5))}

Guidelines for Brief Analysis:
- Keep answers short and to the point (2-3 sentences max)
- Use simple business language, avoid technical jargon
- Focus on the single most important insight
- Provide one clear action item if applicable
- Always provide confidence level in your analysis
- Suggest relevant follow-up questions

Response format should be JSON with:
- answer: Brief, direct answer to the question (2-3 sentences)
- queryUsed: If a specific query was implied, describe it briefly
- confidence: Number between 0-1 indicating confidence in the answer
- suggestedFollowUps: Array of 2-3 relevant follow-up questions

Remember: Be concise and focus only on what matters most to the business owner.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: question }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages as any,
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: extendedThinking ? 1500 : 300,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Log successful AI call
    if (userId) {
      logAICall(userId, 'data_insight', 'success', {
        model: 'gpt-4o',
        responseTime: Date.now() - startTime,
        conversationId,
        tokensUsed: response.usage?.total_tokens,
      });
    }
    
    return {
      answer: result.answer || "I apologize, but I couldn't analyze your data properly. Could you try rephrasing your question?",
      queryUsed: result.queryUsed,
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      suggestedFollowUps: result.suggestedFollowUps || []
    };
  } catch (error: any) {
    logger.error("OpenAI API error", { error, question: question.substring(0, 100) });
    
    // Log failed AI call
    if (userId) {
      logAICall(userId, 'data_insight', 'failure', {
        error: error.message,
        responseTime: Date.now() - startTime,
        conversationId,
      });
    }
    
    throw new Error("Failed to generate insights. Please try again.");
  }
}

export async function analyzeDataSchema(data: any[], userId?: number): Promise<any> {
  if (!data || data.length === 0) {
    return {};
  }

  const startTime = Date.now();

  try {
    const sampleData = data.slice(0, 10);
    const systemPrompt = `Analyze this data and provide a schema description in JSON format.
    
    Sample data: ${JSON.stringify(sampleData)}
    
    Provide a JSON response with:
    - columns: Array of column objects with name, type, and description
    - dataType: Overall data type (sales, customers, products, etc.)
    - insights: Array of interesting patterns or notable findings
    - suggestedQuestions: Array of good questions to ask about this data
    
    Focus on business relevance and practical insights.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: systemPrompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1000,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    logger.error("Schema analysis error", { error, dataLength: data.length });
    return {
      columns: [],
      dataType: "unknown",
      insights: [],
      suggestedQuestions: []
    };
  }
}
