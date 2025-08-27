import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../utils/logger";
import { TIERS } from "./tiers";
import { checkRateLimit } from "./rate";
import { getActiveDataSource, runSQL } from "../data/datasource";
import { generateSQLPlan, generateAnalysis } from "./prompts";
import { detectMissingColumns } from "./column-detector";
import { findMetaphorMapping, getMetaphoricalBusinessQuery, shouldRedirectToBusinessQuery } from "./metaphors";
import { multiSourceService } from "../services/multiSourceService";
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
    metaphorUsed?: boolean;
  };
};

export async function handleChat({
  userId,
  tier,
  message,
  conversationId,
  extendedResponses = false
}: {
  userId: number;
  tier: string;
  message: string;
  conversationId?: number;
  extendedResponses?: boolean;
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

    // 2. Check for metaphorical redirect first
    let actualMessage = message;
    let metaphorUsed = false;
    let metaphorIntro = "";
    
    if (shouldRedirectToBusinessQuery(message)) {
      const metaphoricalQuery = getMetaphoricalBusinessQuery(message);
      if (metaphoricalQuery) {
        actualMessage = metaphoricalQuery.businessQuery;
        metaphorUsed = true;
        metaphorIntro = getMetaphorIntro(message, metaphoricalQuery.metaphorType);
      }
    }
    
    // 3. Detect intent (using potentially redirected message)
    const intent = detectIntent(actualMessage);
    
    // 4. Handle irrelevant questions (only if no metaphor was found)
    if (intent === "irrelevant" && !metaphorUsed) {
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

    // 5. Check for multi-source support and get data sources
    const canUseMultiSource = multiSourceService.canUseMultiSource(tier);
    let dataSource = null;
    let multiSources = null;
    
    if (canUseMultiSource) {
      // For Professional and Enterprise tiers, get all active data sources
      const allSources = await multiSourceService.getUserDataSources(userId, tier);
      
      if (allSources.length > 1) {
        // Multi-source mode
        multiSources = allSources;
        // Create a virtual combined data source for backward compatibility
        dataSource = {
          active: true,
          tables: allSources.flatMap(s => {
            // Convert schema to tables format
            const tableName = s.name.toLowerCase().replace(/\s+/g, '_');
            return [{
              name: tableName,
              columns: s.schema || {}
            }];
          }),
          totalRows: allSources.reduce((sum, s) => sum + s.rowCount, 0)
        };
      } else if (allSources.length === 1) {
        // Single source mode
        dataSource = await getActiveDataSource(userId);
      } else {
        dataSource = await getActiveDataSource(userId);
      }
    } else {
      // Starter tier - single source only
      dataSource = await getActiveDataSource(userId);
    }
    
    // 6. Guard data availability
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

    // 7. Handle FAQ/product questions
    if (intent === "faq_product") {
      return handleFAQQuery(message, tier);
    }

    // 8. Execute data query based on tier
    const tierConfig = TIERS[tier as keyof typeof TIERS];
    
    // Check if multi-source query is needed
    if (multiSources && multiSources.length > 1) {
      const result = await executeMultiSourceDataQuery(
        actualMessage, 
        multiSources, 
        tier, 
        tierConfig, 
        metaphorIntro, 
        metaphorUsed, 
        extendedResponses
      );
      return result;
    } else {
      const result = await executeDataQuery(
        actualMessage, 
        dataSource, 
        tier, 
        tierConfig, 
        metaphorIntro, 
        metaphorUsed, 
        extendedResponses
      );
      return result;
    }

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

function getMetaphorIntro(originalMessage: string, metaphorType: string): string {
  const lowercaseMsg = originalMessage.toLowerCase();
  
  // Weather metaphors
  if (lowercaseMsg.includes("weather")) {
    return "☀️ Let me check the business weather for you...";
  }
  if (lowercaseMsg.includes("temperature") || lowercaseMsg.includes("hot") || lowercaseMsg.includes("cold")) {
    return "🌡️ Taking the temperature of your business...";
  }
  if (lowercaseMsg.includes("storm")) {
    return "⛈️ Scanning for any business storms on the horizon...";
  }
  
  // Health metaphors
  if (lowercaseMsg.includes("health") || lowercaseMsg.includes("healthy")) {
    return "🏥 Running a health check on your business...";
  }
  if (lowercaseMsg.includes("pulse") || lowercaseMsg.includes("vital")) {
    return "💓 Checking your business vital signs...";
  }
  
  // Food/Cooking metaphors
  if (lowercaseMsg.includes("cooking") || lowercaseMsg.includes("what's cooking")) {
    return "👨‍🍳 Let me see what's cooking in your business kitchen...";
  }
  if (lowercaseMsg.includes("appetite") || lowercaseMsg.includes("hungry")) {
    return "🍽️ Checking the market's appetite...";
  }
  
  // Sports metaphors
  if (lowercaseMsg.includes("winning") || lowercaseMsg.includes("score")) {
    return "🏆 Let's check your business scoreboard...";
  }
  if (lowercaseMsg.includes("home run") || lowercaseMsg.includes("touchdown")) {
    return "⚡ Looking for your business wins...";
  }
  
  // Journey metaphors
  if (lowercaseMsg.includes("journey") || lowercaseMsg.includes("path")) {
    return "🗺️ Mapping your business journey...";
  }
  if (lowercaseMsg.includes("speed") || lowercaseMsg.includes("velocity")) {
    return "🚀 Measuring your business velocity...";
  }
  
  // Building metaphors
  if (lowercaseMsg.includes("foundation") || lowercaseMsg.includes("building")) {
    return "🏗️ Inspecting your business foundation...";
  }
  
  // Nature metaphors
  if (lowercaseMsg.includes("bloom") || lowercaseMsg.includes("flourish")) {
    return "🌱 Checking how your business is growing...";
  }
  
  // Casual greetings
  if (lowercaseMsg.includes("good morning")) {
    return "☀️ Good morning! Here's your business wake-up report...";
  }
  if (lowercaseMsg.includes("good afternoon")) {
    return "🌤️ Good afternoon! Here's your midday business update...";
  }
  if (lowercaseMsg.includes("good evening")) {
    return "🌙 Good evening! Here's your end-of-day business summary...";
  }
  if (lowercaseMsg.includes("how are we doing") || lowercaseMsg.includes("how's it going")) {
    return "📊 Let me show you how the business is performing...";
  }
  
  // Default creative intro based on metaphor type
  return `I understand you're asking about your ${metaphorType}. Let me translate that into business insights...`;
}

function detectIntent(message: string): "data_query" | "faq_product" | "irrelevant" {
  const lowercaseMsg = message.toLowerCase();
  
  // Expanded data query keywords - be VERY inclusive
  const dataKeywords = [
    'sum', 'avg', 'average', 'count', 'filter', 'group', 'by', 'where', 
    'top', 'trend', 'growth', 'forecast', 'cohort', 'conversion', 
    'revenue', 'orders', 'sessions', 'cac', 'ltv', 'churn', 'arpu',
    'sales', 'profit', 'customer', 'product', 'total', 'calculate',
    'show', 'display', 'list', 'find', 'analyze', 'compare',
    // General data-related terms
    'data', 'business', 'performance', 'metric', 'number', 'result',
    'tell', 'about', 'my', 'our', 'how', 'what', 'when', 'where',
    'overview', 'summary', 'report', 'insight', 'pattern', 'analysis',
    'doing', 'going', 'headed', 'improve', 'better', 'worse',
    // Metaphorical terms that relate to business
    'weather', 'health', 'temperature', 'cooking', 'winning', 'score',
    'journey', 'path', 'speed', 'foundation', 'bloom', 'grow'
  ];
  
  // FAQ/product keywords
  const faqKeywords = [
    'pricing', 'features', 'connection', 'setup', 'billing', 
    'limits', 'subscription', 'tier', 'plan', 'upgrade', 'how to connect',
    'how to upload', 'how does euno', 'what is euno'
  ];
  
  // Truly irrelevant keywords - only mark as irrelevant if these are present
  const irrelevantKeywords = [
    'world record', 'capital of', 'president of', 'population of',
    'recipe for', 'how to cook', 'movie', 'song', 'book', 'author',
    'sports score', 'weather forecast', 'news today', 'stock market',
    'cryptocurrency', 'bitcoin', 'define', 'meaning of', 'translate'
  ];
  
  // Check for truly irrelevant queries first
  if (irrelevantKeywords.some(keyword => lowercaseMsg.includes(keyword))) {
    return "irrelevant";
  }
  
  // Check for FAQ keywords
  if (faqKeywords.some(keyword => lowercaseMsg.includes(keyword))) {
    return "faq_product";
  }
  
  // Default to data_query for everything else
  // This ensures we try to interpret most queries as business-related
  return "data_query";
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

async function executeMultiSourceDataQuery(
  message: string,
  sources: any[],
  tier: string,
  tierConfig: any,
  metaphorIntro: string = "",
  metaphorUsed: boolean = false,
  extendedResponses: boolean = false
): Promise<AiResponse> {
  try {
    // Generate multi-source query plan
    const queryPlan = multiSourceService.generateMultiSourceQueryPlan(message, sources);
    
    // Build a description of available sources for the user
    const sourceDescriptions = sources.map(s => `${s.name} (${s.rowCount} rows)`).join(', ');
    
    // Check for correlation fields
    const correlationFields = queryPlan.correlationFields;
    const hasCorrelations = correlationFields.size > 0;
    
    // If question asks about relationships/correlations but no fields match
    const questionLower = message.toLowerCase();
    const asksForCorrelation = questionLower.includes('affect') || 
                               questionLower.includes('impact') || 
                               questionLower.includes('correlat') ||
                               questionLower.includes('relationship');
    
    if (asksForCorrelation && !hasCorrelations) {
      return {
        text: `I'm analyzing across ${sources.length} data sources (${sourceDescriptions}), but I cannot find matching fields to correlate them. To enable cross-source analysis, ensure your data sources have common identifiers like product IDs, dates, or customer IDs.`,
        meta: {
          intent: "data_query",
          tier,
          tables: sources.map(s => s.name),
          rows: sources.reduce((sum, s) => sum + s.rowCount, 0),
          limited: false
        }
      };
    }
    
    // Generate SQL for each source
    const sqlQueries = new Map<number, string>();
    
    for (const source of sources) {
      // Create a dataSource object that matches the expected format
      const sourceDataFormat = {
        tables: [{
          name: source.name.toLowerCase().replace(/\s+/g, '_'),
          columns: source.schema || {}
        }]
      };
      
      const sqlPlan = await generateSQLPlan(message, sourceDataFormat);
      if (sqlPlan.sql && !sqlPlan.missingColumns?.length) {
        sqlQueries.set(source.id, sqlPlan.sql);
      }
    }
    
    // Execute multi-source query
    const multiResult = await multiSourceService.executeMultiSourceQuery(sources, sqlQueries);
    
    if (multiResult.error) {
      return {
        text: `Error executing multi-source query: ${multiResult.error}`,
        meta: {
          intent: "data_query",
          tier,
          tables: sources.map(s => s.name),
          rows: 0,
          limited: false
        }
      };
    }
    
    // Generate analysis with cross-source context
    const queryResult = {
      rows: multiResult.correlatedData || [],
      rowCount: multiResult.correlatedData?.length || 0,
      tables: sources.map(s => s.name)
    };
    
    const analysis = await generateAnalysis(
      message,
      queryResult,
      tier,
      tierConfig,
      undefined,
      extendedResponses
    );
    
    // Build response with multi-source context
    let responseText = analysis.text;
    
    // Add multi-source context
    responseText = `Multi-source analysis across ${sources.length} databases: ${sourceDescriptions}\n${hasCorrelations ? `Correlated by: ${Array.from(correlationFields.keys()).join(', ')}` : ''}\n\n${responseText}`;
    
    // Add metaphor intro if used
    if (metaphorIntro) {
      responseText = `${metaphorIntro}\n\n${responseText}`;
    }
    
    const response: AiResponse = {
      text: responseText,
      meta: {
        intent: "data_query",
        tier,
        tables: queryResult.tables,
        rows: queryResult.rowCount,
        limited: queryResult.rowCount >= 5000,
        metaphorUsed
      }
    };
    
    // Add tier-specific features
    if (tier === "enterprise" && tierConfig.allowCharts && analysis.chart) {
      response.chart = analysis.chart;
    }
    
    if ((tier === "professional" || tier === "enterprise") && tierConfig.allowSuggestions && analysis.suggestions) {
      response.text += `\n\nSuggestions: ${analysis.suggestions}`;
    }
    
    if (tier === "enterprise" && tierConfig.allowForecast && analysis.forecast) {
      response.text += `\n\nForecast: ${analysis.forecast}`;
    }
    
    return response;
    
  } catch (error) {
    logger.error("Multi-source query execution error:", error);
    return {
      text: "I encountered an error while analyzing across multiple data sources. Please try rephrasing your question.",
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

async function executeDataQuery(
  message: string, 
  dataSource: any, 
  tier: string,
  tierConfig: any,
  metaphorIntro: string = "",
  metaphorUsed: boolean = false,
  extendedResponses: boolean = false
): Promise<AiResponse> {
  try {
    // Get available columns from the data source
    const availableColumns = dataSource.tables.flatMap((table: any) => 
      Object.keys(table.columns || {})
    );
    
    // Detect missing columns using enhanced detection
    const { missing, suggestions } = detectMissingColumns(message, availableColumns);
    
    // If columns are missing, provide educational response (available to ALL tiers)
    if (missing.length > 0) {
      return {
        text: suggestions,
        meta: {
          intent: "data_query",
          tier,
          tables: dataSource.tables,
          rows: 0,
          limited: false
        }
      };
    }
    
    // Generate SQL plan
    const sqlPlan = await generateSQLPlan(message, dataSource);
    
    // Additional check from SQL generation
    if (sqlPlan.missingColumns && sqlPlan.missingColumns.length > 0) {
      // Generate helpful guidance about missing data (available to all tiers)
      const missingDataAnalysis = await generateAnalysis(
        message,
        { rows: [], rowCount: 0, tables: dataSource.tables },
        tier,
        tierConfig,
        sqlPlan.missingColumns, // Pass missing columns for educational response
        extendedResponses
      );
      
      return {
        text: missingDataAnalysis.text,
        meta: {
          intent: "data_query",
          tier,
          tables: dataSource.tables,
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
      tierConfig,
      undefined, // missingColumns
      extendedResponses
    );
    
    // Compose response based on tier
    let responseText = analysis.text;
    
    // Add metaphor intro if used
    if (metaphorIntro) {
      responseText = `${metaphorIntro}\n\n${responseText}`;
    }
    
    // Add data basis
    responseText = `Data basis: ${queryResult.tables.join(', ')} (${queryResult.rowCount} rows analyzed)\n\n${responseText}`;
    
    // Build response
    const response: AiResponse = {
      text: responseText,
      meta: {
        intent: "data_query",
        tier,
        tables: queryResult.tables,
        rows: queryResult.rowCount,
        limited: queryResult.rowCount >= 5000,
        metaphorUsed
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