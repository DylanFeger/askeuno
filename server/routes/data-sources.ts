import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { storage } from '../storage';
import { connectToDataSource } from '../services/dataConnector';
import { logger } from '../utils/logger';
import { encryptConnectionData, decryptConnectionData } from '../utils/encryption';

const router = Router();

// Get all data sources for the user
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const dataSources = await storage.getDataSourcesByUserId(req.user.id);
    res.json(dataSources);
  } catch (error) {
    logger.error('Error fetching data sources', { error, userId: req.user.id });
    res.status(500).json({ error: 'Failed to fetch data sources' });
  }
});

// Connect to a new live data source
router.post('/connect', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, type, connectionType, connectionData, syncFrequency } = req.body;
    
    // Validate required fields
    if (!name || !type || !connectionType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Test the connection first
    const testResult = await connectToDataSource(type, connectionData);
    if (!testResult.success) {
      return res.status(400).json({ 
        error: 'Connection test failed', 
        details: testResult.error 
      });
    }

    // Encrypt sensitive connection data
    const encryptedData = encryptConnectionData(connectionData);

    // Create the data source
    const dataSource = await storage.createDataSource({
      userId: req.user.id,
      name,
      type,
      connectionType,
      connectionData: encryptedData,
      schema: testResult.schema,
      rowCount: testResult.rowCount || 0,
      status: 'active',
      lastSyncAt: new Date(),
      syncFrequency: syncFrequency || 60,
    });

    // If initial data was retrieved, store it
    if (testResult.data && testResult.data.length > 0) {
      await storage.insertDataRows(dataSource.id, testResult.data);
    }

    logger.info('Live data source connected', { 
      userId: req.user.id, 
      dataSourceId: dataSource.id, 
      type 
    });

    res.json({ success: true, dataSource });
  } catch (error) {
    logger.error('Error connecting data source', { error, userId: req.user.id });
    res.status(500).json({ error: 'Failed to connect data source' });
  }
});

// Sync data from a live source
router.post('/:id/sync', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const dataSourceId = parseInt(req.params.id);
    const dataSource = await storage.getDataSource(dataSourceId);

    if (!dataSource || dataSource.userId !== req.user.id) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    if (dataSource.connectionType !== 'live') {
      return res.status(400).json({ error: 'Can only sync live data sources' });
    }

    // Update status to syncing
    await storage.updateDataSource(dataSourceId, { status: 'syncing' });

    // Decrypt connection data
    const connectionData = decryptConnectionData(dataSource.connectionData);

    // Perform sync
    const syncResult = await connectToDataSource(dataSource.type, connectionData);
    
    if (syncResult.success) {
      // Clear old data and insert new
      await storage.clearDataRows(dataSourceId);
      if (syncResult.data && syncResult.data.length > 0) {
        await storage.insertDataRows(dataSourceId, syncResult.data);
      }

      await storage.updateDataSource(dataSourceId, {
        status: 'active',
        lastSyncAt: new Date(),
        rowCount: syncResult.rowCount || 0,
        schema: syncResult.schema,
        errorMessage: null,
      });

      res.json({ 
        success: true, 
        rowsUpdated: syncResult.rowCount || 0 
      });
    } else {
      await storage.updateDataSource(dataSourceId, {
        status: 'error',
        errorMessage: syncResult.error,
      });

      res.status(500).json({ 
        error: 'Sync failed', 
        details: syncResult.error 
      });
    }
  } catch (error) {
    logger.error('Error syncing data source', { error, dataSourceId: req.params.id });
    res.status(500).json({ error: 'Failed to sync data source' });
  }
});

// Delete a data source
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const dataSourceId = parseInt(req.params.id);
    const dataSource = await storage.getDataSource(dataSourceId);

    if (!dataSource || dataSource.userId !== req.user.id) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    await storage.deleteDataSource(dataSourceId);
    
    logger.info('Data source deleted', { 
      userId: req.user.id, 
      dataSourceId 
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting data source', { error, dataSourceId: req.params.id });
    res.status(500).json({ error: 'Failed to delete data source' });
  }
});

export default router;