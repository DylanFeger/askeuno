import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../utils/logger';
import crypto from 'crypto';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  } : undefined,
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'acre-data-uploads';

export interface UploadResult {
  success: boolean;
  key?: string;
  url?: string;
  error?: string;
}

/**
 * Generate a unique S3 key for file storage
 * Format: {userId}/{timestamp}-{random}-{filename}
 */
export function generateS3Key(userId: number, filename: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `business-${userId}/${timestamp}-${random}-${sanitizedFilename}`;
}

/**
 * Upload file to S3 with proper isolation per business
 */
export async function uploadToS3(
  userId: number,
  filename: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<UploadResult> {
  try {
    const key = generateS3Key(userId, filename);
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      ServerSideEncryption: 'AES256', // Encryption at rest
      Metadata: {
        userId: userId.toString(),
        uploadDate: new Date().toISOString(),
      },
    });

    await s3Client.send(command);

    logger.info('File uploaded to S3', {
      userId,
      key,
      filename,
      size: fileBuffer.length,
    });

    return {
      success: true,
      key,
      url: `s3://${BUCKET_NAME}/${key}`,
    };
  } catch (error) {
    logger.error('S3 upload error', { error, userId, filename });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Get a pre-signed URL for secure file download
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Download file from S3
 */
export async function downloadFromS3(key: string): Promise<Buffer | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    
    if (response.Body) {
      const chunks: Uint8Array[] = [];
      const stream = response.Body as any;
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    }
    
    return null;
  } catch (error) {
    logger.error('S3 download error', { error, key });
    return null;
  }
}

/**
 * Delete file from S3
 */
export async function deleteFromS3(key: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    
    logger.info('File deleted from S3', { key });
    return true;
  } catch (error) {
    logger.error('S3 delete error', { error, key });
    return false;
  }
}

/**
 * List files for a specific user
 */
export async function listUserFiles(userId: number): Promise<string[]> {
  try {
    const prefix = `business-${userId}/`;
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: 1000,
    });

    const response = await s3Client.send(command);
    const keys = response.Contents?.map(item => item.Key!).filter(Boolean) || [];
    
    return keys;
  } catch (error) {
    logger.error('S3 list error', { error, userId });
    return [];
  }
}

/**
 * Check if S3 is configured and accessible
 */
export async function checkS3Connection(): Promise<boolean> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      MaxKeys: 1,
    });
    
    await s3Client.send(command);
    return true;
  } catch (error) {
    logger.error('S3 connection check failed', { error });
    return false;
  }
}