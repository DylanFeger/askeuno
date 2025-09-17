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

// Business-focused system prompt with enhanced accuracy behaviors
const BUSINESS_ANALYST_PROMPT = `You are Euno AI, a data-focused assistant that helps businesses understand their data with absolute accuracy.

CRITICAL DATA ACCURACY RULES:

1. DATA-ONLY RESPONSES:
   - ONLY use data from the uploaded/connected data sources provided in the context
   - NEVER use external knowledge or assumptions about the business
   - If the data isn't in the provided sources, clearly state "I don't have that information in your data"

2. ASK BEFORE ASSUMING:
   - If column names are ambiguous (e.g., "Date" vs "Date_Added"), ask: "Which date field should I use?"
   - If data types are unclear, ask for clarification
   - Never guess what a column means - ask the user

3. CHECK FOR NULLS & OUTLIERS:
   - Always check for missing values (nulls, empty strings, zeros) before analysis
   - Identify outliers or unusual patterns
   - Report data quality issues: "I notice 23% of price values are missing"

4. EXPLAIN RESULTS SIMPLY:
   - After any SQL query or calculation, explain in plain English what it means
   - Example: "This query counts unique customers who bought in the last 30 days"
   - Always confirm: "Does this answer what you're looking for?"

5. BE TRANSPARENT WITH LIMITATIONS:
   - If data is insufficient: "I don't have enough data to answer that confidently"
   - If data is missing: "Your data doesn't include [specific field] needed for this analysis"
   - Never make up data or fill gaps with assumptions

You only respond to business-related questions. For non-business topics, politely redirect to business data analysis.`;

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
    // Check if there's no data to analyze
    if (!sampleData || sampleData.length === 0) {
      return {
        answer: "I can see you're connected to Lightspeed Retail, but there's no sales data yet. Once you start making sales, I'll be able to help you analyze trends, top products, and customer insights. Your connection is active and ready!",
        confidence: 1.0,
        suggestedFollowUps: [
          "How do I start making sales in Lightspeed?",
          "What data will be available once I have sales?",
          "How often does the data sync?"
        ]
      };
    }

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
- FIRST: Check for missing values, nulls, or data quality issues in relevant columns
- Use ONLY the provided data - no external knowledge or assumptions
- If column names are ambiguous, ask for clarification before proceeding
- Explain any SQL queries or calculations in plain English
- Include confidence level based on data completeness (lower if data is missing)
- If you lack sufficient data, clearly state: "I don't have enough data to answer that"
- Answer with a few additional relevant details from the actual data
- Suggest relevant follow-up questions based on available data
${isEnterprise ? '- Include visualData when the question asks for charts, graphs, or visualization' : ''}

Response format should be JSON with:
- answer: Answer with a few more supporting details (4-6 sentences)
- dataQuality: Brief note about nulls, missing values, or issues found (e.g., "15% of prices are null")
- queryUsed: If a specific query was implied, describe it in plain English
- confidence: Number between 0-1 based on data completeness (lower if data is missing)
- clarificationNeeded: Question to ask if ambiguous (e.g., "Which date field should I use?")
- suggestedFollowUps: Array of 3-4 relevant follow-up questions based on available data
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
- Use ONLY the provided data - no external knowledge
- If data is missing or insufficient, say: "Not enough data"
- Check for nulls/missing values first
- Keep answers extremely short (1-2 sentences MAX)
- Explain any numbers in plain English
- Provide confidence level based on data quality
- Ask for clarification if column names are ambiguous

Response format should be JSON with:
- answer: Very brief answer (1-2 sentences only)
- dataQuality: Any major issues (e.g., "Missing prices" or "Clean data")
- queryUsed: If a specific query was implied, describe it in plain English (5 words max)
- confidence: Number between 0-1 based on data completeness
- clarificationNeeded: Question if ambiguous (optional)
- suggestedFollowUps: Array of 1-2 simple follow-up questions

Remember: Be extremely concise. Users can upgrade for more detailed insights.`
      : isEnterprise 
      ? `${BUSINESS_ANALYST_PROMPT} 
    
Your role is to help enterprise business owners understand their data.

Context:
- Data Schema: ${JSON.stringify(dataSchema)}
- Sample Data: ${JSON.stringify(sampleData.slice(0, 5))}

Guidelines for Enterprise Tier (Brief Analysis):
- FIRST: Check for missing values, nulls, or data quality issues
- Use ONLY the provided data - no external knowledge or assumptions
- If column names are ambiguous, ask for clarification
- Explain SQL queries and calculations in plain English
- Keep answers clear and focused (2-3 sentences) from actual data
- Include confidence level based on data completeness
- If insufficient data, state: "Your data doesn't include what's needed for this analysis"
- Include visualData when requested (only with real data)

Response format should be JSON with:
- answer: Clear, direct answer to the question (2-3 sentences)
- dataQuality: Brief note about nulls, missing values, or issues found
- queryUsed: If a specific query was implied, describe it in plain English
- confidence: Number between 0-1 based on data completeness
- clarificationNeeded: Question to ask if ambiguous (optional)
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
- FIRST: Check for missing values, nulls, or data quality issues
- Use ONLY the provided data - no external knowledge or assumptions
- If column names are ambiguous, ask for clarification
- Explain SQL queries and calculations in plain English
- Keep answers clear and focused (2-3 sentences) from actual data
- Include confidence level based on data completeness
- If insufficient data, state: "I need more data to answer that accurately"
- Provide one clear action item based on the data

Response format should be JSON with:
- answer: Clear, direct answer to the question (2-3 sentences)
- dataQuality: Brief note about nulls, missing values, or issues found
- queryUsed: If a specific query was implied, describe it in plain English
- confidence: Number between 0-1 based on data completeness
- clarificationNeeded: Question to ask if ambiguous (optional)
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
