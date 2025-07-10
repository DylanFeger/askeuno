import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const secretKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const keyBuffer = Buffer.from(secretKey.slice(0, 32), 'utf8');

/**
 * Encrypt sensitive connection data
 */
export function encryptConnectionData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
    
    const jsonStr = JSON.stringify(data);
    const encrypted = Buffer.concat([
      cipher.update(jsonStr, 'utf8'),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    };
  } catch (error) {
    console.error('Encryption error:', error);
    // In development, return data as-is
    if (process.env.NODE_ENV === 'development') {
      return data;
    }
    throw error;
  }
}

/**
 * Decrypt sensitive connection data
 */
export function decryptConnectionData(encryptedData: any): any {
  if (!encryptedData || typeof encryptedData !== 'object') {
    return encryptedData;
  }

  // If it's not encrypted, return as-is (for development)
  if (!encryptedData.encrypted) {
    return encryptedData;
  }

  try {
    const decipher = crypto.createDecipheriv(
      algorithm,
      keyBuffer,
      Buffer.from(encryptedData.iv, 'base64')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));
    
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedData.encrypted, 'base64')),
      decipher.final()
    ]);
    
    return JSON.parse(decrypted.toString('utf8'));
  } catch (error) {
    console.error('Decryption error:', error);
    // In development, return data as-is
    if (process.env.NODE_ENV === 'development') {
      return encryptedData;
    }
    throw error;
  }
}