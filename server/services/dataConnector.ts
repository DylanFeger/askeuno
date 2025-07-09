import mysql from 'mysql2/promise';
import { Pool } from 'pg';
import { MongoClient } from 'mongodb';
import axios from 'axios';
import { analyzeDataSchema } from './openai';
import { logger } from '../utils/logger';

export interface ConnectionResult {
  success: boolean;
  data?: any[];
  schema?: any;
  rowCount?: number;
  error?: string;
}

export async function connectToDataSource(
  type: string,
  connectionData: any
): Promise<ConnectionResult> {
  try {
    switch (type) {
      case 'mysql':
        return await connectToMySQL(connectionData);
      case 'postgres':
        return await connectToPostgreSQL(connectionData);
      case 'mongodb':
        return await connectToMongoDB(connectionData);
      case 'api':
        return await connectToAPI(connectionData);
      case 'googlesheets':
        return await connectToGoogleSheets(connectionData);
      case 'salesforce':
        return await connectToSalesforce(connectionData);
      case 'shopify':
        return await connectToShopify(connectionData);
      default:
        return { success: false, error: `Unsupported data source type: ${type}` };
    }
  } catch (error: any) {
    logger.error('Data connection error', { type, error: error.message });
    return { success: false, error: error.message };
  }
}

async function connectToMySQL(config: any): Promise<ConnectionResult> {
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port || 3306,
    user: config.username,
    password: config.password,
    database: config.database,
  });

  try {
    // Test connection and get sample data
    const [rows] = await connection.execute(
      'SELECT * FROM information_schema.tables WHERE table_schema = ?',
      [config.database]
    );

    // Get data from the first table if exists
    if (rows && (rows as any[]).length > 0) {
      const tableName = (rows as any[])[0].TABLE_NAME;
      const [tableData] = await connection.execute(
        `SELECT * FROM ?? LIMIT 1000`,
        [tableName]
      );

      const data = tableData as any[];
      const schema = await analyzeDataSchema(data);

      return {
        success: true,
        data,
        schema,
        rowCount: data.length,
      };
    }

    return { success: true, data: [], rowCount: 0 };
  } finally {
    await connection.end();
  }
}

async function connectToPostgreSQL(config: any): Promise<ConnectionResult> {
  const pool = new Pool({
    host: config.host,
    port: config.port || 5432,
    user: config.username,
    password: config.password,
    database: config.database,
  });

  try {
    // Test connection
    const client = await pool.connect();
    
    // Get tables
    const tablesResult = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
    );

    if (tablesResult.rows.length > 0) {
      const tableName = tablesResult.rows[0].tablename;
      const dataResult = await client.query(
        `SELECT * FROM ${tableName} LIMIT 1000`
      );

      const data = dataResult.rows;
      const schema = await analyzeDataSchema(data);

      client.release();
      return {
        success: true,
        data,
        schema,
        rowCount: data.length,
      };
    }

    client.release();
    return { success: true, data: [], rowCount: 0 };
  } finally {
    await pool.end();
  }
}

async function connectToMongoDB(config: any): Promise<ConnectionResult> {
  const client = new MongoClient(config.connectionString);

  try {
    await client.connect();
    const db = client.db();
    
    // Get first collection
    const collections = await db.listCollections().toArray();
    if (collections.length > 0) {
      const collection = db.collection(collections[0].name);
      const data = await collection.find({}).limit(1000).toArray();
      
      const schema = await analyzeDataSchema(data);

      return {
        success: true,
        data,
        schema,
        rowCount: data.length,
      };
    }

    return { success: true, data: [], rowCount: 0 };
  } finally {
    await client.close();
  }
}

async function connectToAPI(config: any): Promise<ConnectionResult> {
  const headers = config.headers ? JSON.parse(config.headers) : {};
  
  const response = await axios({
    method: config.method || 'GET',
    url: config.endpoint,
    headers,
    timeout: 30000,
  });

  let data = response.data;
  
  // Handle different response formats
  if (Array.isArray(data)) {
    // Already an array
  } else if (data.data && Array.isArray(data.data)) {
    data = data.data;
  } else if (data.results && Array.isArray(data.results)) {
    data = data.results;
  } else if (typeof data === 'object') {
    data = [data];
  }

  const schema = await analyzeDataSchema(data);

  return {
    success: true,
    data: data.slice(0, 1000),
    schema,
    rowCount: data.length,
  };
}

async function connectToGoogleSheets(config: any): Promise<ConnectionResult> {
  // This would require Google Sheets API integration
  // For now, return a placeholder
  return {
    success: false,
    error: 'Google Sheets integration requires OAuth setup',
  };
}

async function connectToSalesforce(config: any): Promise<ConnectionResult> {
  // This would require Salesforce API integration
  const headers = {
    'Authorization': `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
  };

  const response = await axios({
    method: 'GET',
    url: `https://${config.domain}/services/data/v54.0/query`,
    params: {
      q: 'SELECT Id, Name FROM Account LIMIT 1000',
    },
    headers,
    timeout: 30000,
  });

  const data = response.data.records;
  const schema = await analyzeDataSchema(data);

  return {
    success: true,
    data,
    schema,
    rowCount: data.length,
  };
}

async function connectToShopify(config: any): Promise<ConnectionResult> {
  const headers = {
    'X-Shopify-Access-Token': config.apiKey,
    'Content-Type': 'application/json',
  };

  const response = await axios({
    method: 'GET',
    url: `https://${config.domain}/admin/api/2023-07/orders.json`,
    params: {
      limit: 250,
    },
    headers,
    timeout: 30000,
  });

  const data = response.data.orders;
  const schema = await analyzeDataSchema(data);

  return {
    success: true,
    data,
    schema,
    rowCount: data.length,
  };
}