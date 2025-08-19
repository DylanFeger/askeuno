export const TIERS = {
  beginner: {
    maxQueriesPerHour: 20,
    allowElaboration: false,
    allowSuggestions: false,
    allowCharts: false,
    allowForecast: false
  },
  pro: {
    maxQueriesPerHour: 120,
    allowElaboration: true,
    allowSuggestions: true,
    allowCharts: false,
    allowForecast: false
  },
  elite: {
    maxQueriesPerHour: Infinity,
    spamWindowCap: 60,
    allowElaboration: true,
    allowSuggestions: true,
    allowCharts: true,
    allowForecast: true
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