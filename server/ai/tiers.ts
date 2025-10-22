export const TIERS = {
  starter: {
    maxQueriesPerHour: 5,
    allowElaboration: false,
    allowSuggestions: false,
    allowCharts: false,
    allowForecast: false,
    agentConfig: {
      sqlValidation: true,
      multiStepAnalysis: false,
      maxSubAgents: 0
    }
  },
  beginner: {
    maxQueriesPerHour: 5,
    allowElaboration: false,
    allowSuggestions: false,
    allowCharts: false,
    allowForecast: false,
    agentConfig: {
      sqlValidation: true,
      multiStepAnalysis: false,
      maxSubAgents: 0
    }
  },
  professional: {
    maxQueriesPerHour: 25,
    allowElaboration: true,
    allowSuggestions: true,
    allowCharts: true,
    allowForecast: false,
    agentConfig: {
      sqlValidation: true,
      multiStepAnalysis: true,
      maxSubAgents: 3
    }
  },
  pro: {
    maxQueriesPerHour: 25,
    allowElaboration: true,
    allowSuggestions: true,
    allowCharts: true,
    allowForecast: false,
    agentConfig: {
      sqlValidation: true,
      multiStepAnalysis: true,
      maxSubAgents: 3
    }
  },
  enterprise: {
    maxQueriesPerHour: Infinity,
    spamWindowCap: 60,
    allowElaboration: true,
    allowSuggestions: true,
    allowCharts: true,
    allowForecast: true,
    agentConfig: {
      sqlValidation: true,
      multiStepAnalysis: true,
      maxSubAgents: Infinity
    }
  },
  elite: {
    maxQueriesPerHour: Infinity,
    spamWindowCap: 60,
    allowElaboration: true,
    allowSuggestions: true,
    allowCharts: true,
    allowForecast: true,
    agentConfig: {
      sqlValidation: true,
      multiStepAnalysis: true,
      maxSubAgents: Infinity
    }
  }
};

// Map Euno's tier names to the spec's tier names
export function mapTierName(eunoTier: string): string {
  switch (eunoTier) {
    case 'starter':
      return 'beginner';
    case 'growth':
    case 'professional':
      return 'pro';
    case 'pro':
    case 'enterprise':
      return 'elite';
    default:
      return 'beginner';
  }
}