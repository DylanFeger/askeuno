import crypto from "crypto";
import { db } from "../db";
import { chatMessages } from "@shared/schema";
import { and, eq, gte, desc } from "drizzle-orm";
import { logger } from "../utils/logger";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface CachedResponse {
  content: string;
  metadata: any;
  createdAt: Date;
  isCached: true;
}

/**
 * Generates a stable hash from user query
 * Normalizes query to ensure identical questions produce same hash
 */
export function hashQuery(userId: number, conversationId: number, query: string): string {
  // Normalize query:
  // - Lowercase
  // - Trim whitespace
  // - Remove extra spaces
  // - Remove punctuation (except essential ones)
  const normalized = query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[?!.,;:]+$/g, ''); // Remove trailing punctuation
  
  // Create hash from userId + conversationId + normalized query
  // This ensures same question gets same response within same context
  const hashInput = `${userId}:${conversationId}:${normalized}`;
  
  return crypto
    .createHash('sha256')
    .update(hashInput)
    .digest('hex');
}

/**
 * Checks cache for identical query asked recently (within 1 hour)
 * Returns cached assistant response if found
 */
export async function getCachedResponse(
  userId: number,
  conversationId: number,
  userQuery: string
): Promise<CachedResponse | null> {
  try {
    const queryHash = hashQuery(userId, conversationId, userQuery);
    const cacheExpiry = new Date(Date.now() - CACHE_TTL_MS);
    
    logger.info('Checking query cache', {
      userId,
      conversationId,
      queryHash,
      cacheExpiry
    });
    
    // Find most recent assistant message with matching hash within TTL
    const cachedMessages = await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.conversationId, conversationId),
          eq(chatMessages.messageHash, queryHash),
          eq(chatMessages.role, 'assistant'),
          gte(chatMessages.createdAt, cacheExpiry)
        )
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(1);
    
    if (cachedMessages.length > 0) {
      const cached = cachedMessages[0];
      
      logger.info('Cache hit - returning cached response', {
        messageId: cached.id,
        age: Date.now() - cached.createdAt.getTime(),
        queryHash
      });
      
      return {
        content: cached.content,
        metadata: cached.metadata as any,
        createdAt: cached.createdAt,
        isCached: true
      };
    }
    
    logger.info('Cache miss - no recent identical query found', {
      queryHash
    });
    
    return null;
    
  } catch (error) {
    logger.error('Error checking query cache', error);
    // Don't fail the request if cache lookup fails
    return null;
  }
}

/**
 * Stores query hash with response for future cache hits
 * Called after successful AI response generation
 */
export async function cacheQueryResponse(
  messageId: number,
  userId: number,
  conversationId: number,
  userQuery: string
): Promise<void> {
  try {
    const queryHash = hashQuery(userId, conversationId, userQuery);
    
    // Update the message with the hash
    await db
      .update(chatMessages)
      .set({ messageHash: queryHash })
      .where(eq(chatMessages.id, messageId));
    
    logger.info('Query response cached', {
      messageId,
      queryHash,
      userId,
      conversationId
    });
    
  } catch (error) {
    logger.error('Error caching query response', error);
    // Don't fail the request if caching fails
  }
}

/**
 * Clears old cached entries beyond TTL
 * Can be called periodically to clean up database
 */
export async function clearExpiredCache(): Promise<number> {
  try {
    const cacheExpiry = new Date(Date.now() - CACHE_TTL_MS);
    
    // Note: We don't actually delete messages, just clear their hashes
    // This preserves conversation history while removing cache entries
    const result = await db
      .update(chatMessages)
      .set({ messageHash: null })
      .where(
        and(
          gte(chatMessages.createdAt, cacheExpiry),
          eq(chatMessages.messageHash, null as any) // Only affect already-expired entries
        )
      );
    
    logger.info('Cleared expired cache entries', {
      count: result.rowCount
    });
    
    return result.rowCount || 0;
    
  } catch (error) {
    logger.error('Error clearing expired cache', error);
    return 0;
  }
}
