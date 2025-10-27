import { google } from 'googleapis';
import { logger } from '../utils/logger';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-sheet',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Sheet not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGoogleSheetClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.sheets({ version: 'v4', auth: oauth2Client });
}

// Check if Google Sheets is connected
export async function isGoogleSheetsConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch (error) {
    return false;
  }
}

// List all spreadsheets accessible to the user
export async function listSpreadsheets() {
  try {
    const accessToken = await getAccessToken();
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet'",
      pageSize: 100,
      fields: 'files(id, name, modifiedTime, webViewLink)',
      orderBy: 'modifiedTime desc'
    });
    
    return response.data.files || [];
  } catch (error: any) {
    logger.error('Error listing spreadsheets', { error: error.message });
    throw new Error('Failed to list spreadsheets');
  }
}

// Get spreadsheet data
export async function getSpreadsheetData(spreadsheetId: string, range: string = 'A1:ZZ') {
  try {
    const sheets = await getUncachableGoogleSheetClient();
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    
    return response.data.values || [];
  } catch (error: any) {
    logger.error('Error fetching spreadsheet data', { 
      spreadsheetId, 
      range,
      error: error.message 
    });
    throw new Error('Failed to fetch spreadsheet data');
  }
}

// Get spreadsheet metadata (title, sheets, etc.)
export async function getSpreadsheetMetadata(spreadsheetId: string) {
  try {
    const sheets = await getUncachableGoogleSheetClient();
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    
    return {
      title: response.data.properties?.title,
      sheets: response.data.sheets?.map(sheet => ({
        title: sheet.properties?.title,
        sheetId: sheet.properties?.sheetId,
        index: sheet.properties?.index,
        rowCount: sheet.properties?.gridProperties?.rowCount,
        columnCount: sheet.properties?.gridProperties?.columnCount,
      })) || []
    };
  } catch (error: any) {
    logger.error('Error fetching spreadsheet metadata', { 
      spreadsheetId,
      error: error.message 
    });
    throw new Error('Failed to fetch spreadsheet metadata');
  }
}
