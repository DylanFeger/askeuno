import { db } from "../db";
import { dataSources, dataRows, users, chatConversations, chatMessages } from "@shared/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { logger } from "../utils/logger";
import { TIERS } from "./tiers";
import { checkRateLimit } from "./rate";
import { getActiveDataSource, runSQL } from "../data/datasource";
import { generateSQLPlan, generateAnalysis } from "./prompts";
import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

export type AiResponse = {
  text: string;
  chart?: { 
    type: "line" | "bar" | "area" | "pie";
    x: string;
    y: string[] | string;
    data: any[];
  };
  meta: {
    intent: string;
    tier: string;
    tables: string[];
    rows: number;
    limited: boolean;
  };
};

export async function handleChat({
  userId,
  tier,
  message,
  conversationId
}: {
  userId: number;
  tier: string;
  message: string;
  conversationId?: number;
}): Promise<AiResponse> {
  try {
    // 1. Check rate limits
    const rateLimitResult = await checkRateLimit(userId, tier);
    if (!rateLimitResult.allowed) {
      return {
        text: rateLimitResult.message || "Rate limit exceeded. Please wait before sending more queries.",
        meta: {
          intent: "rate_limit",
          tier,
          tables: [],
          rows: 0,
          limited: true
        }
      };
    }

    // 2. Detect intent
    const intent = detectIntent(message);
    
    // 3. Handle irrelevant questions immediately
    if (intent === "irrelevant") {
      return {
        text: "I answer questions about your business data. Ask about metrics, filters, or trends.",
        meta: {
          intent: "irrelevant",
          tier,
          tables: [],
          rows: 0,
          limited: false
        }
      };
    }

    // 4. Get active data source
    const dataSource = await getActiveDataSource(userId);
    
    // 5. Guard data availability
    const dataGuard = guardDataAvailability(intent, dataSource);
    if (!dataGuard.allowed) {
      return {
        text: dataGuard.message,
        meta: {
          intent,
          tier,
          tables: [],
          rows: 0,
          limited: false
        }
      };
    }

    // 6. Handle FAQ/product questions
    if (intent === "faq_product") {
      return handleFAQQuery(message, tier);
    }

    // 7. Execute data query based on tier
    const tierConfig = TIERS[tier as keyof typeof TIERS];
    const result = await executeDataQuery(message, dataSource, tier, tierConfig);
    
    return result;

  } catch (error) {
    logger.error("Chat orchestration error:", error);
    return {
      text: "I encountered an error processing your request. Please try again.",
      meta: {
        intent: "error",
        tier,
        tables: [],
        rows: 0,
        limited: false
      }
    };
  }
}

function detectIntent(message: string): "data_query" | "faq_product" | "irrelevant" {
  const lowercaseMsg = message.toLowerCase();
  
  // Data query keywords
  const dataKeywords = [
    'sum', 'avg', 'average', 'count', 'filter', 'group', 'by', 'where', 
    'top', 'trend', 'growth', 'forecast', 'cohort', 'conversion', 
    'revenue', 'orders', 'sessions', 'cac', 'ltv', 'churn', 'arpu',
    'sales', 'profit', 'customer', 'product', 'total', 'calculate',
    'show', 'display', 'list', 'find', 'analyze', 'compare'
  ];
  
  // FAQ/product keywords
  const faqKeywords = [
    'pricing', 'features', 'connection', 'setup', 'billing', 
    'limits', 'subscription', 'tier', 'plan', 'upgrade', 'how to'
  ];
  
  // Check for data query keywords
  if (dataKeywords.some(keyword => lowercaseMsg.includes(keyword))) {
    return "data_query";
  }
  
  // Check for FAQ keywords
  if (faqKeywords.some(keyword => lowercaseMsg.includes(keyword))) {
    return "faq_product";
  }
  
  // Default to irrelevant
  return "irrelevant";
}

function guardDataAvailability(intent: string, dataSource: any): { allowed: boolean; message: string } {
  if (intent === "data_query") {
    if (!dataSource.active) {
      return {
        allowed: false,
        message: "Please connect a database or upload a file first. Go to the Data Sources page to add your data."
      };
    }
    
    if (!dataSource.tables || dataSource.tables.length === 0) {
      return {
        allowed: false,
        message: "Your data source appears to be empty. Please ensure your data has been properly uploaded or synced."
      };
    }
  }
  
  return { allowed: true, message: "" };
}

function handleFAQQuery(message: string, tier: string): AiResponse {
  const lowercaseMsg = message.toLowerCase();
  let response = "";
  
  if (lowercaseMsg.includes("pricing")) {
    response = "Euno offers three tiers: Starter (Free) with basic features, Professional ($49/mo) with advanced analytics, and Enterprise ($79/mo) with unlimited features and priority support.";
  } else if (lowercaseMsg.includes("connection") || lowercaseMsg.includes("setup")) {
    response = "To connect your data: 1) Go to Data Sources, 2) Click 'Connect New Data Source', 3) Choose your source type, 4) Enter credentials. For files, simply drag and drop on the Upload page.";
  } else if (lowercaseMsg.includes("limits")) {
    response = tier === "beginner" 
      ? "Starter tier: 20 queries/hour, 1 data source, basic analytics."
      : tier === "pro"
      ? "Professional tier: 120 queries/hour, 10 data sources, advanced analytics with suggestions."
      : "Enterprise tier: Unlimited queries, unlimited sources, full analytics with charts and forecasts.";
  } else {
    response = "For detailed information about features and setup, please visit our Help Center or contact support.";
  }
  
  return {
    text: response,
    meta: {
      intent: "faq_product",
      tier,
      tables: [],
      rows: 0,
      limited: false
    }
  };
}

async function executeDataQuery(
  message: string, 
  dataSource: any, 
  tier: string,
  tierConfig: any
): Promise<AiResponse> {
  try {
    // Generate SQL plan
    const sqlPlan = await generateSQLPlan(message, dataSource);
    
    // Check for missing columns
    if (sqlPlan.missingColumns && sqlPlan.missingColumns.length > 0) {
      return {
        text: `I cannot answer this question because your data is missing the following columns: ${sqlPlan.missingColumns.join(', ')}. Please ensure these columns exist in your data source.`,
        meta: {
          intent: "data_query",
          tier,
          tables: [],
          rows: 0,
          limited: false
        }
      };
    }
    
    // Execute SQL
    const queryResult = await runSQL(dataSource, sqlPlan.sql);
    
    // Generate analysis based on tier
    const analysis = await generateAnalysis(
      message,
      queryResult,
      tier,
      tierConfig
    );
    
    // Compose response based on tier
    let responseText = analysis.text;
    
    // Add data basis
    responseText = `Data basis: ${queryResult.tables.join(', ')} (${queryResult.rowCount} rows analyzed)\n\n${responseText}`;
    
    // Add word count limits
    if (tier === "beginner") {
      // Limit to 80 words
      const words = responseText.split(' ');
      if (words.length > 80) {
        responseText = words.slice(0, 80).join(' ') + '...';
      }
    } else if (tier === "pro") {
      // Limit to 180 words
      const words = responseText.split(' ');
      if (words.length > 180) {
        responseText = words.slice(0, 180).join(' ') + '...';
      }
    }
    
    // Build response
    const response: AiResponse = {
      text: responseText,
      meta: {
        intent: "data_query",
        tier,
        tables: queryResult.tables,
        rows: queryResult.rowCount,
        limited: queryResult.rowCount >= 5000
      }
    };
    
    // Add chart for elite tier if applicable
    if (tier === "elite" && tierConfig.allowCharts && analysis.chart) {
      response.chart = analysis.chart;
    }
    
    // Add suggestions for pro and elite
    if ((tier === "pro" || tier === "elite") && tierConfig.allowSuggestions && analysis.suggestions) {
      response.text += `\n\nSuggestions: ${analysis.suggestions}`;
    }
    
    // Add forecast for elite if applicable
    if (tier === "elite" && tierConfig.allowForecast && analysis.forecast) {
      response.text += `\n\nForecast: ${analysis.forecast}\n(Note: Forecast is an estimate based on historical patterns)`;
    }
    
    return response;
    
  } catch (error) {
    logger.error("Data query execution error:", error);
    return {
      text: "I encountered an error analyzing your data. Please check your data source and try again.",
      meta: {
        intent: "data_query",
        tier,
        tables: [],
        rows: 0,
        limited: false
      }
    };
  }
}