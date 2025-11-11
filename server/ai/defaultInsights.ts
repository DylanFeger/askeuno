import { logger } from "../utils/logger";

interface DataSourceInfo {
  name: string;
  schema: any;
  rowCount: number;
}

interface DefaultInsightTemplate {
  type: 'summary' | 'trends' | 'breakdown' | 'top_items';
  sqlTemplate: string;
  needsChart: boolean;
  chartType?: 'line' | 'bar' | 'pie';
  analysisPrompt: string;
}

/**
 * Detects if a query is vague and needs a default insight
 */
export function isVagueQuery(query: string): {
  isVague: boolean;
  insightType?: 'summary' | 'trends' | 'breakdown' | 'top_items';
} {
  const q = query.toLowerCase().trim();
  
  // Very vague queries that should get default insights
  const vagueTriggers = [
    'analyze', 'summarize', 'overview', 'summary', 'show me', 
    'what do i have', 'tell me about', 'give me', 'rundown', 'run down'
  ];
  
  const trendTriggers = [
    'trend', 'over time', 'timeline', 'progression', 'growth', 
    'change', 'evolution', 'history'
  ];
  
  const topTriggers = [
    'top', 'best', 'highest', 'most', 'leading', 'biggest'
  ];
  
  // Check for trend queries
  if (trendTriggers.some(t => q.includes(t))) {
    return { isVague: true, insightType: 'trends' };
  }
  
  // Check for top items queries
  if (topTriggers.some(t => q.includes(t))) {
    return { isVague: true, insightType: 'top_items' };
  }
  
  // Check for very vague queries
  if (vagueTriggers.some(t => q.includes(t)) || q.length < 15) {
    return { isVague: true, insightType: 'summary' };
  }
  
  return { isVague: false };
}

/**
 * Generates a default SQL query for summary insights
 */
function generateSummarySQL(dataSource: DataSourceInfo): { sql: string; description: string } {
  const fields = Object.values(dataSource.schema || {}) as Array<{ name: string; type: string }>;
  const tableName = dataSource.name.toLowerCase().replace(/\s+/g, '_');
  
  // Find key numeric fields
  const numericFields = fields.filter(f => {
    const type = f.type?.toLowerCase() || '';
    const name = f.name.toLowerCase();
    return (type.includes('integer') || type.includes('float') || type.includes('number')) &&
           (name.includes('revenue') || name.includes('sales') || name.includes('total') || 
            name.includes('amount') || name.includes('quantity') || name.includes('price'));
  });
  
  // Find categorical field for grouping
  const categoricalField = fields.find(f => {
    const name = f.name.toLowerCase();
    return name.includes('category') || name.includes('type') || name.includes('segment');
  });
  
  if (numericFields.length > 0 && categoricalField) {
    // Group by category summary
    const numField = numericFields[0].name;
    const catField = categoricalField.name;
    
    return {
      sql: `SELECT "${catField}", 
             COUNT(*) as count, 
             SUM("${numField}") as total_${numField.toLowerCase()},
             AVG("${numField}") as avg_${numField.toLowerCase()}
      FROM "${tableName}"
      GROUP BY "${catField}"
      ORDER BY total_${numField.toLowerCase()} DESC
      LIMIT 10`,
      description: `Summary of ${numField} by ${catField}`
    };
  } else if (numericFields.length > 0) {
    // Overall metrics
    const metrics = numericFields.slice(0, 3).map(f => 
      `SUM("${f.name}") as total_${f.name.toLowerCase()}, AVG("${f.name}") as avg_${f.name.toLowerCase()}`
    ).join(', ');
    
    return {
      sql: `SELECT COUNT(*) as total_records, ${metrics} FROM "${tableName}"`,
      description: `Overall summary metrics`
    };
  } else {
    // Just count records
    return {
      sql: `SELECT COUNT(*) as total_records FROM "${tableName}" LIMIT 100`,
      description: `Record count summary`
    };
  }
}

/**
 * Generates a default SQL query for trend analysis
 */
function generateTrendsSQL(dataSource: DataSourceInfo): { sql: string; description: string; needsChart: boolean } {
  const fields = Object.values(dataSource.schema || {}) as Array<{ name: string; type: string }>;
  const tableName = dataSource.name.toLowerCase().replace(/\s+/g, '_');
  
  // Find date field
  const dateField = fields.find(f => {
    const name = f.name.toLowerCase();
    return name.includes('date') || name.includes('time') || name.includes('created');
  });
  
  // Find numeric field
  const numericField = fields.find(f => {
    const type = f.type?.toLowerCase() || '';
    const name = f.name.toLowerCase();
    return (type.includes('integer') || type.includes('float') || type.includes('number')) &&
           (name.includes('revenue') || name.includes('sales') || name.includes('total') || name.includes('amount'));
  });
  
  if (dateField && numericField) {
    return {
      sql: `SELECT DATE("${dateField.name}") as date, 
             SUM("${numericField.name}") as total_${numericField.name.toLowerCase()},
             COUNT(*) as count
      FROM "${tableName}"
      WHERE "${dateField.name}" IS NOT NULL
      GROUP BY DATE("${dateField.name}")
      ORDER BY date DESC
      LIMIT 30`,
      description: `Trend of ${numericField.name} over time`,
      needsChart: true
    };
  } else if (dateField) {
    return {
      sql: `SELECT DATE("${dateField.name}") as date, COUNT(*) as count
      FROM "${tableName}"
      WHERE "${dateField.name}" IS NOT NULL
      GROUP BY DATE("${dateField.name}")
      ORDER BY date DESC
      LIMIT 30`,
      description: `Activity trend over time`,
      needsChart: true
    };
  } else {
    // No date field, fall back to summary
    return {
      ...generateSummarySQL(dataSource),
      needsChart: false
    };
  }
}

/**
 * Generates a default SQL query for top items
 */
function generateTopItemsSQL(dataSource: DataSourceInfo): { sql: string; description: string } {
  const fields = Object.values(dataSource.schema || {}) as Array<{ name: string; type: string }>;
  const tableName = dataSource.name.toLowerCase().replace(/\s+/g, '_');
  
  // Find name/product field
  const nameField = fields.find(f => {
    const name = f.name.toLowerCase();
    return name.includes('name') || name.includes('product') || name.includes('item') || name.includes('title');
  });
  
  // Find numeric field to sort by
  const numericField = fields.find(f => {
    const type = f.type?.toLowerCase() || '';
    const name = f.name.toLowerCase();
    return (type.includes('integer') || type.includes('float') || type.includes('number')) &&
           (name.includes('revenue') || name.includes('sales') || name.includes('quantity') || name.includes('total'));
  });
  
  if (nameField && numericField) {
    return {
      sql: `SELECT "${nameField.name}", 
             SUM("${numericField.name}") as total_${numericField.name.toLowerCase()},
             COUNT(*) as count
      FROM "${tableName}"
      GROUP BY "${nameField.name}"
      ORDER BY total_${numericField.name.toLowerCase()} DESC
      LIMIT 10`,
      description: `Top items by ${numericField.name}`
    };
  } else {
    // Fall back to summary
    return generateSummarySQL(dataSource);
  }
}

/**
 * Gets a default insight template based on query type
 */
export function getDefaultInsight(
  query: string,
  dataSource: DataSourceInfo
): { sql: string; description: string; needsChart: boolean; chartType?: 'line' | 'bar' } {
  const detection = isVagueQuery(query);
  
  if (!detection.isVague) {
    // Not vague, no default needed
    return { sql: '', description: '', needsChart: false };
  }
  
  logger.info('Generating default insight', { 
    query, 
    insightType: detection.insightType,
    dataSource: dataSource.name
  });
  
  switch (detection.insightType) {
    case 'trends':
      const trendsResult = generateTrendsSQL(dataSource);
      return {
        ...trendsResult,
        chartType: 'line'
      };
      
    case 'top_items':
      return {
        ...generateTopItemsSQL(dataSource),
        needsChart: true,
        chartType: 'bar'
      };
      
    case 'summary':
    default:
      return {
        ...generateSummarySQL(dataSource),
        needsChart: false
      };
  }
}

/**
 * Gets a multi-source default insight
 */
export function getMultiSourceDefaultInsight(
  query: string,
  dataSources: DataSourceInfo[]
): { primarySource: DataSourceInfo; insight: ReturnType<typeof getDefaultInsight> } | null {
  const detection = isVagueQuery(query);
  
  if (!detection.isVague || dataSources.length === 0) {
    return null;
  }
  
  // Use the largest data source as primary
  const primarySource = dataSources.reduce((largest, current) => 
    current.rowCount > largest.rowCount ? current : largest
  );
  
  const insight = getDefaultInsight(query, primarySource);
  
  return { primarySource, insight };
}
