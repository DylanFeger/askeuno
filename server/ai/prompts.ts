import OpenAI from "openai";
import { logger } from "../utils/logger";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

export const SYSTEM_SQL = `
You are AskEuno SQL planner. You only output SQL for read-only analytics.
Forbidden: INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, TRUNCATE, PRAGMA.
Must include LIMIT <= 5000.
Prefer existing columns. If a needed column is missing, output: --MISSING:<column>.
Output SQL only.
`;

export const SYSTEM_ANALYST = `
You are AskEuno analyst. Use only retrieved query results. No invented numbers.
If data is insufficient, be helpful:
1. State exactly which columns are missing
2. Explain what data types are needed (e.g., "cost per unit", "purchase price", "margin percentage")
3. Suggest column names they could add to enable this analysis
4. Provide examples of how to structure the missing data
Keep answers concise and educational to help users improve their datasets.
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
Answer in 1-2 sentences maximum.
No suggestions or charts.
Be extremely concise.
`;
    } else if (tier === "pro") {
      instructions = `
Answer in 3-4 sentences.
${tierConfig.allowSuggestions ? "Include 1-2 business suggestions based on the data." : ""}
No charts.
`;
    } else if (tier === "elite") {
      instructions = `
Answer in 4-6 sentences.
${tierConfig.allowSuggestions ? "Include 2-3 strategic business suggestions." : ""}
${tierConfig.allowCharts ? "If appropriate, suggest a chart type and structure." : ""}
${tierConfig.allowForecast ? "If time-series data is available, provide a simple forecast." : ""}
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
      temperature: tier === "elite" ? 0.4 : 0.2,
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
    
    // Generate chart data for elite tier if appropriate
    if (tier === "elite" && tierConfig.allowCharts && queryResult.rows.length > 0) {
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