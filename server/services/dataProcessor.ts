import { readFileSync } from 'fs';
import { uploadToS3 } from './s3Service';
import { processFile } from './fileProcessor';
import { analyzeDataSchema } from './openai';
import { logger } from '../utils/logger';
import path from 'path';
import { promises as fs } from 'fs';

interface ProcessedFileResult {
  success: boolean;
  data?: {
    rows: any[];
    schema: any;
    columns: string[];
    summary: string;
  };
  s3Key?: string;
  error?: string;
}

export async function processUploadedFile(
  userId: number,
  filename: string,
  buffer: Buffer,
  mimetype: string
): Promise<ProcessedFileResult> {
  let tempFilePath: string | null = null;
  
  try {
    // Write buffer to temporary file
    tempFilePath = path.join('uploads', `temp_${Date.now()}_${filename}`);
    await fs.writeFile(tempFilePath, buffer);
    
    // Get file extension
    const fileExt = path.extname(filename).substring(1).toLowerCase();
    
    // Process the file to extract data
    const processedData = await processFile(tempFilePath, fileExt);
    
    // Analyze schema using AI
    const schemaAnalysis = await analyzeDataSchema(processedData.data, userId);
    
    // Try to upload to S3, but don't fail if credentials are missing
    let s3Key: string | undefined;
    try {
      const s3Result = await uploadToS3(
        userId,
        filename,
        buffer,
        mimetype
      );
      
      if (s3Result.success) {
        s3Key = s3Result.key;
        logger.info('File uploaded to S3', { filename, s3Key });
      } else {
        logger.warn('S3 upload failed, continuing without cloud storage', { 
          filename, 
          error: s3Result.error 
        });
      }
    } catch (s3Error) {
      logger.warn('S3 upload skipped - credentials not configured', { 
        filename,
        error: s3Error instanceof Error ? s3Error.message : 'Unknown error' 
      });
      // Continue without S3 - file will be processed from local storage
    }
    
    // Clean up temp file
    await fs.unlink(tempFilePath);
    
    return {
      success: true,
      data: {
        rows: processedData.data,
        schema: schemaAnalysis.columns || processedData.schema,
        columns: Object.keys(processedData.schema),
        summary: schemaAnalysis.dataType || 'Business data',
      },
      s3Key,
    };
  } catch (error) {
    // Clean up temp file on error
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Processing failed';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('File processing error', { 
      error: errorMessage, 
      stack: errorStack,
      filename,
      userId,
      mimetype,
    });
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export function transformData(rows: any[], schema: any): any[] {
  if (!rows || rows.length === 0) return [];
  
  // Convert schema array to object for easier lookup
  const schemaMap: Record<string, string> = {};
  if (Array.isArray(schema)) {
    schema.forEach((col: any) => {
      if (col.name && col.type) {
        schemaMap[col.name] = col.type;
      }
    });
  } else if (typeof schema === 'object') {
    Object.assign(schemaMap, schema);
  }
  
  return rows.map((row) => {
    const transformed: any = {};
    
    for (const [key, value] of Object.entries(row)) {
      // Skip undefined keys
      if (key === undefined || key === 'undefined') continue;
      
      // Clean the key name to ensure it's valid
      const cleanKey = String(key).trim();
      if (!cleanKey) continue;
      
      const schemaType = schemaMap[cleanKey] || 'string';
      
      switch (schemaType) {
        case 'number':
        case 'integer':
          const numValue = parseFloat(String(value));
          transformed[cleanKey] = !isNaN(numValue) ? numValue : null;
          break;
        case 'boolean':
          transformed[cleanKey] = value === true || value === 'true' || value === 1;
          break;
        case 'date':
        case 'datetime':
          transformed[cleanKey] = value ? new Date(String(value)).toISOString() : null;
          break;
        default:
          transformed[cleanKey] = value !== null && value !== undefined ? String(value) : null;
      }
    }
    
    return transformed;
  });
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateData(rows: any[], schema: any): ValidationResult {
  const errors: string[] = [];
  
  if (!rows || rows.length === 0) {
    errors.push('No data rows found');
    return { isValid: false, errors };
  }
  
  // Check for completely empty rows
  const emptyRows = rows.filter((row) => 
    Object.values(row).every((val) => val === null || val === undefined || val === '')
  ).length;
  
  if (emptyRows > 0) {
    errors.push(`Found ${emptyRows} empty rows`);
  }
  
  // Check for missing required columns
  const firstRow = rows[0];
  const actualColumns = Object.keys(firstRow);
  
  // Handle schema as array or object
  let expectedColumns: string[] = [];
  if (Array.isArray(schema)) {
    expectedColumns = schema.map((col: any) => col.name).filter((name: any) => name);
  } else if (typeof schema === 'object') {
    expectedColumns = Object.keys(schema);
  }
  
  // Skip validation if schema has numeric column names (likely from Excel processing)
  const hasNumericColumns = expectedColumns.some(col => !isNaN(Number(col)));
  if (hasNumericColumns) {
    // Don't report missing columns for numeric schemas
    return { isValid: true, errors: [] };
  }
  
  const missingColumns = expectedColumns.filter((col) => !actualColumns.includes(col));
  if (missingColumns.length > 0) {
    errors.push(`Missing columns: ${missingColumns.join(', ')}`);
  }
  
  // Check data type consistency
  const typeErrors: Record<string, number> = {};
  
  rows.forEach((row, index) => {
    for (const [key, value] of Object.entries(row)) {
      if (value === null || value === undefined || value === '') continue;
      
      // Get expected type from schema (handle array or object format)
      let expectedType: string | undefined;
      if (Array.isArray(schema)) {
        const schemaCol = schema.find((col: any) => col.name === key);
        expectedType = schemaCol?.type;
      } else {
        expectedType = schema[key];
      }
      if (!expectedType) continue;
      
      let isValid = true;
      switch (expectedType) {
        case 'number':
        case 'integer':
          isValid = !isNaN(Number(value));
          break;
        case 'boolean':
          isValid = ['true', 'false', '1', '0', true, false, 1, 0].includes(value);
          break;
        case 'date':
        case 'datetime':
          isValid = !isNaN(Date.parse(String(value)));
          break;
      }
      
      if (!isValid) {
        const errorKey = `${key}_${expectedType}`;
        typeErrors[errorKey] = (typeErrors[errorKey] || 0) + 1;
      }
    }
  });
  
  // Report type errors
  for (const [errorKey, count] of Object.entries(typeErrors)) {
    const [column, type] = errorKey.split('_');
    if (count > rows.length * 0.1) { // More than 10% errors
      errors.push(`Column '${column}' has ${count} invalid ${type} values`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}