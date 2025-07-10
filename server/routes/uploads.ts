import { Router } from 'express';
import multer from 'multer';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { storage } from '../storage';
import { processUploadedFile, transformData, validateData } from '../services/dataProcessor';
import { getPresignedDownloadUrl, deleteFromS3, listUserFiles } from '../services/s3Service';
import { logger } from '../utils/logger';

interface MulterRequest extends AuthenticatedRequest {
  file?: Express.Multer.File;
}

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json'
    ];

    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.match(/\.(csv|xlsx?|json)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV, Excel, and JSON files are allowed.'));
    }
  }
});

/**
 * Upload and process a data file
 */
router.post('/upload', requireAuth, upload.single('file'), async (req: MulterRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { originalname, buffer, mimetype } = req.file;
    const { dataSourceName, description } = req.body;

    logger.info('File upload started', {
      userId: req.user.id,
      filename: originalname,
      size: buffer.length,
    });

    // Process the file
    const result = await processUploadedFile(
      req.user.id,
      originalname,
      buffer,
      mimetype
    );

    if (!result.success || !result.data) {
      return res.status(400).json({ 
        error: 'File processing failed', 
        details: result.error 
      });
    }

    // Validate data quality
    const validation = validateData(result.data.rows, result.data.schema);
    if (!validation.isValid) {
      logger.warn('Data validation warnings', {
        userId: req.user.id,
        filename: originalname,
        warnings: validation.errors,
      });
    }

    // Transform data based on detected schema
    const transformedData = transformData(result.data.rows, result.data.schema);

    // Create data source record
    const dataSource = await storage.createDataSource({
      userId: req.user.id,
      name: dataSourceName || originalname,
      type: 'file',
      connectionType: 'upload',
      connectionData: {
        filename: originalname,
        s3Key: result.s3Key,
        uploadDate: new Date().toISOString(),
      },
      schema: result.data.schema,
      rowCount: transformedData.length,
      status: 'active',
      description: description || result.data.summary,
      lastSyncAt: new Date(),
    });

    // Store processed data
    if (transformedData.length > 0) {
      await storage.insertDataRows(dataSource.id, transformedData);
    }

    logger.info('File upload completed', {
      userId: req.user.id,
      dataSourceId: dataSource.id,
      rowCount: transformedData.length,
    });

    res.json({
      success: true,
      dataSource: {
        ...dataSource,
        summary: result.data.summary,
        columns: result.data.columns,
        validationWarnings: validation.errors,
      },
    });
  } catch (error) {
    logger.error('File upload error', { 
      error, 
      userId: req.user.id,
      filename: req.file?.originalname,
    });
    
    res.status(500).json({ 
      error: 'Upload failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * Get download URL for uploaded file
 */
router.get('/download/:dataSourceId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const dataSourceId = parseInt(req.params.dataSourceId);
    const dataSource = await storage.getDataSource(dataSourceId);

    if (!dataSource || dataSource.userId !== req.user.id) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    if (dataSource.type !== 'file' || !dataSource.connectionData?.s3Key) {
      return res.status(400).json({ error: 'Not a file upload data source' });
    }

    const url = await getPresignedDownloadUrl(dataSource.connectionData.s3Key);
    
    res.json({ 
      success: true, 
      downloadUrl: url,
      filename: dataSource.connectionData.filename,
      expiresIn: 3600, // 1 hour
    });
  } catch (error) {
    logger.error('Download URL generation error', { error, dataSourceId: req.params.dataSourceId });
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

/**
 * List all uploaded files for the user
 */
router.get('/list', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const files = await listUserFiles(req.user.id);
    
    // Get data sources to match with S3 files
    const dataSources = await storage.getDataSourcesByUserId(req.user.id);
    const fileDataSources = dataSources.filter(ds => ds.type === 'file');

    const fileList = fileDataSources.map(ds => ({
      id: ds.id,
      name: ds.name,
      filename: ds.connectionData?.filename,
      uploadDate: ds.connectionData?.uploadDate,
      size: ds.rowCount,
      status: ds.status,
    }));

    res.json({
      success: true,
      files: fileList,
      totalFiles: fileList.length,
    });
  } catch (error) {
    logger.error('File list error', { error, userId: req.user.id });
    res.status(500).json({ error: 'Failed to list files' });
  }
});

/**
 * Delete an uploaded file
 */
router.delete('/:dataSourceId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const dataSourceId = parseInt(req.params.dataSourceId);
    const dataSource = await storage.getDataSource(dataSourceId);

    if (!dataSource || dataSource.userId !== req.user.id) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    if (dataSource.type !== 'file' || !dataSource.connectionData?.s3Key) {
      return res.status(400).json({ error: 'Not a file upload data source' });
    }

    // Delete from S3
    const s3Deleted = await deleteFromS3(dataSource.connectionData.s3Key);
    if (!s3Deleted) {
      logger.warn('S3 deletion failed', { 
        s3Key: dataSource.connectionData.s3Key,
        dataSourceId,
      });
    }

    // Delete from database
    await storage.deleteDataSource(dataSourceId);

    logger.info('File deleted', {
      userId: req.user.id,
      dataSourceId,
      filename: dataSource.connectionData.filename,
    });

    res.json({ 
      success: true, 
      message: 'File and associated data deleted successfully' 
    });
  } catch (error) {
    logger.error('File deletion error', { error, dataSourceId: req.params.dataSourceId });
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;