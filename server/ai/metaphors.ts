export interface MetaphorMapping {
  patterns: string[];
  businessInterpretation: string;
  analysisPrompt: string;
}

export const METAPHOR_MAPPINGS: MetaphorMapping[] = [
  // Weather metaphors
  {
    patterns: ["weather", "forecast", "sunny", "cloudy", "rainy", "stormy"],
    businessInterpretation: "business climate and outlook",
    analysisPrompt: "Analyze the current business performance and provide an outlook using weather metaphors"
  },
  {
    patterns: ["temperature", "hot", "cold", "warm", "cool", "heating", "cooling"],
    businessInterpretation: "sales momentum and market heat",
    analysisPrompt: "Analyze sales trends and momentum, describing them in temperature terms"
  },
  {
    patterns: ["storms", "hurricane", "tornado", "wind"],
    businessInterpretation: "business challenges and risks",
    analysisPrompt: "Identify potential challenges, declining metrics, or risk factors"
  },
  
  // Health metaphors
  {
    patterns: ["healthy", "health", "sick", "wellness", "checkup", "diagnosis"],
    businessInterpretation: "business health and financial wellness",
    analysisPrompt: "Perform a health check on the business metrics including profit margins, growth rates, and overall performance"
  },
  {
    patterns: ["pulse", "heartbeat", "vital signs", "vitals"],
    businessInterpretation: "key performance indicators",
    analysisPrompt: "Check the vital business metrics like revenue, profit, customer acquisition"
  },
  {
    patterns: ["symptoms", "pain points", "ailments"],
    businessInterpretation: "business problems and areas needing attention",
    analysisPrompt: "Identify problem areas, declining metrics, or operational issues"
  },
  
  // Food/Cooking metaphors
  {
    patterns: ["cooking", "recipe", "ingredients", "menu", "dish"],
    businessInterpretation: "product mix and business components",
    analysisPrompt: "Analyze the product mix and how different components contribute to success"
  },
  {
    patterns: ["hot", "sizzling", "fresh", "what's cooking"],
    businessInterpretation: "trending products and hot sellers",
    analysisPrompt: "Identify top performing products, trending items, and fast-moving inventory"
  },
  {
    patterns: ["appetite", "hungry", "feast", "famine"],
    businessInterpretation: "market demand and sales volume",
    analysisPrompt: "Analyze demand patterns, sales volume, and market appetite for products"
  },
  
  // Sports metaphors
  {
    patterns: ["winning", "score", "game", "match", "champion", "team"],
    businessInterpretation: "competitive performance and market position",
    analysisPrompt: "Analyze competitive metrics, market share, and performance against goals"
  },
  {
    patterns: ["home run", "touchdown", "goal", "slam dunk"],
    businessInterpretation: "major successes and wins",
    analysisPrompt: "Identify the biggest wins, successful products, or achievement highlights"
  },
  {
    patterns: ["batting average", "stats", "performance", "record"],
    businessInterpretation: "performance metrics and historical records",
    analysisPrompt: "Review performance statistics, conversion rates, and historical achievements"
  },
  
  // Journey/Travel metaphors
  {
    patterns: ["journey", "destination", "road", "path", "direction"],
    businessInterpretation: "business trajectory and strategic direction",
    analysisPrompt: "Analyze the business trajectory, progress toward goals, and strategic direction"
  },
  {
    patterns: ["speed", "velocity", "accelerating", "brakes", "cruise"],
    businessInterpretation: "growth rate and business velocity",
    analysisPrompt: "Examine growth rates, acceleration patterns, and business momentum"
  },
  {
    patterns: ["fuel", "gas", "energy", "running on empty"],
    businessInterpretation: "cash flow and resource availability",
    analysisPrompt: "Analyze cash position, resource utilization, and operational capacity"
  },
  
  // Building/Construction metaphors
  {
    patterns: ["foundation", "building", "structure", "blueprint"],
    businessInterpretation: "business fundamentals and infrastructure",
    analysisPrompt: "Evaluate fundamental business metrics and structural health"
  },
  {
    patterns: ["growing", "expanding", "scaling", "building up"],
    businessInterpretation: "business growth and expansion",
    analysisPrompt: "Analyze growth patterns, scaling metrics, and expansion opportunities"
  },
  
  // Nature metaphors
  {
    patterns: ["blooming", "flourishing", "withering", "seasons"],
    businessInterpretation: "business cycles and growth phases",
    analysisPrompt: "Analyze seasonal patterns, growth cycles, and business phases"
  },
  {
    patterns: ["ecosystem", "environment", "habitat"],
    businessInterpretation: "business environment and market conditions",
    analysisPrompt: "Evaluate the business environment, market conditions, and competitive landscape"
  },
  
  // General casual greetings and queries
  {
    patterns: ["how are we doing", "how's it going", "what's up", "status"],
    businessInterpretation: "overall business performance",
    analysisPrompt: "Provide a comprehensive overview of current business performance including sales, trends, and key metrics"
  },
  {
    patterns: ["good morning", "good afternoon", "good evening", "hello"],
    businessInterpretation: "timely business update",
    analysisPrompt: "Provide a time-appropriate business update (morning: overnight/yesterday recap, afternoon: today's progress, evening: daily summary)"
  },
  {
    patterns: ["help me", "what should I do", "advice", "recommend"],
    businessInterpretation: "strategic recommendations",
    analysisPrompt: "Analyze current performance and provide actionable recommendations for improvement"
  },
  {
    patterns: ["problem", "issue", "concern", "worry", "trouble"],
    businessInterpretation: "problem areas and concerns",
    analysisPrompt: "Identify and analyze problem areas, declining metrics, or concerning trends"
  }
];

export function findMetaphorMapping(message: string): MetaphorMapping | null {
  const lowercaseMsg = message.toLowerCase();
  
  for (const mapping of METAPHOR_MAPPINGS) {
    if (mapping.patterns.some(pattern => lowercaseMsg.includes(pattern))) {
      return mapping;
    }
  }
  
  return null;
}

export function shouldRedirectToBusinessQuery(message: string): boolean {
  const lowercaseMsg = message.toLowerCase();
  
  // Check if it's already a clear business query
  const businessKeywords = [
    'revenue', 'sales', 'profit', 'customer', 'product', 'order',
    'conversion', 'churn', 'growth', 'metric', 'kpi', 'performance'
  ];
  
  if (businessKeywords.some(keyword => lowercaseMsg.includes(keyword))) {
    return false; // Already a business query, no redirect needed
  }
  
  // Check if it matches any metaphor pattern
  return findMetaphorMapping(message) !== null;
}

export function getMetaphoricalBusinessQuery(message: string): {
  originalQuery: string;
  businessQuery: string;
  metaphorType: string;
} | null {
  const mapping = findMetaphorMapping(message);
  
  if (!mapping) {
    return null;
  }
  
  return {
    originalQuery: message,
    businessQuery: mapping.analysisPrompt,
    metaphorType: mapping.businessInterpretation
  };
}