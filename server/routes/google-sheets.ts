import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { storage } from '../storage';
import { 
  isGoogleSheetsConnected, 
  listSpreadsheets, 
  getSpreadsheetData, 
  getSpreadsheetMetadata 
} from '../services/googleSheetsConnector';

// Helper function to detect schema from data
function detectSchemaFromData(data: any[]): any {
  if (!data || data.length === 0) return {};
  
  const schema: any = {};
  const columns = Object.keys(data[0]);
  
  columns.forEach(col => {
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const value = data[i][col];
      if (value !== null && value !== undefined && value !== '') {
        if (!isNaN(Number(value))) {
          schema[col] = 'number';
        } else if (value === 'true' || value === 'false') {
          schema[col] = 'boolean';
        } else if (!isNaN(Date.parse(String(value)))) {
          schema[col] = 'date';
        } else {
          schema[col] = 'string';
        }
        break;
      }
    }
    if (!schema[col]) {
      schema[col] = 'string';
    }
  });
  
  return schema;
}

const router = Router();

// Check if Google Sheets is connected via Replit connector
router.get('/google-sheets/status', requireAuth, (async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isConnected = await isGoogleSheetsConnected();
    res.json({ connected: isConnected });
  } catch (error: any) {
    logger.error('Error checking Google Sheets connection status', { error: error.message });
    res.json({ connected: false });
  }
}) as any);

// List available spreadsheets
router.get('/google-sheets/spreadsheets', requireAuth, (async (req: AuthenticatedRequest, res: Response) => {
  try {
    const spreadsheets = await listSpreadsheets();
    res.json({ spreadsheets });
  } catch (error: any) {
    logger.error('Error listing spreadsheets', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to list spreadsheets' });
  }
}) as any);

// Import a specific spreadsheet
router.post('/google-sheets/import', requireAuth, (async (req: AuthenticatedRequest, res: Response) => {
  const { spreadsheetId, sheetName } = req.body;
  const userId = req.user.id;

  if (!spreadsheetId) {
    return res.status(400).json({ error: 'Spreadsheet ID is required' });
  }

  try {
    logger.info('Importing Google Sheet', { userId, spreadsheetId, sheetName });

    // Get spreadsheet metadata
    const metadata = await getSpreadsheetMetadata(spreadsheetId);
    const spreadsheetTitle = metadata.title || 'Untitled Spreadsheet';

    // Determine which sheet to import
    let rangeToFetch = sheetName ? `${sheetName}!A1:ZZ` : 'A1:ZZ';
    
    // Fetch spreadsheet data
    const rawData = await getSpreadsheetData(spreadsheetId, rangeToFetch);

    if (!rawData || rawData.length === 0) {
      return res.status(400).json({ error: 'Spreadsheet is empty or no data found' });
    }

    // First row is headers
    const headers = rawData[0];
    const dataRows = rawData.slice(1);

    if (dataRows.length === 0) {
      return res.status(400).json({ error: 'No data rows found (only headers)' });
    }

    // Convert rows to objects
    const structuredData = dataRows.map((row: any[]) => {
      const obj: any = {};
      headers.forEach((header: string, index: number) => {
        obj[header] = row[index] || null;
      });
      return obj;
    });

    // Detect schema from the structured data
    const schema = detectSchemaFromData(structuredData);
    
    // For now, store data count (we can add S3 upload later if needed)
    const rowCount = structuredData.length;

    // Store the data in our database (data_rows table)
    const dataSource = await storage.createDataSource({
      userId,
      name: sheetName ? `${spreadsheetTitle} - ${sheetName}` : spreadsheetTitle,
      type: 'google_sheets',
      connectionType: 'live', // This is a live connection
      schema,
      rowCount,
      lastSyncAt: new Date(),
      connectionData: {
        spreadsheetId,
        sheetName: sheetName || metadata.sheets[0]?.title || 'Sheet1',
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
      }
    });
    
    // Insert the actual data rows
    await storage.insertDataRows(dataSource.id, structuredData);

    logger.info('Google Sheet imported successfully', {
      userId,
      dataSourceId: dataSource.id,
      spreadsheetId,
      rowCount
    });

    res.json({
      success: true,
      dataSource: {
        id: dataSource.id,
        name: dataSource.name,
        type: dataSource.type,
        rowCount: dataSource.rowCount,
        schema: dataSource.schema,
      }
    });
  } catch (error: any) {
    logger.error('Google Sheets import error', { 
      error: error.message, 
      userId, 
      spreadsheetId 
    });
    res.status(500).json({ error: error.message || 'Failed to import spreadsheet' });
  }
}) as any);

export default router;
