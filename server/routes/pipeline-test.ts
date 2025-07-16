import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import multer from 'multer';
import { logger } from '../utils/logger.js';

const router = Router();
const execAsync = promisify(exec);

// Configure multer for test uploads
const testUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed for pipeline test'));
    }
  }
});

interface PipelineTestResult {
  status: string;
  timestamp: string;
  upload?: {
    filename: string;
    size: number;
    success: boolean;
  };
  parsing?: {
    success: boolean;
    rows?: number;
  };
  python?: {
    success: boolean;
    executionTime?: number;
  };
  analysis?: {
    top_product?: string;
    top_revenue?: number;
    columns?: string[];
    rows?: number;
    total_revenue?: number;
    avg_revenue?: number;
  };
  error?: {
    step: string;
    message: string;
  };
}

router.post('/test-pipeline', testUpload.single('file'), async (req, res) => {
  const startTime = Date.now();
  const result: PipelineTestResult = {
    status: '⏳ Testing...',
    timestamp: new Date().toISOString()
  };

  let tempFilePath: string | null = null;

  try {
    // Step 1: Handle file upload
    logger.info('[Pipeline Test] Starting pipeline test');
    
    if (!req.file) {
      // Use default test file if none provided
      const defaultTestFile = path.join(process.cwd(), 'test_pipeline_data.csv');
      const fileContent = await fs.readFile(defaultTestFile, 'utf-8');
      tempFilePath = path.join('uploads', `pipeline_test_${Date.now()}.csv`);
      await fs.writeFile(tempFilePath, fileContent);
      
      result.upload = {
        filename: 'test_pipeline_data.csv',
        size: fileContent.length,
        success: true
      };
      logger.info('[Pipeline Test] Using default test data file');
    } else {
      // Use uploaded file
      tempFilePath = path.join('uploads', `pipeline_test_${Date.now()}_${req.file.originalname}`);
      await fs.writeFile(tempFilePath, req.file.buffer);
      
      result.upload = {
        filename: req.file.originalname,
        size: req.file.size,
        success: true
      };
      logger.info(`[Pipeline Test] Uploaded file: ${req.file.originalname} (${req.file.size} bytes)`);
    }

    // Step 2: Quick parse to verify CSV structure
    const csvContent = await fs.readFile(tempFilePath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    result.parsing = {
      success: true,
      rows: lines.length - 1 // Exclude header
    };
    logger.info(`[Pipeline Test] Parsed ${result.parsing.rows} data rows`);

    // Step 3: Call Python analysis
    const pythonStartTime = Date.now();
    const pythonScriptPath = path.join(process.cwd(), 'server', 'python', 'test_pipeline.py');
    
    logger.info('[Pipeline Test] Executing Python analysis...');
    const { stdout, stderr } = await execAsync(
      `python3 "${pythonScriptPath}" "${tempFilePath}"`,
      { timeout: 30000 } // 30 second timeout
    );

    if (stderr) {
      logger.info(`[Pipeline Test] Python stderr: ${stderr}`);
    }

    const pythonResult = JSON.parse(stdout);
    const pythonExecutionTime = Date.now() - pythonStartTime;

    result.python = {
      success: pythonResult.success !== false,
      executionTime: pythonExecutionTime
    };

    // Step 4: Process analysis results
    if (pythonResult.success) {
      result.analysis = {
        top_product: pythonResult.top_product,
        top_revenue: pythonResult.top_revenue,
        columns: pythonResult.columns,
        rows: pythonResult.rows,
        total_revenue: pythonResult.total_revenue,
        avg_revenue: pythonResult.avg_revenue
      };
      
      result.status = '✅ Pipeline test passed';
      logger.info(`[Pipeline Test] Success! Top product: ${pythonResult.top_product} ($${pythonResult.top_revenue})`);
    } else {
      throw new Error(pythonResult.error || 'Python analysis failed');
    }

    // Clean up temp file
    await fs.unlink(tempFilePath);

    // Log total execution time
    const totalTime = Date.now() - startTime;
    logger.info(`[Pipeline Test] Completed in ${totalTime}ms`);

    res.json({
      ...result,
      executionTime: totalTime
    });

  } catch (error: any) {
    logger.error('[Pipeline Test] Error:', error);
    
    // Clean up temp file on error
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    result.status = '❌ Pipeline test failed';
    result.error = {
      step: error.message.includes('Python') ? 'Python execution' : 
            error.message.includes('CSV') ? 'CSV parsing' : 'Upload',
      message: error.message
    };

    res.status(500).json(result);
  }
});

// Get last test result
router.get('/test-pipeline/status', (req, res) => {
  res.json({
    message: 'Pipeline test endpoint ready',
    endpoint: '/api/pipeline/test-pipeline',
    lastTest: null // Could store this in memory or database
  });
});

export default router;