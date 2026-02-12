/**
 * S3 Service - Re-exports from unified storage service
 * 
 * This file now uses the unified storage service which automatically
 * selects between local file storage and AWS S3 based on configuration.
 * 
 * For local development: Files are stored in ./uploads directory
 * For production: Set STORAGE_MODE=s3 and configure AWS credentials
 */

export {
  uploadToS3,
  downloadFromS3,
  deleteFromS3,
  checkS3Connection,
  generateS3Key,
  storage,
  type UploadResult,
} from './storageService';

export { listUserFiles, streamFile, getFileMetadata } from './localStorageService';

/**
 * Get a presigned URL for file download
 * In local mode, returns a local API URL
 * In S3 mode, returns a presigned S3 URL
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const storageMode = process.env.STORAGE_MODE || 'local';
  
  if (storageMode === 'local') {
    // Return local API URL for file access
    return `/api/files/${encodeURIComponent(key)}`;
  }
  
  // For S3 mode, generate a presigned URL
  try {
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    
    const client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
    });
    
    return await getSignedUrl(client, command, { expiresIn });
  } catch (error) {
    // Fallback to local URL if S3 is not configured
    return `/api/files/${encodeURIComponent(key)}`;
  }
}