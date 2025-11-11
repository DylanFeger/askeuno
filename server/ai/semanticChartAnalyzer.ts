import OpenAI from "openai";
import { logger } from "../utils/logger";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

export interface ChartRecommendation {
  type: "line" | "bar" | "area" | "pie";
  x: string;
  y: string | string[];
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Uses semantic analysis (OpenAI) to determine the best chart type
 * based on actual data structure and user intent
 */
export async function analyzeAndRecommendChart(
  userQuestion: string,
  queryResult: { rows: any[]; rowCount: number }
): Promise<ChartRecommendation | null> {
  try {
    if (!queryResult.rows || queryResult.rows.length === 0) {
      return null;
    }

    const firstRow = queryResult.rows[0];
    const keys = Object.keys(firstRow);
    
    // Analyze column types
    const columnAnalysis = keys.map(key => {
      const sampleValue = firstRow[key];
      const type = typeof sampleValue;
      const isDate = isDateLike(key, sampleValue);
      
      return {
        name: key,
        type: isDate ? 'date' : type,
        sampleValue
      };
    });

    // Check if we have the minimum requirements for a chart
    const numericColumns = columnAnalysis.filter(c => c.type === 'number');
    const categoricalColumns = columnAnalysis.filter(c => c.type === 'string' || c.type === 'date');
    
    if (numericColumns.length === 0 || categoricalColumns.length === 0) {
      logger.info('Insufficient data structure for chart generation', {
        numericColumns: numericColumns.length,
        categoricalColumns: categoricalColumns.length
      });
      return null;
    }

    // Prepare data summary for OpenAI analysis
    const dataSummary = {
      rowCount: queryResult.rowCount,
      columns: columnAnalysis,
      sampleRows: queryResult.rows.slice(0, 3), // First 3 rows for context
      numericFields: numericColumns.map(c => c.name),
      categoricalFields: categoricalColumns.map(c => c.name)
    };

    // Call OpenAI for semantic chart analysis
    const prompt = `You are a data visualization expert. Analyze the user's question and data structure to recommend the best chart type.

User Question: "${userQuestion}"

Data Summary:
- Total Rows: ${dataSummary.rowCount}
- Columns: ${JSON.stringify(dataSummary.columns, null, 2)}
- Sample Data (first 3 rows): ${JSON.stringify(dataSummary.sampleRows, null, 2)}

Available chart types:
1. LINE - Best for: trends over time, progression, continuous data, time series
2. BAR - Best for: comparisons, rankings, categorical data, discrete values
3. PIE - Best for: proportions, percentages, parts of a whole (max 8 categories)
4. AREA - Best for: cumulative trends, stacked data, volume over time

Recommend the single best chart type considering:
1. The user's question intent (what are they trying to understand?)
2. The actual data structure (what types of columns exist?)
3. The number of data points (${dataSummary.rowCount} rows)
4. Data visualization best practices

Respond in JSON format:
{
  "chartType": "line" | "bar" | "pie" | "area",
  "xAxis": "column name for x-axis",
  "yAxis": "column name for y-axis",
  "reasoning": "Brief explanation (1-2 sentences) of why this chart type is best",
  "confidence": "high" | "medium" | "low"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a data visualization expert. Always respond with valid JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0, // Deterministic chart selection
      max_tokens: 300,
      response_format: { type: "json_object" }
    });

    const analysisText = response.choices[0].message.content;
    if (!analysisText) {
      logger.warn('OpenAI returned empty chart recommendation');
      return fallbackChartSelection(dataSummary, userQuestion);
    }

    const analysis = JSON.parse(analysisText);
    
    logger.info('Semantic chart analysis complete', {
      chartType: analysis.chartType,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning
    });

    return {
      type: analysis.chartType,
      x: analysis.xAxis,
      y: analysis.yAxis,
      reasoning: analysis.reasoning,
      confidence: analysis.confidence
    };

  } catch (error) {
    logger.error('Error in semantic chart analysis', error);
    
    // Populate fields for fallback analysis
    if (queryResult.rows.length > 0) {
      const firstRow = queryResult.rows[0];
      const keys = Object.keys(firstRow);
      
      const numericFields = keys.filter(k => typeof firstRow[k] === 'number');
      const categoricalFields = keys.filter(k => typeof firstRow[k] === 'string' || isDateLike(k, firstRow[k]));
      
      // Fallback to simple heuristics with actual data
      return fallbackChartSelection({
        rowCount: queryResult.rowCount,
        columns: keys.map(key => ({
          name: key,
          type: typeof firstRow[key]
        })),
        numericFields,
        categoricalFields
      }, userQuestion);
    }
    
    return null;
  }
}

/**
 * Checks if a column likely represents a date
 */
function isDateLike(columnName: string, value: any): boolean {
  const nameLower = columnName.toLowerCase();
  const dateKeywords = ['date', 'time', 'created', 'updated', 'month', 'year', 'day'];
  
  if (dateKeywords.some(kw => nameLower.includes(kw))) {
    return true;
  }
  
  if (typeof value === 'string') {
    const dateTest = new Date(value);
    return !isNaN(dateTest.getTime());
  }
  
  return false;
}

/**
 * Fallback chart selection using simple heuristics
 * Used when OpenAI analysis fails
 */
function fallbackChartSelection(
  dataSummary: any,
  userQuestion: string
): ChartRecommendation | null {
  const questionLower = userQuestion.toLowerCase();
  const numericFields = dataSummary.numericFields || [];
  const categoricalFields = dataSummary.categoricalFields || [];
  
  if (numericFields.length === 0 || categoricalFields.length === 0) {
    return null;
  }

  let chartType: "line" | "bar" | "pie" | "area" = "bar";
  
  // Simple keyword matching as fallback
  if (questionLower.match(/\b(trend|over time|monthly|weekly|daily)\b/)) {
    chartType = "line";
  } else if (questionLower.match(/\b(breakdown|distribution|share|percentage)\b/)) {
    chartType = dataSummary.rowCount <= 8 ? "pie" : "bar";
  } else if (questionLower.match(/\b(compare|top|best|worst|highest|lowest)\b/)) {
    chartType = "bar";
  }

  return {
    type: chartType,
    x: categoricalFields[0],
    y: numericFields[0],
    reasoning: "Fallback chart selection based on keyword analysis",
    confidence: 'low'
  };
}
