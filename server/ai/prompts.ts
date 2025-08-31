import OpenAI from "openai";
import { logger } from "../utils/logger";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

function getDynamicTemperature(question: string, tier?: string): number {
  // Uniform temperature setting for all queries and tiers
  // Using temperature=0 for maximum consistency as per requirements
  return 0;
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

CRITICAL RESPONSE LENGTH RULES:
- DEFAULT: 1-2 sentences maximum (prefer 1 sentence when possible)
- Use short phrases when appropriate
- Only form complete sentences when clarification is needed
- Pack maximum insight into minimum words
- Lead with the most important finding
- Skip filler words and get straight to the point

How to respond (within length limits):
1. State the key insight or answer immediately
2. Include the most critical data point if space allows
3. For general queries, provide the single most important metric or trend

Rules:
- NEVER invent numbers - use only retrieved query results
- If data is missing, briefly state what's needed
- Be ultra-concise but still accurate
- Focus on actionable information only
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
      temperature: 0,
      top_p: 1,
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
  missingColumns?: string[],
  extendedResponses?: boolean
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
MAXIMUM 1-2 sentences (prefer 1 sentence).
State the key finding with specific number.
Short phrases acceptable.
Example: "Revenue up 15% to $45K this week, Widget A leading at $12K."
`;
    } else if (tier === "professional") {
      if (extendedResponses) {
        instructions = `
FORMATTING RULES:
- Use bullet points (•) or numbered lists for multiple items
- Separate sections with line breaks for clarity
- Keep each point concise and actionable

STRUCTURE:
• Key finding with specific metrics
• Supporting data points (use list format if multiple)
• Trend analysis
• Action items

${tierConfig.allowSuggestions ? "Include 1-2 specific recommendations as bullet points." : ""}

Example for top products query:
"Top selling products:
1. Widget A - $12K revenue (26% of total)
2. Widget B - $8K revenue (17% of total)  
3. Widget C - $6K revenue (13% of total)

Trend: Top 3 products account for 56% of revenue.
Action: Focus inventory on these high performers."
`;
      } else {
        instructions = `
For lists (top products, rankings, etc.): Use numbered format.
For single insights: 1-2 sentences with key metrics.

Examples:
- List: "Top 3: 1) Widget A ($12K), 2) Widget B ($8K), 3) Widget C ($6K)"
- Insight: "Sales up 12% ($45K), driven by Widget A; focus marketing here."
`;
      }
    } else if (tier === "enterprise") {
      if (extendedResponses) {
        instructions = `
FORMATTING RULES:
- Use structured sections with clear headers
- Bullet points for multiple insights
- Tables for comparisons (format as text table)
- Line breaks between sections

STRUCTURE:

📊 Executive Summary:
[One-line key finding]

📈 Key Metrics:
• [Metric 1 with value and change]
• [Metric 2 with value and change]
• [Metric 3 with value and change]

🎯 Recommendations:
1. [Strategic action with expected ROI]
2. [Secondary action with rationale]
${tierConfig.allowSuggestions ? "3. [Additional strategic initiative]" : ""}

${tierConfig.allowCharts ? "📉 Visualization: [Best chart type for this data]" : ""}
${tierConfig.allowForecast ? "🔮 Forecast: [Next period projection with confidence level]" : ""}

For comparisons, use simple text tables:
Product | Revenue | Growth
--------|---------|-------
Item A  | $45K    | +15%
Item B  | $32K    | +8%
`;
      } else {
        instructions = `
For lists: Use concise numbered format with key metrics.
For insights: Executive summary with strategic action.

Examples:
- List: "Top performers: 1) Region A ($250K, +18%), 2) Region B ($180K, +12%)"
- Insight: "Revenue $250K (+18% YoY); wholesale up 35% - double B2B focus."
`;
      }
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
      temperature: 0,
      top_p: 1,
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