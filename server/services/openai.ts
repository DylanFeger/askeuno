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
  visualData?: any; // For future graph implementation in pro tier
  category?: 'sales' | 'trends' | 'predictions' | 'general';
  suggestedTabSwitch?: string;
}

// Helper function to detect query type and determine temperature
function analyzeQueryType(question: string): {
  category: 'sales' | 'trends' | 'predictions' | 'general';
  temperature: number;
  model: string;
} {
  const lowercaseQuestion = question.toLowerCase();
  
  // SQL generation or data analysis tasks - low temperature for accuracy
  if (lowercaseQuestion.includes('sql') || 
      lowercaseQuestion.includes('query') || 
      lowercaseQuestion.includes('calculate') ||
      lowercaseQuestion.includes('sum') ||
      lowercaseQuestion.includes('count') ||
      lowercaseQuestion.includes('average') ||
      lowercaseQuestion.includes('total')) {
    return { 
      category: 'sales', 
      temperature: 0.2,
      model: 'gpt-4o' // Best for analytical tasks
    };
  }
  
  // Sales-related questions
  if (lowercaseQuestion.includes('revenue') ||
      lowercaseQuestion.includes('sales') ||
      lowercaseQuestion.includes('profit') ||
      lowercaseQuestion.includes('customer') ||
      lowercaseQuestion.includes('order') ||
      lowercaseQuestion.includes('product') ||
      lowercaseQuestion.includes('price')) {
    return { 
      category: 'sales', 
      temperature: 0.2,
      model: 'gpt-4o'
    };
  }
  
  // Trend analysis - moderate temperature for balanced analysis
  if (lowercaseQuestion.includes('trend') ||
      lowercaseQuestion.includes('pattern') ||
      lowercaseQuestion.includes('change') ||
      lowercaseQuestion.includes('growth') ||
      lowercaseQuestion.includes('decline') ||
      lowercaseQuestion.includes('comparison') ||
      lowercaseQuestion.includes('over time')) {
    return { 
      category: 'trends', 
      temperature: 0.4,
      model: 'gpt-4o'
    };
  }
  
  // Predictions and forecasting - higher temperature for creativity
  if (lowercaseQuestion.includes('predict') ||
      lowercaseQuestion.includes('forecast') ||
      lowercaseQuestion.includes('future') ||
      lowercaseQuestion.includes('will') ||
      lowercaseQuestion.includes('expect') ||
      lowercaseQuestion.includes('project') ||
      lowercaseQuestion.includes('estimate')) {
    return { 
      category: 'predictions', 
      temperature: 0.6,
      model: 'gpt-4o' // Using gpt-4o for all tasks
    };
  }
  
  // Default for general questions
  return { 
    category: 'general', 
    temperature: 0.4,
    model: 'gpt-4o'
  };
}

// Business-focused system prompt
const BUSINESS_ANALYST_PROMPT = `You are Euno AI, a smart and trustworthy assistant that specializes in helping businesses understand their data, generate SQL queries, and identify trends or predictions. 

You only respond to questions related to business analytics, data analysis, sales, trends, predictions, and related business topics. If asked about non-business topics (personal questions, entertainment, general knowledge unrelated to business), politely decline and redirect the conversation back to business data analysis.

Your tone is professional, focused, and helpful. Always aim to provide actionable insights that can help improve business decisions.`;

export async function generateDataInsight(
  question: string,
  dataSchema: any,
  sampleData: any[],
  conversationHistory: { role: string; content: string }[] = [],
  userId?: number,
  conversationId?: number,
  extendedThinking: boolean = false,
  userTier: string = 'starter',
  currentCategory?: string
): Promise<AIResponse> {
  const startTime = Date.now();
  
  try {
    // Analyze query type and get appropriate settings
    const queryAnalysis = analyzeQueryType(question);
    const { category, temperature, model } = queryAnalysis;
    
    // Check if user should switch tabs
    let suggestedTabSwitch: string | undefined;
    if (currentCategory && currentCategory !== category && currentCategory !== 'general') {
      suggestedTabSwitch = `This question relates more to ${category}. Would you like to switch to the ${category.charAt(0).toUpperCase() + category.slice(1)} tab for better context and relevant insights?`;
    }
    
    // Determine response style based on tier and extendedThinking
    const isStarter = userTier === 'starter';
    const isProfessional = userTier === 'growth';
    const isEnterprise = userTier === 'pro';
    
    // Starter tier always gets short responses
    // Professional tier can toggle between short and extended
    // Enterprise tier gets extended responses with graph data preparation
    const shouldProvideExtended = (isProfessional && extendedThinking) || (isEnterprise && extendedThinking);
    
    const systemPrompt = shouldProvideExtended 
      ? `${BUSINESS_ANALYST_PROMPT} 
    
Your role is to help small business owners understand their data by providing clear insights with just a bit more detail.

Context:
- Data Schema: ${JSON.stringify(dataSchema)}
- Sample Data: ${JSON.stringify(sampleData.slice(0, 5))}

Guidelines for Extended Analysis:
- Answer the specific question with a few additional relevant details
- Include one or two supporting examples or numbers when helpful
- Keep your response focused on what was asked - don't branch out
- Use simple business language
- Add just enough context to make the answer more complete
- Always provide confidence level in your analysis
- Suggest relevant follow-up questions
${isEnterprise ? '- Include visualData when the question asks for charts, graphs, or visualization' : ''}

Response format should be JSON with:
- answer: Answer with a few more supporting details (4-6 sentences)
- queryUsed: If a specific query was implied, describe it
- confidence: Number between 0-1 indicating confidence in the answer
- suggestedFollowUps: Array of 3-4 relevant follow-up questions
${isEnterprise ? `- visualData: {
    type: 'bar' | 'line' | 'pie',
    data: array of objects with consistent keys,
    config: { xAxis: field name, yAxis: field name }
  } (only when visualization is requested)` : ''}

Remember: Stay focused on the user's question and add just a few helpful details.`
      : isStarter 
      ? `${BUSINESS_ANALYST_PROMPT} 
    
Your role is to help small business owners understand their data by providing VERY brief insights.

Context:
- Data Schema: ${JSON.stringify(dataSchema)}
- Sample Data: ${JSON.stringify(sampleData.slice(0, 5))}

Guidelines for Starter Tier (VERY Brief Analysis):
- Keep answers extremely short (1-2 sentences MAX)
- Only provide the most essential insight
- Use simple business language
- Do NOT provide detailed analysis
- Always provide confidence level in your analysis
- Suggest 1-2 follow-up questions to encourage upgrades

Response format should be JSON with:
- answer: Very brief answer (1-2 sentences only)
- queryUsed: If a specific query was implied, describe it in 5 words max
- confidence: Number between 0-1 indicating confidence in the answer
- suggestedFollowUps: Array of 1-2 simple follow-up questions

Remember: Be extremely concise. Users can upgrade for more detailed insights.`
      : isEnterprise 
      ? `${BUSINESS_ANALYST_PROMPT} 
    
Your role is to help enterprise business owners understand their data.

Context:
- Data Schema: ${JSON.stringify(dataSchema)}
- Sample Data: ${JSON.stringify(sampleData.slice(0, 5))}

Guidelines for Enterprise Tier (Brief Analysis):
- Keep answers clear and focused (2-3 sentences)
- Use simple business language, avoid technical jargon
- Focus on the most important insights
- Include visualData when the question asks for charts, graphs, or visualization
- Always provide confidence level in your analysis
- Suggest relevant follow-up questions

Response format should be JSON with:
- answer: Clear, direct answer to the question (2-3 sentences)
- queryUsed: If a specific query was implied, describe it briefly
- confidence: Number between 0-1 indicating confidence in the answer
- suggestedFollowUps: Array of 2-3 relevant follow-up questions
- visualData: {
    type: 'bar' | 'line' | 'pie',
    data: array of objects with consistent keys,
    config: { xAxis: field name, yAxis: field name }
  } (only when visualization is requested)

Remember: Be clear and focus on what matters most to the business owner.`
      : `${BUSINESS_ANALYST_PROMPT} 
    
Your role is to help small business owners understand their data by providing clear, actionable insights.

Context:
- Data Schema: ${JSON.stringify(dataSchema)}
- Sample Data: ${JSON.stringify(sampleData.slice(0, 5))}

Guidelines for Professional Tier (Standard Analysis):
- Keep answers clear and focused (2-3 sentences)
- Use simple business language, avoid technical jargon
- Focus on the most important insights
- Provide one clear action item if applicable
- Always provide confidence level in your analysis
- Suggest relevant follow-up questions

Response format should be JSON with:
- answer: Clear, direct answer to the question (2-3 sentences)
- queryUsed: If a specific query was implied, describe it briefly
- confidence: Number between 0-1 indicating confidence in the answer
- suggestedFollowUps: Array of 2-3 relevant follow-up questions

Remember: Be clear and focus on what matters most to the business owner.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: question }
    ];

    // Set token limits based on tier and extended thinking
    const maxTokens = isStarter ? 150 : (shouldProvideExtended ? 600 : 300);
    
    const response = await openai.chat.completions.create({
      model: model,
      messages: messages as any,
      response_format: { type: "json_object" },
      temperature: temperature,
      max_tokens: maxTokens,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Log successful AI call
    if (userId) {
      logAICall(userId, 'data_insight', 'success', {
        model: model,
        responseTime: Date.now() - startTime,
        conversationId,
        tokensUsed: response.usage?.total_tokens,
        category: category,
        temperature: temperature
      });
    }
    
    return {
      answer: result.answer || "I apologize, but I couldn't analyze your data properly. Could you try rephrasing your question?",
      queryUsed: result.queryUsed,
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      suggestedFollowUps: result.suggestedFollowUps || [],
      visualData: result.visualData || null,
      category: category,
      suggestedTabSwitch: suggestedTabSwitch
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

export async function generateConversationTitle(
  messages: { role: string; content: string }[],
  dataSourceName?: string
): Promise<string> {
  try {
    // Get only the first few messages to keep context manageable
    const relevantMessages = messages.slice(0, Math.min(4, messages.length));
    
    const systemPrompt = `Generate a short, clear title for this conversation.
    ${dataSourceName ? `Database: ${dataSourceName}` : ''}
    
    Guidelines:
    - Maximum 5-8 words
    - Focus on the main topic or question
    - Use business-friendly language
    - Avoid generic phrases like "Chat about data"
    - Be specific but concise
    
    Provide a JSON response with:
    - title: The generated title (string)`;

    const conversationText = relevantMessages
      .map(msg => `${msg.role}: ${msg.content.substring(0, 200)}`)
      .join('\n');

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a title for this conversation:\n\n${conversationText}` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 100,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result.title || `Chat with Euno — ${new Date().toLocaleDateString()}`;
  } catch (error) {
    logger.error("Title generation error", { error });
    return `Chat with Euno — ${new Date().toLocaleDateString()}`;
  }
}
