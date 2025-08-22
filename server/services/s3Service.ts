import { objectStorageClient } from '../objectStorage';
import { logger } from '../utils/logger';
import crypto from 'crypto';
import { setObjectAclPolicy } from '../objectAcl';

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// Get the bucket name from the private directory environment variable
function getBucketName(): string {
  const privateDir = process.env.PRIVATE_OBJECT_DIR || '';
  if (!privateDir) {
    throw new Error('PRIVATE_OBJECT_DIR not set');
  }
  // Extract bucket name from path like /repl-default-bucket-xxx/...
  const parts = privateDir.split('/');
  return parts[1] || 'repl-default-bucket';
}

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
 * Upload file to Object Storage with proper isolation per business
 */
export async function uploadToS3(
  userId: number,
  filename: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<UploadResult> {
  try {
    const key = generateS3Key(userId, filename);
    const bucketName = getBucketName();
    
    // Get the bucket and create file reference
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(key);
    
    // Upload the file
    await file.save(fileBuffer, {
      metadata: {
        contentType,
        metadata: {
          userId: userId.toString(),
          uploadDate: new Date().toISOString(),
        },
      },
    });

    // Set ACL policy for the file (public visibility for uploads)
    await setObjectAclPolicy(file, {
      owner: userId.toString(),
      visibility: 'public',
    });

    logger.info('File uploaded to Object Storage', {
      userId,
      key,
      filename,
      size: fileBuffer.length,
    });

    return {
      success: true,
      key,
      url: `/${bucketName}/${key}`,
    };
  } catch (error) {
    logger.error('Object Storage upload error', { error, userId, filename });
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
  const bucketName = getBucketName();
  
  // Generate signed URL for Object Storage
  const request = {
    bucket_name: bucketName,
    object_name: key,
    method: 'GET' as const,
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
  
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to sign object URL: ${response.status}`);
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}

/**
 * Download file from Object Storage
 */
export async function downloadFromS3(key: string): Promise<Buffer | null> {
  try {
    const bucketName = getBucketName();
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(key);
    
    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return null;
    }
    
    // Download the file
    const [contents] = await file.download();
    return contents;
  } catch (error) {
    logger.error('Object Storage download error', { error, key });
    return null;
  }
}

/**
 * Delete file from Object Storage
 */
export async function deleteFromS3(key: string): Promise<boolean> {
  try {
    const bucketName = getBucketName();
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(key);
    
    await file.delete();
    
    logger.info('File deleted from Object Storage', { key });
    return true;
  } catch (error) {
    logger.error('Object Storage delete error', { error, key });
    return false;
  }
}

/**
 * List files for a specific user
 */
export async function listUserFiles(userId: number): Promise<string[]> {
  try {
    const bucketName = getBucketName();
    const bucket = objectStorageClient.bucket(bucketName);
    const prefix = `business-${userId}/`;
    
    // List files with prefix
    const [files] = await bucket.getFiles({
      prefix,
      maxResults: 1000,
    });
    
    const keys = files.map(file => file.name);
    return keys;
  } catch (error) {
    logger.error('Object Storage list error', { error, userId });
    return [];
  }
}

/**
 * Check if Object Storage is configured and accessible
 */
export async function checkS3Connection(): Promise<boolean> {
  try {
    const bucketName = getBucketName();
    const bucket = objectStorageClient.bucket(bucketName);
    
    // Try to list files to check connection
    await bucket.getFiles({ maxResults: 1 });
    return true;
  } catch (error) {
    logger.error('Object Storage connection check failed', { error });
    return false;
  }
}