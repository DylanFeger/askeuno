import axios from 'axios';
import { createConnection } from 'mysql2/promise';
import { Client as PgClient } from 'pg';
import { MongoClient } from 'mongodb';
import { google } from 'googleapis';
import { logger } from '../utils/logger';

export interface ConnectionResult {
  success: boolean;
  data?: any[];
  schema?: Record<string, string>;
  rowCount?: number;
  error?: string;
}

/**
 * Connect to various data sources and fetch data
 */
export async function connectToDataSource(
  type: string,
  connectionData: any
): Promise<ConnectionResult> {
  try {
    switch (type.toLowerCase()) {
      // Databases
      case 'mysql':
        return await connectToMySQL(connectionData);
      case 'postgresql':
        return await connectToPostgreSQL(connectionData);
      case 'mongodb':
        return await connectToMongoDB(connectionData);
      
      // APIs
      case 'shopify':
        return await connectToShopify(connectionData);
      case 'stripe':
        return await connectToStripe(connectionData);
      case 'googleads':
        return await connectToGoogleAds(connectionData);
      case 'salesforce':
        return await connectToSalesforce(connectionData);
      
      // Cloud Storage
      case 'googlesheets':
        return await connectToGoogleSheets(connectionData);
      
      // Generic API
      case 'api':
      case 'rest':
        return await connectToGenericAPI(connectionData);
      
      default:
        return {
          success: false,
          error: `Unsupported data source type: ${type}`,
        };
    }
  } catch (error) {
    logger.error('Data connection error', { type, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Connect to MySQL database
 */
async function connectToMySQL(config: any): Promise<ConnectionResult> {
  const connection = await createConnection({
    host: config.host,
    port: config.port || 3306,
    user: config.username,
    password: config.password,
    database: config.database,
  });

  try {
    // Test connection and get sample data
    const [rows] = await connection.execute(
      config.query || `SELECT * FROM ${config.table || 'users'} LIMIT 100`
    );

    // Get schema information
    const [schemaRows] = await connection.execute(
      `DESCRIBE ${config.table || 'users'}`
    );

    const schema: Record<string, string> = {};
    (schemaRows as any[]).forEach(col => {
      schema[col.Field] = col.Type;
    });

    return {
      success: true,
      data: rows as any[],
      schema,
      rowCount: (rows as any[]).length,
    };
  } finally {
    await connection.end();
  }
}

/**
 * Connect to PostgreSQL database
 */
async function connectToPostgreSQL(config: any): Promise<ConnectionResult> {
  const client = new PgClient({
    host: config.host,
    port: config.port || 5432,
    user: config.username,
    password: config.password,
    database: config.database,
  });

  await client.connect();

  try {
    // Test connection and get sample data
    const result = await client.query(
      config.query || `SELECT * FROM ${config.table || 'users'} LIMIT 100`
    );

    // Get schema information
    const schemaResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1
    `, [config.table || 'users']);

    const schema: Record<string, string> = {};
    schemaResult.rows.forEach(col => {
      schema[col.column_name] = col.data_type;
    });

    return {
      success: true,
      data: result.rows,
      schema,
      rowCount: result.rows.length,
    };
  } finally {
    await client.end();
  }
}

/**
 * Connect to MongoDB
 */
async function connectToMongoDB(config: any): Promise<ConnectionResult> {
  const uri = config.connectionString || 
    `mongodb://${config.username}:${config.password}@${config.host}:${config.port || 27017}/${config.database}`;
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db(config.database);
    const collection = db.collection(config.collection || 'users');
    
    // Get sample data
    const data = await collection.find({}).limit(100).toArray();
    
    // Infer schema from sample data
    const schema: Record<string, string> = {};
    if (data.length > 0) {
      Object.keys(data[0]).forEach(key => {
        schema[key] = typeof data[0][key];
      });
    }

    return {
      success: true,
      data,
      schema,
      rowCount: data.length,
    };
  } finally {
    await client.close();
  }
}

/**
 * Connect to Shopify API
 */
async function connectToShopify(config: any): Promise<ConnectionResult> {
  const { shopDomain, apiKey, password } = config;
  const baseURL = `https://${apiKey}:${password}@${shopDomain}/admin/api/2024-01`;

  // Fetch orders as sample data
  const response = await axios.get(`${baseURL}/orders.json`, {
    params: { limit: 100 },
  });

  const orders = response.data.orders;
  
  // Transform to flat structure
  const data = orders.map((order: any) => ({
    id: order.id,
    order_number: order.order_number,
    total_price: parseFloat(order.total_price),
    currency: order.currency,
    customer_email: order.email,
    created_at: new Date(order.created_at),
    updated_at: new Date(order.updated_at),
    line_items_count: order.line_items?.length || 0,
    financial_status: order.financial_status,
    fulfillment_status: order.fulfillment_status,
  }));

  const schema = {
    id: 'string',
    order_number: 'string',
    total_price: 'number',
    currency: 'string',
    customer_email: 'string',
    created_at: 'date',
    updated_at: 'date',
    line_items_count: 'number',
    financial_status: 'string',
    fulfillment_status: 'string',
  };

  return {
    success: true,
    data,
    schema,
    rowCount: data.length,
  };
}

/**
 * Connect to Stripe API
 */
async function connectToStripe(config: any): Promise<ConnectionResult> {
  const { apiKey } = config;
  
  const response = await axios.get('https://api.stripe.com/v1/charges', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    params: { limit: 100 },
  });

  const charges = response.data.data;
  
  // Transform to flat structure
  const data = charges.map((charge: any) => ({
    id: charge.id,
    amount: charge.amount / 100, // Convert cents to dollars
    currency: charge.currency,
    status: charge.status,
    customer: charge.customer,
    description: charge.description,
    created_at: new Date(charge.created * 1000),
    paid: charge.paid,
    refunded: charge.refunded,
  }));

  const schema = {
    id: 'string',
    amount: 'number',
    currency: 'string',
    status: 'string',
    customer: 'string',
    description: 'string',
    created_at: 'date',
    paid: 'boolean',
    refunded: 'boolean',
  };

  return {
    success: true,
    data,
    schema,
    rowCount: data.length,
  };
}

/**
 * Connect to Google Ads API
 */
async function connectToGoogleAds(config: any): Promise<ConnectionResult> {
  // This is a simplified example - real Google Ads API requires OAuth2
  const { customerId, developerToken, refreshToken } = config;
  
  // Mock implementation - replace with actual Google Ads API
  return {
    success: true,
    data: [
      {
        campaign_id: '123',
        campaign_name: 'Summer Sale',
        impressions: 10000,
        clicks: 500,
        cost: 250.00,
        conversions: 25,
        date: new Date(),
      }
    ],
    schema: {
      campaign_id: 'string',
      campaign_name: 'string',
      impressions: 'number',
      clicks: 'number',
      cost: 'number',
      conversions: 'number',
      date: 'date',
    },
    rowCount: 1,
  };
}

/**
 * Connect to Salesforce API
 */
async function connectToSalesforce(config: any): Promise<ConnectionResult> {
  const { instanceUrl, accessToken } = config;
  
  // Query accounts as sample data
  const response = await axios.get(
    `${instanceUrl}/services/data/v59.0/query`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      params: {
        q: 'SELECT Id, Name, Type, Industry, AnnualRevenue FROM Account LIMIT 100',
      },
    }
  );

  const accounts = response.data.records;
  
  const data = accounts.map((account: any) => ({
    id: account.Id,
    name: account.Name,
    type: account.Type,
    industry: account.Industry,
    annual_revenue: account.AnnualRevenue,
  }));

  const schema = {
    id: 'string',
    name: 'string',
    type: 'string',
    industry: 'string',
    annual_revenue: 'number',
  };

  return {
    success: true,
    data,
    schema,
    rowCount: data.length,
  };
}

/**
 * Connect to Google Sheets
 */
async function connectToGoogleSheets(config: any): Promise<ConnectionResult> {
  const { spreadsheetId, sheetName } = config;
  
  // For now, Google Sheets requires OAuth authentication which is complex to set up
  // Return a helpful error message
  if (!spreadsheetId) {
    return {
      success: false,
      error: 'Please provide a valid Google Sheets ID',
    };
  }

  // Temporary implementation notice
  return {
    success: false,
    error: 'Google Sheets integration requires Google OAuth setup. For now, please download your sheet as CSV or Excel and upload it instead. Full Google Sheets integration is coming soon!',
  };

  // Future implementation will use proper OAuth flow
  // const auth = new google.auth.GoogleAuth({
  //   credentials,
  //   scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  // });

  // const sheets = google.sheets({ version: 'v4', auth });
  
  // const response = await sheets.spreadsheets.values.get({
  //   spreadsheetId,
  //   range: `${sheetName || 'Sheet1'}!A:Z`,
  // });

  // const rows = response.data.values || [];
  // if (rows.length === 0) {
  //   return {
  //     success: true,
  //     data: [],
  //     schema: {},
  //     rowCount: 0,
  //   };
  // }

  // // First row as headers
  // const headers = rows[0];
  // const data = rows.slice(1).map(row => {
  //   const obj: any = {};
  //   headers.forEach((header, index) => {
  //     obj[header] = row[index] || null;
  //   });
  //   return obj;
  // });

  // // Infer schema
  // const schema: Record<string, string> = {};
  // headers.forEach(header => {
  //   schema[header] = 'string'; // Default to string
  // });

  // return {
  //   success: true,
  //   data,
  //   schema,
  //   rowCount: data.length,
  // };
}

/**
 * Connect to generic REST API
 */
async function connectToGenericAPI(config: any): Promise<ConnectionResult> {
  const { url, method = 'GET', headers = {}, params = {}, data: body } = config;
  
  const response = await axios({
    method,
    url,
    headers,
    params,
    data: body,
  });

  let data = response.data;
  
  // Handle different response structures
  if (Array.isArray(data)) {
    // Already an array
  } else if (data.data && Array.isArray(data.data)) {
    data = data.data;
  } else if (data.results && Array.isArray(data.results)) {
    data = data.results;
  } else if (data.items && Array.isArray(data.items)) {
    data = data.items;
  } else {
    // Single object, wrap in array
    data = [data];
  }

  // Infer schema from first item
  const schema: Record<string, string> = {};
  if (data.length > 0) {
    Object.keys(data[0]).forEach(key => {
      const value = data[0][key];
      if (value instanceof Date) {
        schema[key] = 'date';
      } else if (typeof value === 'number') {
        schema[key] = 'number';
      } else if (typeof value === 'boolean') {
        schema[key] = 'boolean';
      } else {
        schema[key] = 'string';
      }
    });
  }

  return {
    success: true,
    data,
    schema,
    rowCount: data.length,
  };
}