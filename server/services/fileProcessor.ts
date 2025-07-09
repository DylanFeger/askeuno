import { readFileSync } from 'fs';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';
import { analyzeDataSchema } from './openai';

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

    // Analyze schema using AI
    const schema = await analyzeDataSchema(data);
    
    // Get column names
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    
    return {
      data,
      schema,
      rowCount: data.length,
      columns
    };
  } catch (error) {
    console.error('File processing error:', error);
    throw new Error(`Failed to process ${fileType} file: ${error.message}`);
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
  
  const data = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    dateNF: 'yyyy-mm-dd'
  });
  
  if (data.length === 0) return [];
  
  const headers = data[0] as string[];
  const rows = data.slice(1);
  
  return rows.map(row => {
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = (row as any[])[index] || null;
    });
    return obj;
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
    return [jsonData];
  }
  
  throw new Error('Invalid JSON structure: expected array or object with data property');
}

export function validateFile(file: any): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['csv', 'xlsx', 'xls', 'json'];
  
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 10MB limit' };
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
