import { describe, it, expect, beforeEach, vi } from 'vitest';
let connectToDataSourceV2: any;
let testDataSourceConnection: any;

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

const legacyConnector = vi.hoisted(() => ({
  connectToDataSource: vi.fn(),
}));

// Mock dependencies
vi.mock('../server/utils/logger', () => ({
  logger: mockLogger,
}));

vi.mock('../server/connectors/registry', () => ({
  createConnector: vi.fn(),
  getConnectorMetadata: vi.fn(),
  getAllConnectorMetadata: vi.fn(() => []),
}));

vi.mock('../server/services/dataConnector', () => ({
  connectToDataSource: legacyConnector.connectToDataSource,
}));

describe('Data Source Connections', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../server/services/dataConnectorV2');
    connectToDataSourceV2 = mod.connectToDataSourceV2;
    testDataSourceConnection = mod.testDataSourceConnection;
  });

  describe('connectToDataSourceV2', () => {
    it('should connect to Lightspeed successfully', async () => {
      const { createConnector, getConnectorMetadata } = await import('../server/connectors/registry');
      
      const mockConnector = {
        testConnection: vi.fn().mockResolvedValue(true),
        fetchData: vi.fn().mockResolvedValue({
          success: true,
          data: [{ id: 1, name: 'Product 1' }],
        }),
      };

      vi.mocked(getConnectorMetadata).mockReturnValue({
        id: 'lightspeed',
        name: 'Lightspeed',
        category: 'ecommerce' as const,
        description: 'Lightspeed POS',
        authType: 'oauth2' as const,
        configFields: [],
        supportedSyncModes: ['full'],
      });

      vi.mocked(createConnector).mockReturnValue(mockConnector as any);

      const result = await connectToDataSourceV2('lightspeed', {
        apiKey: 'test-key',
        apiSecret: 'test-secret',
      });

      expect(result.success).toBe(true);
      expect(mockConnector.testConnection).toHaveBeenCalled();
      expect(mockConnector.fetchData).toHaveBeenCalled();
    });

    it('should handle Lightspeed connection failure', async () => {
      const { createConnector, getConnectorMetadata } = await import('../server/connectors/registry');
      
      const mockConnector = {
        testConnection: vi.fn().mockResolvedValue(false),
      };

      vi.mocked(getConnectorMetadata).mockReturnValue({
        id: 'lightspeed',
        name: 'Lightspeed',
        category: 'ecommerce' as const,
        description: 'Lightspeed POS',
        authType: 'oauth2' as const,
        configFields: [],
        supportedSyncModes: ['full'],
      });

      vi.mocked(createConnector).mockReturnValue(mockConnector as any);

      const result = await connectToDataSourceV2('lightspeed', {
        apiKey: 'invalid-key',
        apiSecret: 'invalid-secret',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection test failed');
    });

    it('should connect to Google Sheets successfully', async () => {
      const { createConnector, getConnectorMetadata } = await import('../server/connectors/registry');
      
      const mockConnector = {
        testConnection: vi.fn().mockResolvedValue(true),
        fetchData: vi.fn().mockResolvedValue({
          success: true,
          data: [{ column1: 'value1', column2: 'value2' }],
        }),
      };

      vi.mocked(getConnectorMetadata).mockReturnValue({
        id: 'googlesheets',
        name: 'Google Sheets',
        category: 'cloud' as const,
        description: 'Google Sheets',
        authType: 'oauth2' as const,
        configFields: [],
        supportedSyncModes: ['full'],
      });

      vi.mocked(createConnector).mockReturnValue(mockConnector as any);

      const result = await connectToDataSourceV2('googlesheets', {
        spreadsheetId: 'test-spreadsheet-id',
        credentials: 'test-credentials',
      });

      expect(result.success).toBe(true);
      expect(mockConnector.testConnection).toHaveBeenCalled();
      expect(mockConnector.fetchData).toHaveBeenCalled();
    });

    it('should handle Google Sheets connection error', async () => {
      const { createConnector, getConnectorMetadata } = await import('../server/connectors/registry');
      
      const mockConnector = {
        testConnection: vi.fn().mockRejectedValue(new Error('Invalid credentials')),
      };

      vi.mocked(getConnectorMetadata).mockReturnValue({
        id: 'googlesheets',
        name: 'Google Sheets',
        category: 'cloud' as const,
        description: 'Google Sheets',
        authType: 'oauth2' as const,
        configFields: [],
        supportedSyncModes: ['full'],
      });

      vi.mocked(createConnector).mockReturnValue(mockConnector as any);

      const result = await connectToDataSourceV2('googlesheets', {
        spreadsheetId: 'invalid-id',
        credentials: 'invalid-credentials',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should connect to database (PostgreSQL) successfully', async () => {
      const { getConnectorMetadata } = await import('../server/connectors/registry');
      vi.mocked(getConnectorMetadata).mockReturnValue(null);

      legacyConnector.connectToDataSource.mockResolvedValue({
        success: true,
        data: [{ id: 1, name: 'Record 1' }],
      });

      const result = await connectToDataSourceV2('postgresql', {
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        username: 'testuser',
        password: 'testpass',
      });

      expect(result.success).toBe(true);
      expect(legacyConnector.connectToDataSource).toHaveBeenCalledWith('postgresql', expect.any(Object));
    });

    it('should handle database connection error', async () => {
      const { getConnectorMetadata } = await import('../server/connectors/registry');
      vi.mocked(getConnectorMetadata).mockReturnValue(null);

      legacyConnector.connectToDataSource.mockResolvedValue({
        success: false,
        error: 'Connection refused',
      });

      const result = await connectToDataSourceV2('postgresql', {
        host: 'invalid-host',
        port: 5432,
        database: 'testdb',
        username: 'testuser',
        password: 'testpass',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection refused');
    });

    it('should handle unsupported data source type', async () => {
      const { getConnectorMetadata } = await import('../server/connectors/registry');
      const { connectToDataSource } = await import('../server/services/dataConnector');
      
      vi.mocked(getConnectorMetadata).mockReturnValue(null);
      vi.mocked(connectToDataSource).mockResolvedValue({
        success: false,
        error: 'Unsupported type',
      });

      const result = await connectToDataSourceV2('unsupported-type', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported data source type');
    });

    it('should handle connection exceptions', async () => {
      const { createConnector, getConnectorMetadata } = await import('../server/connectors/registry');
      
      vi.mocked(getConnectorMetadata).mockReturnValue({
        id: 'test',
        name: 'Test',
        category: 'database' as const,
        description: 'Test',
        authType: 'custom' as const,
        configFields: [],
        supportedSyncModes: ['full'],
      });

      vi.mocked(createConnector).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await connectToDataSourceV2('test', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
    });
  });

  describe('testDataSourceConnection', () => {
    it('should test connection successfully', async () => {
      const { createConnector, getConnectorMetadata } = await import('../server/connectors/registry');
      
      const mockConnector = {
        testConnection: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(getConnectorMetadata).mockReturnValue({
        id: 'test',
        name: 'Test',
        category: 'database' as const,
        description: 'Test',
        authType: 'custom' as const,
        configFields: [],
        supportedSyncModes: ['full'],
      });

      vi.mocked(createConnector).mockReturnValue(mockConnector as any);

      const result = await testDataSourceConnection('test', {
        host: 'localhost',
      });

      expect(result).toBe(true);
      expect(mockConnector.testConnection).toHaveBeenCalled();
    });

    it('should return false for failed connection test', async () => {
      const { createConnector, getConnectorMetadata } = await import('../server/connectors/registry');
      
      const mockConnector = {
        testConnection: vi.fn().mockResolvedValue(false),
      };

      vi.mocked(getConnectorMetadata).mockReturnValue({
        id: 'test',
        name: 'Test',
        category: 'database' as const,
        description: 'Test',
        authType: 'custom' as const,
        configFields: [],
        supportedSyncModes: ['full'],
      });

      vi.mocked(createConnector).mockReturnValue(mockConnector as any);

      const result = await testDataSourceConnection('test', {
        host: 'invalid-host',
      });

      expect(result).toBe(false);
    });

    it('should handle connection test exceptions', async () => {
      const { createConnector, getConnectorMetadata } = await import('../server/connectors/registry');
      
      vi.mocked(getConnectorMetadata).mockReturnValue({
        id: 'test',
        name: 'Test',
        category: 'database' as const,
        description: 'Test',
        authType: 'custom' as const,
        configFields: [],
        supportedSyncModes: ['full'],
      });

      vi.mocked(createConnector).mockImplementation(() => {
        throw new Error('Connection error');
      });

      const result = await testDataSourceConnection('test', {});

      expect(result).toBe(false);
    });
  });
});
