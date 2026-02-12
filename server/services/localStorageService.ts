/**
 * Local File Storage Service
 * Replaces Replit Object Storage for local development
 * Can be swapped for AWS S3 in production via environment configuration
 */

import fs from 'fs/promises';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Response } from 'express';
import { logger } from '../utils/logger';

// Storage configuration
const STORAGE_MODE = process.env.STORAGE_MODE || 'local'; // 'local' or 's3'
const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), 'uploads');

// Ensure storage directory exists
if (STORAGE_MODE === 'local') {
  if (!existsSync(LOCAL_STORAGE_PATH)) {
    mkdirSync(LOCAL_STORAGE_PATH, { recursive: true });
    logger.info('Created local storage directory', { path: LOCAL_STORAGE_PATH });
  }
}

export interface UploadResult {
  success: boolean;
  key?: string;
  url?: string;
  filePath?: string;
  error?: string;
}

export interface FileMetadata {
  filename: string;
  contentType: string;
  size: number;
  userId: number;
  uploadDate: string;
  key: string;
}

/**
 * Generate a unique storage key for files
 * Format: {userId}/{timestamp}-{random}-{filename}
 */
export function generateStorageKey(userId: number, filename: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `business-${userId}/${timestamp}-${random}-${sanitizedFilename}`;
}

/**
 * Get the full file path for a storage key
 */
function getFilePath(key: string): string {
  return path.join(LOCAL_STORAGE_PATH, key);
}

/**
 * Get the metadata file path for a storage key
 */
function getMetadataPath(key: string): string {
  return path.join(LOCAL_STORAGE_PATH, `${key}.meta.json`);
}

/**
 * Upload a file to local storage
 */
export async function uploadFile(
  userId: number,
  filename: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<UploadResult> {
  try {
    const key = generateStorageKey(userId, filename);
    const filePath = getFilePath(key);
    const metadataPath = getMetadataPath(key);
    
    // Ensure directory exists
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });
    
    // Write file
    await fs.writeFile(filePath, fileBuffer);
    
    // Write metadata
    const metadata: FileMetadata = {
      filename,
      contentType,
      size: fileBuffer.length,
      userId,
      uploadDate: new Date().toISOString(),
      key,
    };
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    
    logger.info('File uploaded to local storage', {
      userId,
      key,
      filename,
      size: fileBuffer.length,
    });
    
    return {
      success: true,
      key,
      filePath,
      url: `/api/files/${key}`,
    };
  } catch (error) {
    logger.error('Local storage upload error', { error, userId, filename });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Download a file from local storage
 */
export async function downloadFile(key: string): Promise<Buffer | null> {
  try {
    const filePath = getFilePath(key);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return null;
    }
    
    // Read and return file
    const contents = await fs.readFile(filePath);
    return contents;
  } catch (error) {
    logger.error('Local storage download error', { error, key });
    return null;
  }
}

/**
 * Stream a file to an Express response
 */
export async function streamFile(key: string, res: Response): Promise<boolean> {
  try {
    const filePath = getFilePath(key);
    const metadataPath = getMetadataPath(key);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return false;
    }
    
    // Get metadata
    let metadata: FileMetadata | null = null;
    try {
      const metaContent = await fs.readFile(metadataPath, 'utf-8');
      metadata = JSON.parse(metaContent);
    } catch {
      // Metadata might not exist for older files
    }
    
    // Get file stats
    const stats = await fs.stat(filePath);
    
    // Set headers
    res.set({
      'Content-Type': metadata?.contentType || 'application/octet-stream',
      'Content-Length': stats.size.toString(),
      'Content-Disposition': `attachment; filename="${metadata?.filename || path.basename(key)}"`,
      'Cache-Control': 'private, max-age=3600',
    });
    
    // Stream the file
    const stream = createReadStream(filePath);
    
    stream.on('error', (err) => {
      logger.error('Stream error', { error: err, key });
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming file' });
      }
    });
    
    stream.pipe(res);
    return true;
  } catch (error) {
    logger.error('Stream file error', { error, key });
    return false;
  }
}

/**
 * Delete a file from local storage
 */
export async function deleteFile(key: string): Promise<boolean> {
  try {
    const filePath = getFilePath(key);
    const metadataPath = getMetadataPath(key);
    
    // Delete file
    try {
      await fs.unlink(filePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
    }
    
    // Delete metadata
    try {
      await fs.unlink(metadataPath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
    }
    
    logger.info('File deleted from local storage', { key });
    return true;
  } catch (error) {
    logger.error('Local storage delete error', { error, key });
    return false;
  }
}

/**
 * List files for a specific user
 */
export async function listUserFiles(userId: number): Promise<string[]> {
  try {
    const userDir = path.join(LOCAL_STORAGE_PATH, `business-${userId}`);
    
    // Check if directory exists
    try {
      await fs.access(userDir);
    } catch {
      return [];
    }
    
    // List files
    const files = await fs.readdir(userDir);
    
    // Filter out metadata files and return full keys
    return files
      .filter(f => !f.endsWith('.meta.json'))
      .map(f => `business-${userId}/${f}`);
  } catch (error) {
    logger.error('Local storage list error', { error, userId });
    return [];
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(key: string): Promise<FileMetadata | null> {
  try {
    const metadataPath = getMetadataPath(key);
    const content = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Check if local storage is configured and accessible
 */
export async function checkStorageConnection(): Promise<boolean> {
  try {
    // Try to write a test file
    const testPath = path.join(LOCAL_STORAGE_PATH, '.storage-test');
    await fs.writeFile(testPath, 'test');
    await fs.unlink(testPath);
    return true;
  } catch (error) {
    logger.error('Local storage connection check failed', { error });
    return false;
  }
}

/**
 * Get storage mode
 */
export function getStorageMode(): string {
  return STORAGE_MODE;
}

/**
 * Get storage path
 */
export function getStoragePath(): string {
  return LOCAL_STORAGE_PATH;
}

// Export aliases for backward compatibility with s3Service
export const uploadToS3 = uploadFile;
export const downloadFromS3 = downloadFile;
export const deleteFromS3 = deleteFile;
export const checkS3Connection = checkStorageConnection;
export const generateS3Key = generateStorageKey;
