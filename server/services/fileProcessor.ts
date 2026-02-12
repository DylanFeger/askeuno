import { readFileSync } from 'fs';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';
import { logger } from '../utils/logger';

export interface ProcessedData {
  data: any[];
  schema: any;
  rowCount: number;
  columns: string[];
}

export async function processFile(filePath: string, fileType: string): Promise<ProcessedData> {
  let data: any[] = [];
  
  try {
    switch (fileType.toLowerCase()) {
      case 'csv':
        data = await processCsvFile(filePath);
        break;
      case 'xlsx':
      case 'xls':
        data = await processExcelFile(filePath);
        break;
      case 'json':
        data = await processJsonFile(filePath);
        break;
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    // Get column names and create basic schema
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    const schema: any = {};
    
    // Create basic schema by analyzing first few rows
    if (data.length > 0) {
      columns.forEach(col => {
        // Check a few rows to determine type
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
        // Default to string if no value found
        if (!schema[col]) {
          schema[col] = 'string';
        }
      });
    }
    
    return {
      data,
      schema,
      rowCount: data.length,
      columns
    };
  } catch (error) {
    logger.error('File processing error', { error, fileType, filePath });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to process ${fileType} file: ${errorMessage}`);
  }
}

async function processCsvFile(filePath: string): Promise<any[]> {
  const fs = await import('fs');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    cast: true,
    cast_date: true,
  });
  
  return records;
}

async function processExcelFile(filePath: string): Promise<any[]> {
  // Read file as buffer
  const buffer = readFileSync(filePath);
  const workbook = XLSX.read(buffer);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // First try to read with automatic header detection
  let data = XLSX.utils.sheet_to_json(worksheet, {
    raw: false,
    dateNF: 'yyyy-mm-dd'
  });
  
  // If data is empty or has numeric keys, try alternative approach
  if (data.length === 0 || (data.length > 0 && data[0] && typeof data[0] === 'object' && Object.keys(data[0]).some(key => !isNaN(Number(key))))) {
    // Read as array of arrays
    const arrayData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      dateNF: 'yyyy-mm-dd'
    });
    
    if (arrayData.length === 0) return [];
    
    // Extract headers from first row
    const headers = (arrayData[0] as any[]).map((header, index) => {
      // If header is empty or numeric, create a default column name
      if (!header || header === '' || !isNaN(Number(header))) {
        return `Column_${index + 1}`;
      }
      // Clean header name - remove special characters and spaces
      return String(header).replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+|_+$/g, '');
    });
    
    const rows = arrayData.slice(1);
    
    data = rows.map(row => {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = (row as any[])[index] || null;
      });
      return obj;
    });
  }
  
  // Clean column names in the data
  return data.map(row => {
    const cleanedRow: any = {};
    if (row && typeof row === 'object') {
      Object.keys(row).forEach(key => {
        // Clean the key name
        const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+|_+$/g, '') || `Column_${Object.keys(cleanedRow).length + 1}`;
        cleanedRow[cleanKey] = (row as any)[key];
      });
    }
    return cleanedRow;
  });
}

async function processJsonFile(filePath: string): Promise<any[]> {
  const fs = await import('fs');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const jsonData = JSON.parse(fileContent);
  
  // Handle different JSON structures
  if (Array.isArray(jsonData)) {
    return jsonData;
  } else if (jsonData.data && Array.isArray(jsonData.data)) {
    return jsonData.data;
  } else if (typeof jsonData === 'object') {
    // Try to find the first array property in the object
    const arrayProperties = Object.keys(jsonData).filter(key => Array.isArray(jsonData[key]));
    
    if (arrayProperties.length > 0) {
      // Use the first array found (e.g., 'inventory', 'products', 'records', etc.)
      const arrayKey = arrayProperties[0];
      logger.debug(`Found nested array property: ${arrayKey} with ${jsonData[arrayKey].length} items`);
      return jsonData[arrayKey];
    }
    
    // If no array found, wrap the single object
    return [jsonData];
  }
  
  throw new Error('Invalid JSON structure: expected array or object with data property');
}

export function validateFile(file: any): { valid: boolean; error?: string } {
  const maxSize = 500 * 1024 * 1024; // 500MB
  const allowedTypes = ['csv', 'xlsx', 'xls', 'json'];
  
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 500MB limit' };
  }
  
  const fileName = file.originalname || file.name;
  if (!fileName) {
    return { valid: false, error: 'File name is required' };
  }
  
  const fileExt = fileName.split('.').pop()?.toLowerCase();
  if (!fileExt || !allowedTypes.includes(fileExt)) {
    return { valid: false, error: 'Invalid file type. Only CSV, Excel, and JSON files are supported' };
  }
  
  return { valid: true };
}
