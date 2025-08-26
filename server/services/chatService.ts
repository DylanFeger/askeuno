import { createHash } from 'crypto';
import { db } from '../db';
import { chatMessages, chatConversations } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { storage } from '../storage';

interface MessageRequest {
  userId: number;
  conversationId: number | null;
  content: string;
  requestId: string;
  dataSourceId?: number;
}

interface MessageResponse {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  metadata?: any;
  createdAt: Date;
  isDuplicate?: boolean;
}

// Cache for recent requests to prevent duplicates
const requestCache = new Map<string, MessageResponse>();
const CACHE_TTL = 60000; // 1 minute

// Generate hash for message deduplication
function generateMessageHash(userId: number, conversationId: number, content: string): string {
  return createHash('sha256')
    .update(`${userId}-${conversationId}-${content}`)
    .digest('hex');
}

// Generate request cache key
function getRequestCacheKey(userId: number, requestId: string): string {
  return `${userId}-${requestId}`;
}

// Clean expired cache entries
function cleanRequestCache() {
  const now = Date.now();
  const entries = Array.from(requestCache.entries());
  for (const [key, value] of entries) {
    if (value.createdAt && new Date(value.createdAt).getTime() + CACHE_TTL < now) {
      requestCache.delete(key);
    }
  }
}

export async function createOrGetConversation(
  userId: number,
  dataSourceId?: number
): Promise<number> {
  // Create new conversation
  const [newConversation] = await db
    .insert(chatConversations)
    .values({
      userId,
      dataSourceId,
      title: 'New conversation',
      category: 'general'
    })
    .returning();
  
  return newConversation.id;
}

export async function saveUserMessage(
  request: MessageRequest
): Promise<MessageResponse> {
  try {
    // Clean expired cache entries periodically
    cleanRequestCache();
    
    // Check request cache first
    const cacheKey = getRequestCacheKey(request.userId, request.requestId);
    const cached = requestCache.get(cacheKey);
    if (cached) {
      return { ...cached, isDuplicate: true };
    }
    
    // Ensure we have a conversation
    let conversationId = request.conversationId;
    if (!conversationId) {
      conversationId = await createOrGetConversation(request.userId, request.dataSourceId);
    }
    
    // Generate message hash for deduplication
    const messageHash = generateMessageHash(request.userId, conversationId, request.content);
    
    // Check if this exact message already exists
    const [existingMessage] = await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.conversationId, conversationId),
          eq(chatMessages.messageHash, messageHash),
          eq(chatMessages.role, 'user')
        )
      )
      .limit(1);
    
    if (existingMessage) {
      const response: MessageResponse = {
        id: existingMessage.id,
        conversationId: existingMessage.conversationId,
        role: existingMessage.role,
        content: existingMessage.content,
        metadata: existingMessage.metadata,
        createdAt: existingMessage.createdAt,
        isDuplicate: true
      };
      
      // Cache the response
      requestCache.set(cacheKey, response);
      return response;
    }
    
    // Create new message
    const [newMessage] = await db
      .insert(chatMessages)
      .values({
        conversationId,
        role: 'user',
        content: request.content,
        messageHash,
        requestId: request.requestId,
        isComplete: true,
        metadata: {}
      })
      .returning();
    
    const response: MessageResponse = {
      id: newMessage.id,
      conversationId: newMessage.conversationId,
      role: newMessage.role,
      content: newMessage.content,
      metadata: newMessage.metadata,
      createdAt: newMessage.createdAt,
      isDuplicate: false
    };
    
    // Cache the response
    requestCache.set(cacheKey, response);
    
    // Update conversation title if it's the first message
    const messageCount = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId));
    
    if (messageCount.length === 1) {
      await db
        .update(chatConversations)
        .set({
          title: request.content.substring(0, 50) + (request.content.length > 50 ? '...' : '')
        })
        .where(eq(chatConversations.id, conversationId));
    }
    
    return response;
  } catch (error) {
    logger.error('Error saving user message:', error);
    throw error;
  }
}

export async function createAIMessage(
  conversationId: number,
  requestId: string
): Promise<number> {
  try {
    // Create placeholder AI message for streaming
    const [newMessage] = await db
      .insert(chatMessages)
      .values({
        conversationId,
        role: 'assistant',
        content: '',
        requestId,
        isComplete: false,
        metadata: {}
      })
      .returning();
    
    return newMessage.id;
  } catch (error) {
    logger.error('Error creating AI message:', error);
    throw error;
  }
}

export async function updateAIMessage(
  messageId: number,
  content: string,
  metadata?: any,
  isComplete: boolean = false
): Promise<void> {
  try {
    await db
      .update(chatMessages)
      .set({
        content,
        metadata,
        isComplete
      })
      .where(eq(chatMessages.id, messageId));
  } catch (error) {
    logger.error('Error updating AI message:', error);
    throw error;
  }
}

export async function getConversationMessages(
  conversationId: number,
  userId: number
): Promise<MessageResponse[]> {
  try {
    // Verify conversation belongs to user
    const [conversation] = await db
      .select()
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.id, conversationId),
          eq(chatConversations.userId, userId)
        )
      )
      .limit(1);
    
    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }
    
    // Get messages ordered by creation time
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.createdAt);
    
    return messages.map(msg => ({
      id: msg.id,
      conversationId: msg.conversationId,
      role: msg.role,
      content: msg.content,
      metadata: msg.metadata,
      createdAt: msg.createdAt
    }));
  } catch (error) {
    logger.error('Error getting conversation messages:', error);
    throw error;
  }
}

// Get or find existing AI response for a user message
export async function getExistingAIResponse(
  userMessageId: number
): Promise<MessageResponse | null> {
  try {
    // Get the user message first
    const [userMessage] = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.id, userMessageId))
      .limit(1);
    
    if (!userMessage || userMessage.role !== 'user') {
      return null;
    }
    
    // Find the next AI message in the same conversation
    const [aiMessage] = await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.conversationId, userMessage.conversationId),
          eq(chatMessages.role, 'assistant')
        )
      )
      .orderBy(chatMessages.createdAt)
      .limit(1);
    
    if (!aiMessage) {
      return null;
    }
    
    // Check if this AI message is directly after the user message
    const messagesBetween = await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.conversationId, userMessage.conversationId),
          eq(chatMessages.role, 'user')
        )
      )
      .orderBy(desc(chatMessages.createdAt));
    
    // If there are other user messages after this one, the AI response isn't for this message
    const userMessageIndex = messagesBetween.findIndex(m => m.id === userMessageId);
    if (userMessageIndex > 0) {
      return null;
    }
    
    return {
      id: aiMessage.id,
      conversationId: aiMessage.conversationId,
      role: aiMessage.role,
      content: aiMessage.content,
      metadata: aiMessage.metadata,
      createdAt: aiMessage.createdAt
    };
  } catch (error) {
    logger.error('Error checking for existing AI response:', error);
    return null;
  }
}

export async function enforceMessageOrder(conversationId: number): Promise<void> {
  try {
    // Get all messages in order
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.createdAt);
    
    // Remove any duplicate consecutive messages from the same role
    let lastRole: string | null = null;
    const toDelete: number[] = [];
    
    for (const msg of messages) {
      if (msg.role === lastRole && lastRole === 'assistant') {
        // Keep only the last assistant message in a sequence
        toDelete.push(messages[messages.indexOf(msg) - 1].id);
      }
      lastRole = msg.role;
    }
    
    // Delete duplicate messages if any found
    if (toDelete.length > 0) {
      for (const id of toDelete) {
        await db
          .delete(chatMessages)
          .where(eq(chatMessages.id, id));
      }
    }
  } catch (error) {
    logger.error('Error enforcing message order:', error);
  }
}