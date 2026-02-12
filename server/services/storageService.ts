/**
 * Storage Service - Unified Interface
 * Automatically selects between local storage and S3 based on configuration
 * 
 * Usage:
 *   import { storage } from './services/storageService';
 *   await storage.upload(userId, filename, buffer, contentType);
 */

import { logger } from '../utils/logger';
import * as localStorageService from './localStorageService';

// AWS S3 SDK (optional - only imported if configured)
let S3Client: any = null;
let s3Client: any = null;

// Storage mode configuration
const STORAGE_MODE = process.env.STORAGE_MODE || 'local';

// Initialize S3 client if needed
async function initS3() {
  if (STORAGE_MODE === 's3' && !S3Client) {
    try {
      const { S3Client: S3, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      S3Client = S3;
      
      s3Client = new S3Client({
        region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
      
      logger.info('S3 client initialized', { region: process.env.S3_REGION || process.env.AWS_REGION });
    } catch (error) {
      logger.warn('Failed to initialize S3 client, falling back to local storage', { error });
    }
  }
}

export interface UploadResult {
  success: boolean;
  key?: string;
  url?: string;
  error?: string;
}

export interface StorageInterface {
  upload(userId: number, filename: string, buffer: Buffer, contentType: string): Promise<UploadResult>;
  download(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<boolean>;
  listUserFiles(userId: number): Promise<string[]>;
  checkConnection(): Promise<boolean>;
  getMode(): string;
}

// Local Storage Implementation
const localStorageImpl: StorageInterface = {
  async upload(userId, filename, buffer, contentType) {
    return localStorageService.uploadFile(userId, filename, buffer, contentType);
  },
  
  async download(key) {
    return localStorageService.downloadFile(key);
  },
  
  async delete(key) {
    return localStorageService.deleteFile(key);
  },
  
  async listUserFiles(userId) {
    return localStorageService.listUserFiles(userId);
  },
  
  async checkConnection() {
    return localStorageService.checkStorageConnection();
  },
  
  getMode() {
    return 'local';
  },
};

// S3 Storage Implementation
const s3StorageImpl: StorageInterface = {
  async upload(userId, filename, buffer, contentType) {
    await initS3();
    
    if (!s3Client) {
      logger.warn('S3 not configured, falling back to local storage');
      return localStorageImpl.upload(userId, filename, buffer, contentType);
    }
    
    try {
      const { PutObjectCommand } = await import('@aws-sdk/client-s3');
      const key = localStorageService.generateStorageKey(userId, filename);
      const bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET!;
      
      await s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
          userId: userId.toString(),
          uploadDate: new Date().toISOString(),
        },
      }));
      
      logger.info('File uploaded to S3', { userId, key, bucket });
      
      return {
        success: true,
        key,
        url: `https://${bucket}.s3.amazonaws.com/${key}`,
      };
    } catch (error) {
      logger.error('S3 upload error', { error, userId, filename });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'S3 upload failed',
      };
    }
  },
  
  async download(key) {
    await initS3();
    
    if (!s3Client) {
      logger.warn('S3 not configured, falling back to local storage');
      return localStorageImpl.download(key);
    }
    
    try {
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      const bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET!;
      
      const response = await s3Client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }));
      
      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        return null;
      }
      logger.error('S3 download error', { error, key });
      return null;
    }
  },
  
  async delete(key) {
    await initS3();
    
    if (!s3Client) {
      logger.warn('S3 not configured, falling back to local storage');
      return localStorageImpl.delete(key);
    }
    
    try {
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      const bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET!;
      
      await s3Client.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }));
      
      logger.info('File deleted from S3', { key, bucket });
      return true;
    } catch (error) {
      logger.error('S3 delete error', { error, key });
      return false;
    }
  },
  
  async listUserFiles(userId) {
    await initS3();
    
    if (!s3Client) {
      return localStorageImpl.listUserFiles(userId);
    }
    
    try {
      const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
      const bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET!;
      const prefix = `business-${userId}/`;
      
      const response = await s3Client.send(new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: 1000,
      }));
      
      return (response.Contents || []).map((obj: any) => obj.Key);
    } catch (error) {
      logger.error('S3 list error', { error, userId });
      return [];
    }
  },
  
  async checkConnection() {
    await initS3();
    
    if (!s3Client) {
      return false;
    }
    
    try {
      const { HeadBucketCommand } = await import('@aws-sdk/client-s3');
      const bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET!;
      
      await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
      return true;
    } catch (error) {
      logger.error('S3 connection check failed', { error });
      return false;
    }
  },
  
  getMode() {
    return 's3';
  },
};

// Select storage implementation based on configuration
function getStorageImpl(): StorageInterface {
  if (STORAGE_MODE === 's3' && (process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID) && (process.env.S3_BUCKET || process.env.AWS_S3_BUCKET)) {
    return s3StorageImpl;
  }
  return localStorageImpl;
}

// Export unified storage interface
export const storage = getStorageImpl();

// Export for backward compatibility
export const uploadToS3 = storage.upload.bind(storage);
export const downloadFromS3 = storage.download.bind(storage);
export const deleteFromS3 = storage.delete.bind(storage);
export const checkS3Connection = storage.checkConnection.bind(storage);
export const generateS3Key = localStorageService.generateStorageKey;
