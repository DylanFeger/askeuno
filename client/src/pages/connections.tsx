import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  FileSpreadsheet, 
  ShoppingCart, 
  Briefcase, 
  DollarSign, 
  Upload, 
  Shield, 
  RefreshCw, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { FaGoogle } from 'react-icons/fa';
import { Link, useLocation } from 'wouter';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Secure connections configuration - only essential integrations
const CONNECTIONS = [
  {
    id: 'google_sheets',
    name: 'Google Sheets',
    icon: FaGoogle,
    description: 'Connect to read spreadsheet data',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly', 
             'https://www.googleapis.com/auth/drive.readonly'],
    category: 'cloud'
  },
  {
    id: 'lightspeed',
    name: 'Lightspeed Retail/Restaurant',
    icon: ShoppingCart,
    description: 'Read POS and inventory data',
    scopes: ['employee:reports', 'employee:inventory', 'employee:customers'],
    category: 'pos'
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    icon: Briefcase,
    description: 'Read accounting and financial data',
    scopes: ['com.intuit.quickbooks.accounting.read'],
    category: 'accounting'
  },

  {
    id: 'csv_excel',
    name: 'Upload CSV/Excel',
    icon: Upload,
    description: 'Upload spreadsheet files directly',
    category: 'file',
    noOAuth: true
  },
  {
    id: 'database',
    name: 'Direct Database',
    icon: Database,
    description: 'Connect to PostgreSQL or MySQL (read-only)',
    category: 'database',
    noOAuth: true
  }
];

export default function ConnectionsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  const [dbConfig, setDbConfig] = useState({ connectionString: '', type: 'postgres' });
  const [deleteConfirmation, setDeleteConfirmation] = useState<any>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  
  // Handle OAuth callback parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');
    
    if (success === 'true') {
      toast({
        title: 'Connection Successful',
        description: 'Your account has been connected successfully.',
      });
      // Clean up URL
      window.history.replaceState({}, '', '/connections');
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
    } else if (error) {
      toast({
        title: 'Connection Failed',
        description: decodeURIComponent(error),
        variant: 'destructive',
      });
      // Clean up URL
      window.history.replaceState({}, '', '/connections');
    }
  }, [toast, queryClient]);

  // Fetch active connections from Connection Manager
  const { data: connections = [], isLoading: connectionsLoading } = useQuery<any[]>({
    queryKey: ['/api/connections'],
    enabled: isAuthenticated,
  });

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.type === 'database') {
        return apiRequest('POST', '/api/connections/database', data);
      } else if (data.type === 'csv_excel') {
        // Handle file upload separately
        const formData = new FormData();
        formData.append('file', data.file);
        formData.append('name', data.name);
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        const result = await response.json();
        
        // Redirect to Chat with new dataset banner
        if (result.dataSource) {
          setTimeout(() => {
            setLocation(`/chat?newDataset=${encodeURIComponent(result.dataSource.name)}`);
          }, 500);
        }
        return result;
      } else {
        // For Lightspeed, redirect to setup page first
        if (data.provider === 'lightspeed') {
          window.location.href = '/lightspeed-setup';
          return Promise.resolve();
        }
        // OAuth flow - redirect to backend OAuth endpoint
        window.location.href = `/api/auth/${data.provider}/connect`;
        return Promise.resolve();
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Connection established successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
      setSelectedConnection(null);
      setDbConfig({ connectionString: '', type: 'postgres' });
    },
    onError: (error: any) => {
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to establish connection',
        variant: 'destructive',
      });
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      setTestingConnection(connectionId);
      return apiRequest('POST', `/api/connections/${connectionId}/test`);
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Connection Test',
        description: data?.success ? 'Connection is healthy' : 'Connection test failed',
        variant: data?.success ? 'default' : 'destructive',
      });
      setTestingConnection(null);
    },
    onError: () => {
      toast({
        title: 'Test Failed',
        description: 'Could not test connection',
        variant: 'destructive',
      });
      setTestingConnection(null);
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      return apiRequest('DELETE', `/api/connections/${connectionId}`);
    },
    onSuccess: () => {
      toast({
        title: 'Disconnected',
        description: 'Connection removed successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
      setDeleteConfirmation(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to disconnect',
        variant: 'destructive',
      });
    },
  });

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation('/signin');
    }
  }, [isAuthenticated, authLoading, setLocation]);

  if (authLoading || connectionsLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleDatabaseConnect = () => {
    if (!dbConfig.connectionString) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a connection string',
        variant: 'destructive',
      });
      return;
    }

    connectMutation.mutate({
      type: 'database',
      dbType: dbConfig.type,
      connectionString: dbConfig.connectionString
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['.csv', '.xlsx', '.xls'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(fileExt)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a CSV or Excel file',
        variant: 'destructive',
      });
      return;
    }

    // Upload file
    connectMutation.mutate({
      type: 'csv_excel',
      file: file,
      name: file.name
    });
  };

  const renderConnectionCard = (connection: any) => {
    const Icon = connection.icon;
    
    return (
      <Card key={connection.id} className="hover:border-primary/50 transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {typeof Icon === 'function' ? (
                <Icon className="h-6 w-6 text-primary" />
              ) : (
                <Icon className="h-6 w-6 text-primary" />
              )}
              <div>
                <CardTitle className="text-base">{connection.name}</CardTitle>
                <CardDescription className="mt-1 text-sm">
                  {connection.description}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {connection.id === 'csv_excel' ? (
            <div className="space-y-3">
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Supported formats: CSV, Excel (.xlsx, .xls)
              </p>
            </div>
          ) : connection.id === 'database' ? (
            <Dialog open={selectedConnection?.id === 'database'} onOpenChange={(open) => {
              if (!open) setSelectedConnection(null);
            }}>
              <Button 
                onClick={() => setSelectedConnection(connection)}
                className="w-full"
                variant="outline"
              >
                <Database className="h-4 w-4 mr-2" />
                Connect Database
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Connect to Database</DialogTitle>
                  <DialogDescription>
                    Enter your database connection details (read-only access)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Database Type</Label>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant={dbConfig.type === 'postgres' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDbConfig({ ...dbConfig, type: 'postgres' })}
                      >
                        PostgreSQL
                      </Button>
                      <Button
                        variant={dbConfig.type === 'mysql' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDbConfig({ ...dbConfig, type: 'mysql' })}
                      >
                        MySQL
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="connection-string">Connection String</Label>
                    <Input
                      id="connection-string"
                      type="password"
                      placeholder={dbConfig.type === 'postgres' ? 
                        'postgresql://user:pass@host:5432/dbname' : 
                        'mysql://user:pass@host:3306/dbname'}
                      value={dbConfig.connectionString}
                      onChange={(e) => setDbConfig({ ...dbConfig, connectionString: e.target.value })}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      We'll verify this is a read-only connection for security
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleDatabaseConnect}
                      disabled={connectMutation.isPending}
                      className="flex-1"
                    >
                      {connectMutation.isPending ? 'Connecting...' : 'Connect'}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setSelectedConnection(null)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Button 
              onClick={() => connectMutation.mutate({ 
                provider: connection.id,
                scopes: connection.scopes 
              })}
              disabled={connectMutation.isPending}
              className="w-full"
              variant="outline"
            >
              {connection.noOAuth ? (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Configure
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Connect with OAuth
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderActiveConnection = (conn: any) => {
    const connectionType = CONNECTIONS.find(c => c.id === conn.provider) || {
      name: conn.type === 'file' ? 'Uploaded File' : conn.provider,
      icon: conn.type === 'file' ? Upload : Database
    };
    const Icon = connectionType.icon;

    return (
      <Card key={conn.id} className="relative">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {Icon && typeof Icon === 'function' ? (
                <Icon className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Database className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <CardTitle className="text-base">{conn.name || connectionType.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant={conn.status === 'active' ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {conn.status === 'active' ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Error
                      </>
                    )}
                  </Badge>
                  {conn.lastSync && (
                    <span className="text-xs text-muted-foreground">
                      Last synced: {new Date(conn.lastSync).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => testConnectionMutation.mutate(conn.id)}
              disabled={testingConnection === conn.id}
            >
              {testingConnection === conn.id ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Test Connection
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDeleteConfirmation(conn)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Remove
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mt-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Data Connections</h1>
          <p className="text-gray-600 mt-2">
            Connect your business data sources to enable AI-powered analytics
          </p>
        </div>

        {/* Active Connections */}
        {connections.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Connections</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connections.map(renderActiveConnection)}
            </div>
          </div>
        )}

        {/* Available Connections */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {connections.length > 0 ? 'Add More Connections' : 'Available Connections'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CONNECTIONS.map(renderConnectionCard)}
          </div>
        </div>

        {/* Security Notice */}
        <Alert className="mt-8">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Security First:</strong> All connections use read-only access. Your data is encrypted in transit and at rest. 
            We never store your credentials - they're securely managed through OAuth 2.0 or encrypted connection strings.
          </AlertDescription>
        </Alert>
      </main>

      <Footer />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmation} onOpenChange={() => setDeleteConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Connection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the connection "{deleteConfirmation?.name}"? 
              This action cannot be undone and will stop all data syncing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disconnectMutation.mutate(deleteConfirmation.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Connection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}