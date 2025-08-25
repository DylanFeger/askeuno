import OpenAI from "openai";
import { logger } from "../utils/logger";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

function getDynamicTemperature(question: string): number {
  const lowercaseQ = question.toLowerCase();
  
  // Very precise for SQL/data queries
  if (lowercaseQ.includes('sum') || lowercaseQ.includes('count') || 
      lowercaseQ.includes('average') || lowercaseQ.includes('total')) {
    return 0.2;
  }
  
  // Balanced for trend analysis
  if (lowercaseQ.includes('trend') || lowercaseQ.includes('pattern') || 
      lowercaseQ.includes('compare') || lowercaseQ.includes('analysis')) {
    return 0.4;
  }
  
  // More creative for predictions and general queries
  if (lowercaseQ.includes('forecast') || lowercaseQ.includes('predict') || 
      lowercaseQ.includes('will') || lowercaseQ.includes('should') ||
      lowercaseQ.includes('how are we') || lowercaseQ.includes('what\'s')) {
    return 0.6;
  }
  
  // Default balanced temperature
  return 0.3;
}

export const SYSTEM_SQL = `
You are AskEuno SQL planner. You only output SQL for read-only analytics.
Forbidden: INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, TRUNCATE, PRAGMA.
Must include LIMIT <= 5000.
Prefer existing columns. If a needed column is missing, output: --MISSING:<column>.
Output SQL only.
`;

export const SYSTEM_ANALYST = `
You are Euno AI, a senior data analyst with 15+ years of experience helping businesses succeed.
You've been working closely with this company and understand their needs deeply.

Your personality:
- Expert but approachable - speak like a trusted advisor, not a robot
- Proactive - anticipate what they need to know, not just what they asked
- Action-oriented - always provide actionable insights and next steps
- Contextually aware - understand casual language and business implications

How to respond:
1. Start with the key insight or answer (the "headline")
2. Support with specific data points from the query results
3. Identify patterns, trends, or anomalies worth noting
4. Provide context (comparisons, benchmarks, implications)
5. Suggest concrete actions based on the data

Rules:
- NEVER invent numbers - use only retrieved query results
- If data is missing, be educational:
  - Explain exactly what's needed and why
  - Suggest how to structure the missing data
  - Offer alternative analyses with current data
- Adapt tone to query: urgent issues get direct responses, casual queries get conversational ones
- When answering general questions like "how are we doing?", provide comprehensive overview:
  - Sales performance and trends
  - Top products/services
  - Areas of concern
  - Growth opportunities
  - Recommended actions
`;

export interface SQLPlan {
  sql: string;
  missingColumns?: string[];
}

export interface AnalysisResult {
  text: string;
  suggestions?: string;
  forecast?: string;
  chart?: {
    type: "line" | "bar" | "area" | "pie";
    x: string;
    y: string[] | string;
    data: any[];
  };
}

export async function generateSQLPlan(
  question: string,
  dataSource: any
): Promise<SQLPlan> {
  try {
    const prompt = `
Given this question: "${question}"
And this data schema: ${JSON.stringify(dataSource.tables)}

Generate a SQL query to answer the question.
Remember:
- Only use SELECT and WITH
- Include LIMIT <= 5000
- If columns are missing, prefix with --MISSING:
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_SQL },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 500
    });

    const sqlResponse = response.choices[0].message.content || "";
    
    // Check for missing columns
    const missingMatches = sqlResponse.match(/--MISSING:(\w+)/g);
    const missingColumns = missingMatches ? 
      missingMatches.map(m => m.replace('--MISSING:', '')) : 
      undefined;
    
    // Clean SQL from missing column comments
    const sql = sqlResponse.replace(/--MISSING:\w+/g, '').trim();
    
    return {
      sql,
      missingColumns
    };
    
  } catch (error) {
    logger.error("Error generating SQL plan:", error);
    throw error;
  }
}

export async function generateAnalysis(
  question: string,
  queryResult: { rows: any[]; rowCount: number; tables: string[] },
  tier: string,
  tierConfig: any,
  missingColumns?: string[]
): Promise<AnalysisResult> {
  try {
    let systemPrompt = SYSTEM_ANALYST;
    let instructions = "";
    
    // Check if we have missing columns - provide guidance for ALL tiers
    if (missingColumns && missingColumns.length > 0) {
      instructions = `
IMPORTANT: The user's question requires columns that don't exist in their dataset.
Missing columns: ${missingColumns.join(', ')}

Provide helpful guidance (available to ALL tiers):
1. Clearly state which columns are missing
2. Explain what type of data these columns should contain
3. Give specific examples of how to add this data
4. Suggest alternative analyses they CAN do with current data

Keep the response educational and actionable.
`;
    } else if (tier === "starter") {
      instructions = `
Provide a concise but insightful answer (max 80 words).
Focus on the most important finding.
Speak conversationally but stay brief.
If answering a general query, cover: current performance + one key trend.
`;
    } else if (tier === "professional") {
      instructions = `
Provide comprehensive analysis (max 180 words).
Structure: Key finding → Supporting data → Trend analysis → 2-3 actionable recommendations.
${tierConfig.allowSuggestions ? "Include specific business suggestions with expected impact." : ""}
For general queries, cover: performance overview, top items, trends, opportunities, concerns.
`;
    } else if (tier === "enterprise") {
      instructions = `
Provide expert-level comprehensive analysis.
Structure: Executive summary → Detailed findings → Trend analysis → Strategic recommendations → Forecast.
${tierConfig.allowSuggestions ? "Include 3-5 strategic recommendations with ROI estimates where possible." : ""}
${tierConfig.allowCharts ? "Recommend visualizations that best communicate the insights." : ""}
${tierConfig.allowForecast ? "Provide data-driven forecasts with confidence levels and assumptions." : ""}
For general queries, be the CFO they wish they had: comprehensive, insightful, actionable.
`;
    }
    
    const prompt = `
Question: "${question}"
Query Results: ${JSON.stringify(queryResult.rows.slice(0, 100))}
Row Count: ${queryResult.rowCount}
Tables Used: ${queryResult.tables.join(', ')}
${missingColumns ? `Missing Columns Detected: ${missingColumns.join(', ')}` : ''}

${instructions}

Provide your analysis based ONLY on the data above.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: getDynamicTemperature(question),
      max_tokens: 800
    });

    const content = response.choices[0].message.content || "";
    
    // Parse response for different sections
    const result: AnalysisResult = {
      text: content
    };
    
    // Extract suggestions if present
    if (content.includes("Suggestions:")) {
      const parts = content.split("Suggestions:");
      result.text = parts[0].trim();
      result.suggestions = parts[1].split("Forecast:")[0].trim();
    }
    
    // Extract forecast if present
    if (content.includes("Forecast:")) {
      const parts = content.split("Forecast:");
      result.forecast = parts[1].trim();
    }
    
    // Generate chart data for enterprise tier if appropriate
    if (tier === "enterprise" && tierConfig.allowCharts && queryResult.rows.length > 0) {
      // Simple chart generation based on data structure
      const firstRow = queryResult.rows[0];
      const keys = Object.keys(firstRow);
      
      // Look for numeric and date/string fields
      const numericFields = keys.filter(k => typeof firstRow[k] === 'number');
      const textFields = keys.filter(k => typeof firstRow[k] === 'string');
      
      if (numericFields.length > 0 && textFields.length > 0) {
        result.chart = {
          type: queryResult.rows.length > 10 ? "line" : "bar",
          x: textFields[0],
          y: numericFields[0],
          data: queryResult.rows.slice(0, 50) // Limit chart data
        };
      }
    }
    
    return result;
    
  } catch (error) {
    logger.error("Error generating analysis:", error);
    throw error;
  }
}