import { TIERS } from "./tiers";
import { storage } from "../storage";

export async function checkRateLimit(
  userId: number,
  tier: string,
  isSuggestionFollowup: boolean = false
): Promise<{ allowed: boolean; message?: string }> {
  const tierConfig = TIERS[tier as keyof typeof TIERS];
  
  // Suggestion follow-ups are FREE - don't consume query credits
  // Still check spam limits for Enterprise tier only
  if (isSuggestionFollowup) {
    if (tier === 'enterprise') {
      // Still enforce spam window for Enterprise even on free suggestions
      const minuteLimit = TIERS.enterprise.spamWindowCap;
      const result = await storage.checkAndRecordQuery(userId, Number.MAX_SAFE_INTEGER, minuteLimit);
      
      if (!result.allowed) {
        return {
          allowed: false,
          message: "You've sent too many queries in rapid succession. Please wait 1 hour before continuing."
        };
      }
    }
    // Suggestion follow-ups are always allowed (don't consume credits)
    return { allowed: true };
  }
  
  // Normal queries: check rate limits and consume credits
  // Enterprise tier has unlimited queries - only check spam window
  if (tier === 'enterprise') {
    const minuteLimit = TIERS.enterprise.spamWindowCap;
    // Use very large sentinel for hourly limit (effectively unlimited)
    const result = await storage.checkAndRecordQuery(userId, Number.MAX_SAFE_INTEGER, minuteLimit);
    
    if (!result.allowed) {
      return {
        allowed: false,
        message: "You've sent too many queries in rapid succession. Please wait 1 hour before continuing."
      };
    }
    return { allowed: true };
  }
  
  // Starter/Professional tiers: check hourly limit only
  const result = await storage.checkAndRecordQuery(userId, tierConfig.maxQueriesPerHour);
  
  if (!result.allowed) {
    return {
      allowed: false,
      message: `You've reached your hourly query limit (${tierConfig.maxQueriesPerHour}). ${result.timeUntilReset > 0 ? `Please wait ${result.timeUntilReset} minutes or ` : ''}Upgrade your plan for more queries.`
    };
  }
  
  return { allowed: true };
}

export async function getQueryStatus(userId: number, tier: string): Promise<{
  queriesUsed: number;
  queryLimit: number;
  isUnlimited: boolean;
  timeUntilReset: number;
}> {
  // Default to starter tier if tier is undefined or unknown
  const normalizedTier = tier || 'starter';
  const tierConfig = TIERS[normalizedTier as keyof typeof TIERS] || TIERS.starter;
  
  const now = Date.now();
  
  // Get recent timestamps from database (last hour)
  const recentTimestamps = await storage.getRecentQueryTimestamps(userId, 1);
  const timestamps = recentTimestamps.map(t => new Date(t.timestamp).getTime());
  
  // Calculate time until oldest timestamp expires
  let timeUntilReset = 0;
  if (timestamps.length > 0) {
    const oldestTimestamp = timestamps[0];
    timeUntilReset = Math.max(0, Math.ceil((oldestTimestamp + 3600000 - now) / 60000));
  }
  
  return {
    queriesUsed: timestamps.length,
    queryLimit: tierConfig.maxQueriesPerHour,
    isUnlimited: tierConfig.maxQueriesPerHour === Infinity,
    timeUntilReset
  };
}