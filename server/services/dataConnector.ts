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
      case 'square':
        return await connectToSquare(connectionData);
      case 'paypal':
        return await connectToPayPal(connectionData);
      case 'quickbooks':
        return await connectToQuickBooks(connectionData);
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
 * Connect to Square API
 */
async function connectToSquare(config: any): Promise<ConnectionResult> {
  const { apiKey, environment = 'production' } = config;
  const baseURL = environment === 'production' 
    ? 'https://connect.squareup.com/v2' 
    : 'https://connect.squareupsandbox.com/v2';
  
  // Fetch payments as sample data
  const response = await axios.get(`${baseURL}/payments`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    params: { limit: 100 },
  });

  const payments = response.data.payments || [];
  
  // Transform to flat structure
  const data = payments.map((payment: any) => ({
    id: payment.id,
    amount: payment.amount_money?.amount ? payment.amount_money.amount / 100 : 0,
    currency: payment.amount_money?.currency || 'USD',
    status: payment.status,
    source_type: payment.source_type,
    created_at: new Date(payment.created_at),
    customer_id: payment.customer_id,
    location_id: payment.location_id,
    reference_id: payment.reference_id,
    note: payment.note,
  }));

  const schema = {
    id: 'string',
    amount: 'number',
    currency: 'string',
    status: 'string',
    source_type: 'string',
    created_at: 'date',
    customer_id: 'string',
    location_id: 'string',
    reference_id: 'string',
    note: 'string',
  };

  return {
    success: true,
    data,
    schema,
    rowCount: data.length,
  };
}

/**
 * Connect to PayPal API
 */
async function connectToPayPal(config: any): Promise<ConnectionResult> {
  const { clientId, clientSecret } = config;
  
  // Get OAuth token
  const authResponse = await axios.post(
    'https://api-m.paypal.com/v1/oauth2/token',
    'grant_type=client_credentials',
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
    }
  );

  const accessToken = authResponse.data.access_token;

  // Fetch transactions
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // Last 30 days
  
  const response = await axios.get(
    'https://api-m.paypal.com/v1/reporting/transactions',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      params: {
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString(),
        page_size: 100,
      },
    }
  );

  const transactions = response.data.transaction_details || [];
  
  // Transform to flat structure
  const data = transactions.map((txn: any) => ({
    transaction_id: txn.transaction_info?.transaction_id,
    amount: parseFloat(txn.transaction_info?.transaction_amount?.value || 0),
    currency: txn.transaction_info?.transaction_amount?.currency_code,
    status: txn.transaction_info?.transaction_status,
    transaction_date: new Date(txn.transaction_info?.transaction_initiation_date),
    payer_email: txn.payer_info?.email_address,
    payer_name: txn.payer_name?.alternate_full_name,
    fee_amount: parseFloat(txn.transaction_info?.fee_amount?.value || 0),
  }));

  const schema = {
    transaction_id: 'string',
    amount: 'number',
    currency: 'string',
    status: 'string',
    transaction_date: 'date',
    payer_email: 'string',
    payer_name: 'string',
    fee_amount: 'number',
  };

  return {
    success: true,
    data,
    schema,
    rowCount: data.length,
  };
}

/**
 * Connect to QuickBooks API
 */
async function connectToQuickBooks(config: any): Promise<ConnectionResult> {
  const { companyId, apiKey } = config;
  const baseURL = 'https://sandbox-quickbooks.api.intuit.com/v3/company';
  
  // Fetch invoices as sample data
  const response = await axios.get(
    `${baseURL}/${companyId}/query?query=SELECT * FROM Invoice MAXRESULTS 100`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    }
  );

  const invoices = response.data.QueryResponse?.Invoice || [];
  
  // Transform to flat structure
  const data = invoices.map((invoice: any) => ({
    invoice_id: invoice.Id,
    invoice_number: invoice.DocNumber,
    customer_name: invoice.CustomerRef?.name,
    total_amount: parseFloat(invoice.TotalAmt || 0),
    balance: parseFloat(invoice.Balance || 0),
    due_date: invoice.DueDate ? new Date(invoice.DueDate) : null,
    created_date: new Date(invoice.MetaData?.CreateTime),
    status: invoice.Balance > 0 ? 'Open' : 'Paid',
  }));

  const schema = {
    invoice_id: 'string',
    invoice_number: 'string',
    customer_name: 'string',
    total_amount: 'number',
    balance: 'number',
    due_date: 'date',
    created_date: 'date',
    status: 'string',
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
 * Google Sheets - Handled via file upload for simplicity
 * Users download their sheets as CSV/Excel and upload them
 */
async function connectToGoogleSheets(config: any): Promise<ConnectionResult> {
  // Google Sheets is handled via file upload to avoid OAuth complexity
  // This provides a simpler user experience for small businesses
  return {
    success: false,
    error: 'Google Sheets connections work through file upload. Please download your sheet as CSV or Excel and upload it in the "Upload Files" tab.',
  };
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