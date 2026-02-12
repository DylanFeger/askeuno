/**
 * File Routes - Serve uploaded files
 * Handles local file serving and file management
 */

import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { streamFile, getFileMetadata, deleteFile, listUserFiles } from '../services/localStorageService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/files/:key(*) - Download a file
 * Supports nested paths like business-1/timestamp-random-filename.csv
 */
router.get('/:key(*)', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const key = req.params.key;
    const userId = req.user?.id;
    
    if (!key) {
      return res.status(400).json({ error: 'File key is required' });
    }
    
    // Security check: Ensure user can only access their own files
    // Key format is: business-{userId}/...
    const keyUserId = key.match(/^business-(\d+)\//)?.[1];
    if (keyUserId && parseInt(keyUserId) !== userId) {
      logger.warn('Unauthorized file access attempt', { key, userId, keyUserId });
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Stream the file
    const success = await streamFile(key, res);
    
    if (!success) {
      return res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    logger.error('File download error', { error, key: req.params.key });
    res.status(500).json({ error: 'Failed to download file' });
  }
});

/**
 * GET /api/files/metadata/:key(*) - Get file metadata
 */
router.get('/metadata/:key(*)', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const key = req.params.key;
    const userId = req.user?.id;
    
    if (!key) {
      return res.status(400).json({ error: 'File key is required' });
    }
    
    // Security check
    const keyUserId = key.match(/^business-(\d+)\//)?.[1];
    if (keyUserId && parseInt(keyUserId) !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const metadata = await getFileMetadata(key);
    
    if (!metadata) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.json(metadata);
  } catch (error) {
    logger.error('File metadata error', { error, key: req.params.key });
    res.status(500).json({ error: 'Failed to get file metadata' });
  }
});

/**
 * DELETE /api/files/:key(*) - Delete a file
 */
router.delete('/:key(*)', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const key = req.params.key;
    const userId = req.user?.id;
    
    if (!key) {
      return res.status(400).json({ error: 'File key is required' });
    }
    
    // Security check
    const keyUserId = key.match(/^business-(\d+)\//)?.[1];
    if (keyUserId && parseInt(keyUserId) !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const success = await deleteFile(key);
    
    if (!success) {
      return res.status(404).json({ error: 'File not found or already deleted' });
    }
    
    res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    logger.error('File delete error', { error, key: req.params.key });
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

/**
 * GET /api/files/list/user - List all files for the current user
 */
router.get('/list/user', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const files = await listUserFiles(userId);
    
    res.json({ files, count: files.length });
  } catch (error) {
    logger.error('File list error', { error });
    res.status(500).json({ error: 'Failed to list files' });
  }
});

export default router;
