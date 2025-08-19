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
  
  // Check spam cooldown for elite tier
  if (tier === 'elite' && entry.spamCooldown) {
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
  
  // Check elite tier spam window (60 queries in 60 seconds)
  if (tier === 'elite') {
    const eliteConfig = TIERS.elite;
    const oneMinuteAgo = now - 60000;
    const recentQueries = entry.timestamps.filter(ts => ts > oneMinuteAgo);
    
    if (recentQueries.length >= eliteConfig.spamWindowCap) {
      entry.spamCooldown = now + 3600000; // 1 hour cooldown
      rateLimitCache.set(key, entry);
      
      return {
        allowed: false,
        message: "You've sent too many queries in rapid succession. Please wait 1 hour before continuing."
      };
    }
  }
  
  // Check hourly rate limit for beginner and pro tiers
  if (tier !== 'elite' && entry.timestamps.length >= tierConfig.maxQueriesPerHour) {
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