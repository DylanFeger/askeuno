/**
 * Enhanced Column Detection and Education System
 * Provides intelligent feedback about missing data columns
 */

interface MissingColumnInfo {
  column: string;
  description: string;
  dataType: string;
  example: string;
  alternatives?: string[];
}

// Common business metrics and their required columns
const METRIC_REQUIREMENTS: Record<string, MissingColumnInfo[]> = {
  profit: [
    {
      column: 'cost',
      description: 'The cost to produce or acquire each item',
      dataType: 'number (currency)',
      example: 'For a $100 product, cost might be $60',
      alternatives: ['revenue minus cost', 'sales price and markup percentage']
    },
    {
      column: 'profit_margin',
      description: 'The percentage of revenue that is profit',
      dataType: 'percentage',
      example: '0.35 or 35% for a 35% profit margin',
      alternatives: ['(price - cost) / price']
    }
  ],
  
  conversion_rate: [
    {
      column: 'visitors',
      description: 'Total number of visitors or sessions',
      dataType: 'integer',
      example: '1000 visitors to your site',
      alternatives: ['sessions', 'page_views']
    },
    {
      column: 'conversions',
      description: 'Number of successful conversions (sales, signups, etc.)',
      dataType: 'integer',
      example: '50 conversions from 1000 visitors = 5% conversion rate'
    }
  ],
  
  customer_lifetime_value: [
    {
      column: 'customer_id',
      description: 'Unique identifier for each customer',
      dataType: 'string or integer',
      example: 'CUST-001 or 12345'
    },
    {
      column: 'purchase_history',
      description: 'Historical purchase data per customer',
      dataType: 'array or related table',
      example: 'Multiple rows with customer_id and purchase amounts'
    },
    {
      column: 'retention_period',
      description: 'How long customers stay active',
      dataType: 'duration',
      example: '18 months average customer lifespan'
    }
  ],
  
  churn_rate: [
    {
      column: 'subscription_start',
      description: 'When each customer started their subscription',
      dataType: 'date',
      example: '2024-01-15'
    },
    {
      column: 'subscription_end',
      description: 'When customers cancelled (null if still active)',
      dataType: 'date or null',
      example: '2024-06-30 or NULL for active customers'
    },
    {
      column: 'customer_status',
      description: 'Current status of the customer',
      dataType: 'string',
      example: 'active, churned, paused',
      alternatives: ['is_active boolean flag']
    }
  ],
  
  inventory_turnover: [
    {
      column: 'stock_quantity',
      description: 'Current inventory levels',
      dataType: 'integer',
      example: '150 units in stock'
    },
    {
      column: 'units_sold',
      description: 'Number of units sold in period',
      dataType: 'integer',
      example: '500 units sold this month'
    },
    {
      column: 'restock_date',
      description: 'When inventory was last restocked',
      dataType: 'date',
      example: '2024-01-01'
    }
  ]
};

/**
 * Detects what columns are missing based on the user's question
 */
export function detectMissingColumns(
  question: string,
  availableColumns: string[]
): { missing: MissingColumnInfo[]; suggestions: string } {
  const lowerQuestion = question.toLowerCase();
  const lowerColumns = availableColumns.map(c => c.toLowerCase());
  const missing: MissingColumnInfo[] = [];
  
  // Check for profit-related queries
  if (lowerQuestion.includes('profit') || lowerQuestion.includes('margin')) {
    if (!lowerColumns.some(c => c.includes('cost') || c.includes('profit'))) {
      missing.push(...METRIC_REQUIREMENTS.profit);
    }
  }
  
  // Check for conversion rate queries
  if (lowerQuestion.includes('conversion') || lowerQuestion.includes('convert')) {
    if (!lowerColumns.some(c => c.includes('conversion') || c.includes('visitor'))) {
      missing.push(...METRIC_REQUIREMENTS.conversion_rate);
    }
  }
  
  // Check for CLV queries
  if (lowerQuestion.includes('lifetime value') || lowerQuestion.includes('ltv') || lowerQuestion.includes('clv')) {
    if (!lowerColumns.some(c => c.includes('customer') && c.includes('value'))) {
      missing.push(...METRIC_REQUIREMENTS.customer_lifetime_value);
    }
  }
  
  // Check for churn queries
  if (lowerQuestion.includes('churn') || lowerQuestion.includes('retention') || lowerQuestion.includes('cancel')) {
    if (!lowerColumns.some(c => c.includes('churn') || c.includes('cancel'))) {
      missing.push(...METRIC_REQUIREMENTS.churn_rate);
    }
  }
  
  // Check for inventory queries
  if (lowerQuestion.includes('inventory') || lowerQuestion.includes('stock') || lowerQuestion.includes('turnover')) {
    if (!lowerColumns.some(c => c.includes('stock') || c.includes('inventory'))) {
      missing.push(...METRIC_REQUIREMENTS.inventory_turnover);
    }
  }
  
  // Generate helpful suggestions
  let suggestions = '';
  if (missing.length > 0) {
    suggestions = generateEducationalResponse(missing, availableColumns);
  }
  
  return { missing, suggestions };
}

/**
 * Generates an educational response about missing columns
 */
function generateEducationalResponse(
  missing: MissingColumnInfo[],
  availableColumns: string[]
): string {
  let response = `To answer your question, I need the following data that's not in your current dataset:\n\n`;
  
  // Explain each missing column
  missing.forEach((col, index) => {
    response += `${index + 1}. **${col.column}**\n`;
    response += `   - What it is: ${col.description}\n`;
    response += `   - Data type: ${col.dataType}\n`;
    response += `   - Example: ${col.example}\n`;
    if (col.alternatives && col.alternatives.length > 0) {
      response += `   - Alternatives: You could also calculate this using ${col.alternatives.join(' or ')}\n`;
    }
    response += '\n';
  });
  
  // Suggest what they CAN do with current data
  response += `\n**What you CAN analyze with your current data:**\n`;
  if (availableColumns.some(c => c.toLowerCase().includes('sales') || c.toLowerCase().includes('revenue'))) {
    response += `- Total sales and revenue trends\n`;
    response += `- Top performing products or periods\n`;
  }
  if (availableColumns.some(c => c.toLowerCase().includes('customer'))) {
    response += `- Customer segmentation\n`;
    response += `- Purchase patterns\n`;
  }
  if (availableColumns.some(c => c.toLowerCase().includes('date') || c.toLowerCase().includes('time'))) {
    response += `- Time-based trends and seasonality\n`;
    response += `- Period-over-period comparisons\n`;
  }
  
  response += `\n**How to add this data:**\n`;
  response += `1. Export your current data\n`;
  response += `2. Add the missing columns with appropriate values\n`;
  response += `3. Re-upload the enhanced dataset\n`;
  response += `4. Or connect a data source that already includes these fields\n`;
  
  return response;
}

/**
 * Checks if a query can be answered with available columns
 */
export function canAnswerQuery(
  question: string,
  availableColumns: string[]
): { canAnswer: boolean; reason?: string } {
  const { missing } = detectMissingColumns(question, availableColumns);
  
  if (missing.length === 0) {
    return { canAnswer: true };
  }
  
  return {
    canAnswer: false,
    reason: `Missing required columns: ${missing.map(m => m.column).join(', ')}`
  };
}