import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  subscriptionTier: text("subscription_tier").notNull().default("starter"), // starter, professional, enterprise
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dataSources = pgTable("data_sources", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // mysql, postgres, mongodb, salesforce, shopify, googleads, googlesheets, s3, api, csv, excel, json
  connectionType: text("connection_type").notNull().default("file"), // 'live' or 'file'
  filePath: text("file_path"), // for uploaded files
  connectionData: jsonb("connection_data"), // encrypted connection config
  schema: jsonb("schema"), // detected data schema
  rowCount: integer("row_count").default(0),
  status: text("status").default("active"), // active, error, syncing
  lastSyncAt: timestamp("last_sync_at"),
  syncFrequency: integer("sync_frequency"), // minutes between syncs
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatConversations = pgTable("chat_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  dataSourceId: integer("data_source_id").references(() => dataSources.id),
  title: text("title"), // AI-generated conversation title
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => chatConversations.id).notNull(),
  role: text("role").notNull(), // user, assistant
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // query results, charts, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dataRows = pgTable("data_rows", {
  id: serial("id").primaryKey(),
  dataSourceId: integer("data_source_id").references(() => dataSources.id).notNull(),
  rowData: jsonb("row_data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dashboards = pgTable("dashboards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  widgets: jsonb("widgets"), // chart configs, KPIs, tables
  layout: jsonb("layout"), // grid layout
  isPublic: boolean("is_public").default(false),
  shareToken: text("share_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  dataSourceId: integer("data_source_id").references(() => dataSources.id).notNull(),
  name: text("name").notNull(),
  condition: jsonb("condition").notNull(), // { field, operator, value }
  frequency: text("frequency").notNull(), // 'realtime', 'hourly', 'daily'
  recipients: jsonb("recipients").notNull(), // email addresses
  isActive: boolean("is_active").default(true),
  lastTriggeredAt: timestamp("last_triggered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  dataSources: many(dataSources),
  chatConversations: many(chatConversations),
}));

export const dataSourcesRelations = relations(dataSources, ({ one, many }) => ({
  user: one(users, {
    fields: [dataSources.userId],
    references: [users.id],
  }),
  dataRows: many(dataRows),
  conversations: many(chatConversations),
}));

export const chatConversationsRelations = relations(chatConversations, ({ one, many }) => ({
  user: one(users, {
    fields: [chatConversations.userId],
    references: [users.id],
  }),
  dataSource: one(dataSources, {
    fields: [chatConversations.dataSourceId],
    references: [dataSources.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(chatConversations, {
    fields: [chatMessages.conversationId],
    references: [chatConversations.id],
  }),
}));

export const dataRowsRelations = relations(dataRows, ({ one }) => ({
  dataSource: one(dataSources, {
    fields: [dataRows.dataSourceId],
    references: [dataSources.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
});

export const insertDataSourceSchema = createInsertSchema(dataSources).pick({
  name: true,
  type: true,
  connectionType: true,
  filePath: true,
  connectionData: true,
  schema: true,
  rowCount: true,
  status: true,
  lastSyncAt: true,
  syncFrequency: true,
  errorMessage: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  conversationId: true,
  role: true,
  content: true,
  metadata: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type DataSource = typeof dataSources.$inferSelect;
export type InsertDataSource = z.infer<typeof insertDataSourceSchema>;
export type ChatConversation = typeof chatConversations.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type DataRow = typeof dataRows.$inferSelect;
