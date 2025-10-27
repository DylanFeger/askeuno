import { db } from "../db";
import { dataSources, dataRows } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "../utils/logger";

export interface DataSourceInfo {
  active: boolean;
  type?: "sql" | "file";
  handle?: any;
  tables?: any[]; // Array of {name, columns} objects
  totalRows?: number;
  reason?: string;
}

export async function getActiveDataSource(userId: number): Promise<DataSourceInfo> {
  try {
    // Get user's data sources
    const sources = await db
      .select()
      .from(dataSources)
      .where(and(
        eq(dataSources.userId, userId),
        eq(dataSources.status, 'active')
      ))
      .limit(1);

    if (!sources || sources.length === 0) {
      return {
        active: false,
        reason: "no_source"
      };
    }

    const source = sources[0];
    
    // Check if it's a file upload or SQL connection
    const sourceType = source.connectionType === 'upload' ? 'file' : 'sql';
    
    // For file uploads, check if we have data rows
    if (sourceType === 'file') {
      const rowCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(dataRows)
        .where(eq(dataRows.dataSourceId, source.id));
      
      if (!rowCount || rowCount[0].count === 0) {
        return {
          active: false,
          reason: "empty_source"
        };
      }
      
      // Get schema and format as tables with columns
      const schema = source.schema as any;
      
      // Format schema as table with columns for SQL generation
      const tables = [{
        name: source.name.toLowerCase().replace(/\s+/g, '_') || 'data',
        columns: schema || {}
      }];
      
      // Log for debugging
      logger.info('Active data source retrieved', {
        userId,
        sourceId: source.id,
        sourceName: source.name,
        rowCount: rowCount[0].count,
        columnCount: schema ? Object.keys(schema).length : 0,
        columns: schema ? Object.keys(schema).map(k => (schema as any)[k]?.name) : []
      });
      
      return {
        active: true,
        type: "file",
        handle: source.id,
        tables: tables,
        totalRows: rowCount[0].count
      };
    }
    
    // For SQL connections
    return {
      active: true,
      type: "sql",
      handle: source.connectionData,
      tables: ['connected_database'] // This would be populated from actual connection
    };
    
  } catch (error) {
    logger.error("Error getting active data source:", error);
    return {
      active: false,
      reason: "error"
    };
  }
}

export async function runSQL(
  dataSource: DataSourceInfo,
  sqlQuery: string
): Promise<{ rows: any[]; rowCount: number; tables: string[] }> {
  try {
    // Validate SQL - only allow SELECT and WITH
    const upperSQL = sqlQuery.toUpperCase().trim();
    const forbiddenKeywords = [
      'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 
      'ALTER', 'TRUNCATE', 'PRAGMA', 'GRANT', 'REVOKE'
    ];
    
    for (const keyword of forbiddenKeywords) {
      if (upperSQL.includes(keyword)) {
        throw new Error(`Forbidden SQL operation: ${keyword}`);
      }
    }
    
    // Ensure LIMIT is present and <= 5000
    if (!upperSQL.includes('LIMIT')) {
      sqlQuery += ' LIMIT 5000';
    } else {
      // Check if limit is reasonable
      const limitMatch = upperSQL.match(/LIMIT\s+(\d+)/);
      if (limitMatch && parseInt(limitMatch[1]) > 5000) {
        sqlQuery = sqlQuery.replace(/LIMIT\s+\d+/i, 'LIMIT 5000');
      }
    }
    
    if (dataSource.type === 'file') {
      // For file-based data, query from dataRows table
      const sourceId = dataSource.handle;
      
      // This is a simplified implementation
      // In production, you'd translate the SQL to work with the dataRows table
      const rows = await db
        .select()
        .from(dataRows)
        .where(eq(dataRows.dataSourceId, sourceId))
        .limit(5000);
      
      return {
        rows: rows.map(r => r.rowData),
        rowCount: rows.length,
        tables: ['data']
      };
    }
    
    // For SQL connections, you would execute against the actual database
    // This is a placeholder implementation
    return {
      rows: [],
      rowCount: 0,
      tables: []
    };
    
  } catch (error) {
    logger.error("Error executing SQL:", error);
    throw error;
  }
}