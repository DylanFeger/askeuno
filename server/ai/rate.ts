import { TIERS } from "./tiers";

// Simple in-memory LRU cache for rate limiting
interface RateLimitEntry {
  userId: number;
  tier: string;
  timestamps: number[];
  spamCooldown?: number;
}

const rateLimitCache = new Map<string, RateLimitEntry>();
const MAX_CACHE_SIZE = 1000;

export async function checkRateLimit(
  userId: number,
  tier: string
): Promise<{ allowed: boolean; message?: string }> {
  const key = `${userId}-${tier}`;
  const now = Date.now();
  const hourAgo = now - 3600000; // 1 hour in milliseconds
  
  // Get or create entry
  let entry = rateLimitCache.get(key);
  if (!entry) {
    entry = {
      userId,
      tier,
      timestamps: []
    };
  }
  
  // Clean old timestamps
  entry.timestamps = entry.timestamps.filter(ts => ts > hourAgo);
  
  // Check spam cooldown for enterprise tier
  if (tier === 'enterprise' && entry.spamCooldown) {
    if (now < entry.spamCooldown) {
      return {
        allowed: false,
        message: "You've sent too many queries in rapid succession. Please wait 1 hour before continuing."
      };
    } else {
      entry.spamCooldown = undefined;
    }
  }
  
  const tierConfig = TIERS[tier as keyof typeof TIERS];
  
  // Check enterprise tier spam window (60 queries in 60 seconds)
  if (tier === 'enterprise') {
    const enterpriseConfig = TIERS.enterprise;
    const oneMinuteAgo = now - 60000;
    const recentQueries = entry.timestamps.filter(ts => ts > oneMinuteAgo);
    
    if (recentQueries.length >= enterpriseConfig.spamWindowCap) {
      entry.spamCooldown = now + 3600000; // 1 hour cooldown
      rateLimitCache.set(key, entry);
      
      return {
        allowed: false,
        message: "You've sent too many queries in rapid succession. Please wait 1 hour before continuing."
      };
    }
  }
  
  // Check hourly rate limit for starter and professional tiers
  if (tier !== 'enterprise' && entry.timestamps.length >= tierConfig.maxQueriesPerHour) {
    const oldestTimestamp = entry.timestamps[0];
    const timeUntilReset = Math.ceil((oldestTimestamp + 3600000 - now) / 60000);
    
    return {
      allowed: false,
      message: `You've reached your hourly query limit (${tierConfig.maxQueriesPerHour}). Please wait ${timeUntilReset} minutes or upgrade your plan for more queries.`
    };
  }
  
  // Add new timestamp
  entry.timestamps.push(now);
  
  // Store in cache
  rateLimitCache.set(key, entry);
  
  // Implement simple LRU eviction if cache is too large
  if (rateLimitCache.size > MAX_CACHE_SIZE) {
    const firstKey = rateLimitCache.keys().next().value;
    if (firstKey) {
      rateLimitCache.delete(firstKey);
    }
  }
  
  return { allowed: true };
}

export function getQueryStatus(userId: number, tier: string): {
  queriesUsed: number;
  queryLimit: number;
  isUnlimited: boolean;
  timeUntilReset: number;
} {
  // Default to starter tier if tier is undefined or unknown
  const normalizedTier = tier || 'starter';
  const tierConfig = TIERS[normalizedTier as keyof typeof TIERS] || TIERS.starter;
  
  const key = `${userId}-${normalizedTier}`;
  const now = Date.now();
  const hourAgo = now - 3600000;
  
  const entry = rateLimitCache.get(key);
  
  if (!entry) {
    return {
      queriesUsed: 0,
      queryLimit: tierConfig.maxQueriesPerHour,
      isUnlimited: tierConfig.maxQueriesPerHour === Infinity,
      timeUntilReset: 0
    };
  }
  
  // Filter timestamps to only include those from the last hour
  const recentTimestamps = entry.timestamps.filter(ts => ts > hourAgo);
  
  // Calculate time until oldest timestamp expires
  let timeUntilReset = 0;
  if (recentTimestamps.length > 0) {
    const oldestTimestamp = recentTimestamps[0];
    timeUntilReset = Math.max(0, Math.ceil((oldestTimestamp + 3600000 - now) / 60000));
  }
  
  return {
    queriesUsed: recentTimestamps.length,
    queryLimit: tierConfig.maxQueriesPerHour,
    isUnlimited: tierConfig.maxQueriesPerHour === Infinity,
    timeUntilReset
  };
}