import { 
  users, 
  dataSources, 
  chatConversations, 
  chatMessages, 
  dataRows,
  blogPosts,
  type User, 
  type InsertUser,
  type DataSource,
  type InsertDataSource,
  type ChatConversation,
  type ChatMessage,
  type InsertChatMessage,
  type DataRow,
  type BlogPost,
  type InsertBlogPost
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByApiToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  // Query tracking operations
  incrementUserQueryCount(userId: number): Promise<void>;
  resetUserQueryCount(userId: number): Promise<void>;
  checkAndResetQueryCount(userId: number): Promise<User | undefined>;
  
  // Data source operations
  createDataSource(dataSource: InsertDataSource & { userId: number }): Promise<DataSource>;
  getDataSourcesByUserId(userId: number): Promise<DataSource[]>;
  getDataSourcesByType(type: string): Promise<DataSource[]>;
  getDataSource(id: number): Promise<DataSource | undefined>;
  getDataSourceByNameAndUser(name: string, userId: number): Promise<DataSource | undefined>;
  updateDataSource(id: number, updates: Partial<DataSource>): Promise<DataSource | undefined>;
  deleteDataSource(id: number): Promise<void>;
  getAllActiveDataSources(): Promise<DataSource[]>; // For sync job initialization
  
  // Chat operations
  createConversation(userId: number, dataSourceId?: number): Promise<ChatConversation>;
  getConversation(id: number): Promise<ChatConversation | undefined>;
  updateConversation(id: number, updates: Partial<ChatConversation>): Promise<ChatConversation | undefined>;
  getConversationsByUserId(userId: number): Promise<ChatConversation[]>;
  getConversationsByDataSourceId(dataSourceId: number): Promise<ChatConversation[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getMessagesByConversationId(conversationId: number): Promise<ChatMessage[]>;
  deleteConversationsByDataSourceId(dataSourceId: number): Promise<void>;
  
  // Data rows operations
  insertDataRows(dataSourceId: number, rows: any[]): Promise<void>;
  getDataRows(dataSourceId: number, limit?: number): Promise<DataRow[]>;
  queryDataRows(dataSourceId: number, query: string): Promise<any[]>;
  clearDataRows(dataSourceId: number): Promise<void>;
  getDataRowsWithSource(userId: number, dataSourceId?: number): Promise<{ rows: any[], source: DataSource | null }>;
  
  // Blog operations
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  getBlogPostBySlug(slug: string): Promise<BlogPost | undefined>;
  getBlogPostById(id: number): Promise<BlogPost | undefined>;
  getAllBlogPosts(): Promise<BlogPost[]>;
  getBlogPostsByCategory(category: string): Promise<BlogPost[]>;
  updateBlogPost(id: number, updates: Partial<BlogPost>): Promise<BlogPost | undefined>;
  deleteBlogPost(id: number): Promise<void>;
  searchBlogPosts(query: string): Promise<BlogPost[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByApiToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.apiToken, token));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // Query tracking operations
  async incrementUserQueryCount(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ monthlyQueryCount: sql`${users.monthlyQueryCount} + 1` })
      .where(eq(users.id, userId));
  }

  async resetUserQueryCount(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ 
        monthlyQueryCount: 0,
        queryResetDate: new Date()
      })
      .where(eq(users.id, userId));
  }

  async checkAndResetQueryCount(userId: number): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;

    // Check if we need to reset the query count (new month)
    const now = new Date();
    const resetDate = new Date(user.queryResetDate || now);
    
    if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
      await this.resetUserQueryCount(userId);
      return await this.getUser(userId);
    }
    
    return user;
  }

  // Data source operations
  async createDataSource(dataSource: InsertDataSource & { userId: number }): Promise<DataSource> {
    const [source] = await db
      .insert(dataSources)
      .values(dataSource)
      .returning();
    return source;
  }

  async getDataSourcesByUserId(userId: number): Promise<DataSource[]> {
    return await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.userId, userId))
      .orderBy(desc(dataSources.createdAt));
  }

  async getDataSourcesByType(type: string): Promise<DataSource[]> {
    return await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.type, type))
      .orderBy(desc(dataSources.createdAt));
  }

  async getDataSource(id: number): Promise<DataSource | undefined> {
    const [source] = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.id, id));
    return source || undefined;
  }

  async getDataSourceByNameAndUser(name: string, userId: number): Promise<DataSource | undefined> {
    const [source] = await db
      .select()
      .from(dataSources)
      .where(and(eq(dataSources.name, name), eq(dataSources.userId, userId)));
    return source || undefined;
  }

  async updateDataSource(id: number, updates: Partial<DataSource>): Promise<DataSource | undefined> {
    const [source] = await db
      .update(dataSources)
      .set(updates)
      .where(eq(dataSources.id, id))
      .returning();
    return source || undefined;
  }

  // Chat operations
  async createConversation(userId: number, dataSourceId?: number): Promise<ChatConversation> {
    const [conversation] = await db
      .insert(chatConversations)
      .values({ userId, dataSourceId })
      .returning();
    return conversation;
  }

  async getConversation(id: number): Promise<ChatConversation | undefined> {
    const [conversation] = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.id, id));
    return conversation || undefined;
  }

  async updateConversation(id: number, updates: Partial<ChatConversation>): Promise<ChatConversation | undefined> {
    const [conversation] = await db
      .update(chatConversations)
      .set(updates)
      .where(eq(chatConversations.id, id))
      .returning();
    return conversation || undefined;
  }

  async getConversationsByUserId(userId: number): Promise<ChatConversation[]> {
    return await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.userId, userId))
      .orderBy(desc(chatConversations.createdAt));
  }

  async getConversationsByDataSourceId(dataSourceId: number): Promise<ChatConversation[]> {
    if (!dataSourceId) {
      return [];
    }
    
    try {
      return await db
        .select()
        .from(chatConversations)
        .where(eq(chatConversations.dataSourceId, dataSourceId))
        .orderBy(desc(chatConversations.createdAt));
    } catch (error) {
      console.error('Error getting conversations by data source:', error);
      return [];
    }
  }

  async deleteConversationsByDataSourceId(dataSourceId: number): Promise<void> {
    try {
      // First get all conversations to delete their messages
      const conversations = await this.getConversationsByDataSourceId(dataSourceId);
      
      // Delete all messages for these conversations
      if (conversations.length > 0) {
        const conversationIds = conversations.map(c => c.id);
        for (const convId of conversationIds) {
          await db.delete(chatMessages).where(eq(chatMessages.conversationId, convId));
        }
      }
      
      // Delete all conversations - handle nullable dataSourceId
      if (dataSourceId) {
        await db.delete(chatConversations).where(eq(chatConversations.dataSourceId, dataSourceId));
      }
    } catch (error) {
      console.error('Error deleting conversations by data source:', error);
      // Continue with deletion even if conversations fail
    }
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [chatMessage] = await db
      .insert(chatMessages)
      .values(message)
      .returning();
    return chatMessage;
  }

  async getMessagesByConversationId(conversationId: number): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.createdAt);
  }

  // Data rows operations
  async insertDataRows(dataSourceId: number, rows: any[]): Promise<void> {
    if (rows.length === 0) return;
    
    // Insert in batches to avoid protocol errors
    const BATCH_SIZE = 100;
    
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const dataRowsToInsert = batch.map(row => {
        // Clean the row data to ensure valid JSON
        const cleanedRow = JSON.parse(JSON.stringify(row));
        return {
          dataSourceId,
          rowData: cleanedRow
        };
      });
      
      try {
        await db.insert(dataRows).values(dataRowsToInsert);
      } catch (error: any) {
        console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, error);
        throw new Error(`Failed to insert data rows at batch ${i / BATCH_SIZE + 1}: ${error.message}`);
      }
    }
  }

  async getDataRows(dataSourceId: number, limit: number = 100): Promise<DataRow[]> {
    return await db
      .select()
      .from(dataRows)
      .where(eq(dataRows.dataSourceId, dataSourceId))
      .limit(limit);
  }

  async queryDataRows(dataSourceId: number, query: string): Promise<any[]> {
    // This would typically involve more complex SQL generation
    // For now, return basic data
    const rows = await this.getDataRows(dataSourceId);
    return rows.map(row => row.rowData);
  }

  async deleteDataSource(id: number): Promise<void> {
    // Delete associated conversations and their messages first
    await this.deleteConversationsByDataSourceId(id);
    // Delete associated data rows
    await db.delete(dataRows).where(eq(dataRows.dataSourceId, id));
    // Then delete the data source
    await db.delete(dataSources).where(eq(dataSources.id, id));
  }

  async clearDataRows(dataSourceId: number): Promise<void> {
    await db.delete(dataRows).where(eq(dataRows.dataSourceId, dataSourceId));
  }

  async getAllActiveDataSources(): Promise<DataSource[]> {
    return await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.status, 'active'))
      .orderBy(desc(dataSources.createdAt));
  }

  async getDataRowsWithSource(userId: number, dataSourceId?: number): Promise<{ rows: any[], source: DataSource | null }> {
    // Get user's data sources
    const sources = await this.getDataSourcesByUserId(userId);
    if (sources.length === 0) {
      return { rows: [], source: null };
    }

    // Use specified data source or the most recent one
    const targetSourceId = dataSourceId || sources[0].id;
    const source = sources.find(s => s.id === targetSourceId);
    
    if (!source) {
      return { rows: [], source: null };
    }

    const rows = await this.queryDataRows(source.id, '');
    return { rows, source };
  }

  // Blog operations
  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    const [blogPost] = await db
      .insert(blogPosts)
      .values(post)
      .returning();
    return blogPost;
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug));
    return post || undefined;
  }

  async getBlogPostById(id: number): Promise<BlogPost | undefined> {
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id));
    return post || undefined;
  }

  async getAllBlogPosts(): Promise<BlogPost[]> {
    return await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.status, 'published'))
      .orderBy(desc(blogPosts.publishedDate));
  }

  async getBlogPostsByCategory(category: string): Promise<BlogPost[]> {
    return await db
      .select()
      .from(blogPosts)
      .where(and(
        eq(blogPosts.category, category),
        eq(blogPosts.status, 'published')
      ))
      .orderBy(desc(blogPosts.publishedDate));
  }

  async updateBlogPost(id: number, updates: Partial<BlogPost>): Promise<BlogPost | undefined> {
    const [post] = await db
      .update(blogPosts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(blogPosts.id, id))
      .returning();
    return post || undefined;
  }

  async deleteBlogPost(id: number): Promise<void> {
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
  }

  async searchBlogPosts(query: string): Promise<BlogPost[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    return await db
      .select()
      .from(blogPosts)
      .where(and(
        eq(blogPosts.status, 'published'),
        sql`(LOWER(${blogPosts.title}) LIKE ${searchTerm} OR LOWER(${blogPosts.content}) LIKE ${searchTerm})`
      ))
      .orderBy(desc(blogPosts.publishedDate));
  }
}

export const storage = new DatabaseStorage();
