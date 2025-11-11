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
import { AIAgentOrchestrator } from "./agentOrchestrator";
import { analyzeDataQuality } from "./dataQualityAnalyzer";
import { generateUserFriendlyError } from "./errorMessages";
import { validateAIResponse } from "./responseValidator";
import { isVagueQuery, getDefaultInsight, getMultiSourceDefaultInsight } from "./defaultInsights";
import { generateSmartSuggestions } from "./dataAwareSuggestions";
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
    suggestions?: Array<{text: string; category: string}>;
  };
};

export async function handleChat({
  userId,
  tier,
  message,
  conversationId,
  extendedResponses = false,
  isSuggestionFollowup = false
}: {
  userId: number;
  tier: string;
  message: string;
  conversationId?: number;
  extendedResponses?: boolean;
  isSuggestionFollowup?: boolean;
}): Promise<AiResponse> {
  try {
    // 1. Check rate limits (suggestion follow-ups are FREE)
    const rateLimitResult = await checkRateLimit(userId, tier, isSuggestionFollowup);
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
    
    // Generate helpful error message
    const errorMessage = generateUserFriendlyError({
      type: 'sql_error',
      details: { error: (error as Error).message }
    });
    
    return {
      text: errorMessage,
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
    // Pricing and financial terms (usually about user's data)
    'pricing', 'price', 'cost', 'margin', 'discount', 'markup',
    // General data-related terms
    'data', 'business', 'performance', 'metric', 'number', 'result',
    'tell', 'about', 'my', 'our', 'how', 'what', 'when', 'where',
    'overview', 'summary', 'report', 'insight', 'pattern', 'analysis',
    'doing', 'going', 'headed', 'improve', 'better', 'worse',
    // Metaphorical terms that relate to business
    'weather', 'health', 'temperature', 'cooking', 'winning', 'score',
    'journey', 'path', 'speed', 'foundation', 'bloom', 'grow'
  ];
  
  // FAQ/product keywords - only for questions specifically about Euno platform
  const faqKeywords = [
    'euno pricing', 'euno cost', 'euno features', 'euno plan', 'euno tier',
    'subscription cost', 'subscription price', 'billing', 'how much does euno',
    'limits', 'tier', 'plan', 'upgrade', 'how to connect',
    'how to upload', 'how does euno', 'what is euno', 'setup guide'
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
      const errorMessage = generateUserFriendlyError({
        type: 'no_data',
        details: { hasDataSource: false }
      });
      
      return {
        allowed: false,
        message: errorMessage
      };
    }
    
    if (!dataSource.tables || dataSource.tables.length === 0) {
      const errorMessage = generateUserFriendlyError({
        type: 'no_data',
        details: { hasDataSource: true }
      });
      
      return {
        allowed: false,
        message: errorMessage
      };
    }
  }
  
  return { allowed: true, message: "" };
}

function handleFAQQuery(message: string, tier: string): AiResponse {
  const lowercaseMsg = message.toLowerCase();
  let response = "";
  
  if (lowercaseMsg.includes("pricing") || lowercaseMsg.includes("cost") || lowercaseMsg.includes("price")) {
    response = "Euno offers three tiers: Starter (Free) with basic features, Professional ($99/mo or $1,009/year) with advanced analytics, and Enterprise ($249/mo or $2,540/year) with unlimited features and priority support.";
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
    // Initialize agent orchestrator for validation
    const agentOrch = new AIAgentOrchestrator(tier);
    
    // Check if this is a vague query that needs a default insight
    const vaguenessCheck = isVagueQuery(message);
    if (vaguenessCheck.isVague && sources.length > 0) {
      logger.info('Vague query detected - providing default insight', { 
        query: message, 
        insightType: vaguenessCheck.insightType,
        sourceCount: sources.length
      });
      
      // Get default insight for multi-source
      const defaultInsightResult = getMultiSourceDefaultInsight(message, sources);
      
      if (defaultInsightResult && defaultInsightResult.insight.sql) {
        const { primarySource, insight } = defaultInsightResult;
        const tableName = primarySource.name.toLowerCase().replace(/\s+/g, '_');
        
        // Create dataSource format for runSQL
        const dataSource = {
          active: true,
          tables: [{
            name: tableName,
            columns: primarySource.schema || {}
          }]
        };
        
        try {
          // Execute the default SQL
          const result = await runSQL(dataSource, insight.sql, tier);
          
          // Generate smart suggestions based on actual schema
          const suggestions = await generateSmartSuggestions(message, sources, tier);
          
          // Analyze data quality
          const columnNames = Object.keys(primarySource.schema || {});
          const qualityAnalysis = analyzeDataQuality(result.rows, columnNames);
          
          // Generate AI analysis with proper parameters
          const analysisResult = await generateAnalysis(
            message,
            { rows: result.rows, rowCount: result.rows.length, tables: sources.map(s => s.name) },
            tier,
            tierConfig,
            [],
            extendedResponses
          );
          
          // Prepend multi-source context to the analysis
          const analysisPrefix = `Multi-source analysis across ${sources.length} databases: ${sources.map(s => `${s.name} (${s.rowCount} rows)`).join(', ')}
Correlated by: ${columnNames.slice(0, 3).join(', ')}

`;
          const analysis = analysisPrefix + analysisResult.text;
          
          const response: AiResponse = {
            text: analysis,
            meta: {
              intent: "data_query",
              tier,
              tables: sources.map(s => s.name),
              rows: result.rows.length,
              limited: false,
              metaphorUsed,
              suggestions: suggestions
            }
          };
          
          // Add chart if suggested by default insight
          if (insight.needsChart && insight.chartType && result.rows.length > 0) {
            const firstRow = result.rows[0];
            const fields = Object.keys(firstRow);
            
            // Use the fields from the query result
            if (fields.length >= 2) {
              response.chart = {
                type: insight.chartType,
                x: fields[0],
                y: fields[1],
                data: result.rows
              };
            }
          }
          
          return response;
        } catch (error) {
          logger.warn('Default insight failed, falling back to normal flow', { error });
          // Fall through to normal flow
        }
      }
    }
    
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
    
    // Generate and validate SQL for each source
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
        // Validate SQL before adding to query map
        const validation = await agentOrch.validateSQL(sqlPlan.sql, message, sourceDataFormat);
        
        if (validation.isValid) {
          const finalSQL = validation.sql || sqlPlan.sql;
          sqlQueries.set(source.id, finalSQL);
        } else {
          logger.warn("Multi-source SQL validation failed for source", { 
            sourceName: source.name, 
            concerns: validation.concerns 
          });
        }
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
    
    // Add tier-specific features - Professional and Enterprise get automatic charts
    if (tierConfig.allowCharts && analysis.chart) {
      response.chart = analysis.chart;
    }
    
    if (tierConfig.allowSuggestions && analysis.suggestions) {
      response.text += `\n\nSuggestions: ${analysis.suggestions}`;
    }
    
    if (tier === "enterprise" && tierConfig.allowForecast && analysis.forecast) {
      response.text += `\n\nForecast: ${analysis.forecast}`;
    }
    
    return response;
    
  } catch (error) {
    logger.error("Multi-source query execution error:", error);
    
    const errorMessage = generateUserFriendlyError({
      type: 'sql_error',
      details: { error: (error as Error).message },
      suggestion: "Try asking about one data source at a time, or verify all your data sources are still connected."
    });
    
    return {
      text: errorMessage,
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

async function executeMultiStepQuery(
  message: string,
  dataSource: any,
  tier: string,
  tierConfig: any,
  multiStepPlan: any,
  agentOrch: AIAgentOrchestrator,
  metaphorIntro: string = "",
  metaphorUsed: boolean = false,
  extendedResponses: boolean = false
): Promise<AiResponse> {
  try {
    logger.info("Executing multi-step analysis", { 
      tier, 
      stepCount: multiStepPlan.steps.length 
    });
    
    const stepResults: Array<{ description: string; result: any; qualityReport?: any }> = [];
    
    // Execute each step in order
    for (const step of multiStepPlan.steps) {
      try {
        // Generate SQL for this specific step
        const sqlPlan = await generateSQLPlan(step.query, dataSource);
        
        // Validate the SQL
        const validation = await agentOrch.validateSQL(sqlPlan.sql, step.query, dataSource);
        const finalSQL = validation.sql || sqlPlan.sql;
        
        // Execute the step
        const stepResult = await runSQL(dataSource, finalSQL, tier);
        
        // Analyze data quality for this step
        const stepQualityReport = analyzeDataQuality(stepResult.rows);
        
        stepResults.push({
          description: step.description,
          result: stepResult,
          qualityReport: stepQualityReport
        });
        
      } catch (stepError) {
        logger.error("Multi-step execution error on step", { step, error: stepError });
        stepResults.push({
          description: step.description,
          result: { error: "Step failed to execute" }
        });
      }
    }
    
    // Synthesize all results into final answer
    const synthesizedAnswer = await agentOrch.synthesizeMultiStepResults(
      message,
      stepResults,
      tier,
      extendedResponses
    );
    
    // Collect all data quality disclosures from steps
    const qualityDisclosures = stepResults
      .map(step => step.qualityReport?.disclosureMessage)
      .filter(Boolean)
      .join(' ');
    
    // Calculate total rows analyzed
    const totalRows = stepResults.reduce((sum, step) => {
      return sum + (step.result.rowCount || 0);
    }, 0);
    
    // Build response
    let responseText = synthesizedAnswer;
    
    // Prepend quality disclosures if any
    if (qualityDisclosures) {
      responseText = `${qualityDisclosures}\n\n${responseText}`;
    }
    
    if (metaphorIntro) {
      responseText = `${metaphorIntro}\n\n${responseText}`;
    }
    
    responseText = `Multi-step analysis (${multiStepPlan.steps.length} steps)\nData basis: ${dataSource.tables.map((t: any) => t.name).join(', ')} (${totalRows} rows analyzed)\n\n${responseText}`;
    
    const response: AiResponse = {
      text: responseText,
      meta: {
        intent: "data_query",
        tier,
        tables: dataSource.tables.map((t: any) => t.name),
        rows: totalRows,
        limited: false,
        metaphorUsed
      }
    };
    
    return response;
    
  } catch (error) {
    logger.error("Multi-step query error:", error);
    
    const errorMessage = generateUserFriendlyError({
      type: 'sql_error',
      details: { error: (error as Error).message },
      suggestion: "Try breaking your question into simpler parts, or ask about one metric at a time."
    });
    
    return {
      text: errorMessage,
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
    // Initialize agent orchestrator for this tier
    const agentOrch = new AIAgentOrchestrator(tier);
    
    // Check if this is a vague query that needs a default insight
    const vaguenessCheck = isVagueQuery(message);
    if (vaguenessCheck.isVague && dataSource.tables && dataSource.tables.length > 0) {
      logger.info('Vague query detected - providing default insight (single-source)', { 
        query: message, 
        insightType: vaguenessCheck.insightType,
        table: dataSource.tables[0]?.name
      });
      
      // Get table info for default insight
      const table = dataSource.tables[0];
      const tableInfo = {
        name: table.name,
        schema: table.columns || {},
        rowCount: dataSource.totalRows || 0
      };
      
      const insight = getDefaultInsight(message, tableInfo);
      
      if (insight.sql) {
        try {
          // Execute the default SQL
          const result = await runSQL(dataSource, insight.sql, tier);
          
          // Generate smart suggestions based on schema
          const suggestions = await generateSmartSuggestions(message, [tableInfo], tier);
          
          // Analyze data quality
          const columnNames = Object.keys(tableInfo.schema);
          const qualityAnalysis = analyzeDataQuality(result.rows, columnNames);
          
          // Generate AI analysis
          const analysisResult = await generateAnalysis(
            message,
            { rows: result.rows, rowCount: result.rows.length, tables: [table.name] },
            tier,
            tierConfig,
            [],
            extendedResponses
          );
          
          // Prepend context if needed
          let analysis = analysisResult.text;
          if (metaphorIntro) {
            analysis = `${metaphorIntro}\n\n${analysis}`;
          }
          
          const response: AiResponse = {
            text: analysis,
            meta: {
              intent: "data_query",
              tier,
              tables: [table.name],
              rows: result.rows.length,
              limited: false,
              metaphorUsed,
              suggestions: suggestions
            }
          };
          
          // Add chart if suggested by default insight
          if (insight.needsChart && insight.chartType && result.rows.length > 0) {
            const firstRow = result.rows[0];
            const fields = Object.keys(firstRow);
            
            if (fields.length >= 2) {
              response.chart = {
                type: insight.chartType,
                x: fields[0],
                y: fields[1],
                data: result.rows
              };
            }
          }
          
          return response;
        } catch (error) {
          logger.warn('Default insight failed, falling back to normal flow', { error });
          // Fall through to normal flow
        }
      }
    }
    
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
    
    // Check if multi-step analysis is beneficial for this query
    const multiStepPlan = await agentOrch.planMultiStepAnalysis(message, dataSource);
    
    // If multi-step analysis is needed and tier supports it
    if (multiStepPlan.needsMultiStep && agentOrch.canUseMultiStep()) {
      return await executeMultiStepQuery(
        message,
        dataSource,
        tier,
        tierConfig,
        multiStepPlan,
        agentOrch,
        metaphorIntro,
        metaphorUsed,
        extendedResponses
      );
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
        sqlPlan.missingColumns,
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
    
    // Validate SQL with agent (all tiers get validation)
    const validation = await agentOrch.validateSQL(sqlPlan.sql, message, dataSource);
    
    // If validation found critical issues, return error
    if (!validation.isValid) {
      logger.warn("SQL validation failed", { concerns: validation.concerns });
      return {
        text: "I couldn't generate a valid query for your request. Could you rephrase your question?",
        meta: {
          intent: "data_query",
          tier,
          tables: dataSource.tables,
          rows: 0,
          limited: false
        }
      };
    }
    
    // Use corrected SQL from validation
    const finalSQL = validation.sql || sqlPlan.sql;
    
    // Execute SQL
    const queryResult = await runSQL(dataSource, finalSQL, tier);
    
    // Analyze data quality and generate transparent disclosure
    const qualityReport = analyzeDataQuality(queryResult.rows);
    
    logger.info('Data quality analysis', {
      hasIssues: qualityReport.hasIssues,
      issueCount: qualityReport.issues.length,
      disclosure: qualityReport.disclosureMessage
    });
    
    // Generate analysis based on tier
    const analysis = await generateAnalysis(
      message,
      queryResult,
      tier,
      tierConfig,
      undefined, // missingColumns
      extendedResponses
    );
    
    // Prepend data quality disclosure to response if issues found
    if (qualityReport.disclosureMessage) {
      analysis.text = `${qualityReport.disclosureMessage}\n\n${analysis.text}`;
    }
    
    // Validate AI response to prevent hallucinations
    const responseValidation = validateAIResponse(analysis.text, queryResult, message);
    
    if (!responseValidation.isValid) {
      logger.warn('Response validation failed', {
        errors: responseValidation.errors,
        warnings: responseValidation.warnings
      });
      
      // If response has critical errors (hallucinations), request regeneration
      if (responseValidation.errors.length > 0) {
        logger.error('Response contains potential hallucinations - blocking');
        
        return {
          text: "I encountered an issue generating an accurate response. Please try rephrasing your question or asking about a different aspect of your data.",
          meta: {
            intent: "data_query",
            tier,
            tables: queryResult.tables,
            rows: queryResult.rowCount,
            limited: false
          }
        };
      }
    }
    
    // Log validation warnings (non-blocking)
    if (responseValidation.warnings.length > 0) {
      logger.warn('Response validation warnings', {
        warnings: responseValidation.warnings,
        confidence: responseValidation.confidence
      });
    }
    
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
    
    // Add tier-specific features - Professional and Enterprise get automatic charts
    if (tierConfig.allowCharts && analysis.chart) {
      response.chart = analysis.chart;
    }
    
    // Add suggestions based on tier configuration
    if (tierConfig.allowSuggestions && analysis.suggestions) {
      response.text += `\n\nSuggestions: ${analysis.suggestions}`;
    }
    
    // Add forecast for elite if applicable
    if (tier === "elite" && tierConfig.allowForecast && analysis.forecast) {
      response.text += `\n\nForecast: ${analysis.forecast}\n(Note: Forecast is an estimate based on historical patterns)`;
    }
    
    return response;
    
  } catch (error) {
    logger.error("Data query execution error:", error);
    
    const errorMessage = generateUserFriendlyError({
      type: 'sql_error',
      details: { error: (error as Error).message },
      suggestion: "Please verify your data source is connected and contains data, then try again."
    });
    
    return {
      text: errorMessage,
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