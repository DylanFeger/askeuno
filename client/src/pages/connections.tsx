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
      connectionString: dbConfig.connectionString,
      name: `${dbConfig.type === 'postgres' ? 'PostgreSQL' : 'MySQL'} Database`,
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['text/csv', 'application/vnd.ms-excel', 
                       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid File',
        description: 'Please upload a CSV or Excel file',
        variant: 'destructive',
      });
      return;
    }

    connectMutation.mutate({
      type: 'csv_excel',
      file: file,
      name: file.name.replace(/\.[^/.]+$/, ''),
    });
  };

  const getConnectionStatus = (connection: any) => {
    if (connection.healthStatus === 'healthy') {
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    } else if (connection.healthStatus === 'unhealthy') {
      return <Badge className="bg-red-100 text-red-800">Error</Badge>;
    } else if (connection.status === 'expired') {
      return <Badge className="bg-yellow-100 text-yellow-800">Expired</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navbar />
        
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Secure Connections
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Connect your business tools with read-only access. All tokens are encrypted and never logged.
            </p>
          </div>

          {/* Security Notice */}
          <Alert className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription>
              <strong>Security First:</strong> We use OAuth 2.0 with PKCE for secure authentication. 
              All connections are read-only and tokens are encrypted at rest. You can revoke access anytime.
            </AlertDescription>
          </Alert>

          {/* Active Connections */}
          {connections.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Active Connections</h2>
              <div className="grid gap-4">
                {connections.map((connection: any) => (
                  <Card key={connection.id} className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        {CONNECTIONS.find(c => c.id === connection.provider)?.icon && (
                          <div className="text-gray-600 dark:text-gray-400">
                            {(() => {
                              const Icon = CONNECTIONS.find(c => c.id === connection.provider)?.icon;
                              return Icon ? <Icon className="h-5 w-5" /> : null;
                            })()}
                          </div>
                        )}
                        <div>
                          <h3 className="font-medium">{connection.accountLabel}</h3>
                          <p className="text-sm text-gray-500">
                            Connected {new Date(connection.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getConnectionStatus(connection)}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testConnectionMutation.mutate(connection.id)}
                          disabled={testingConnection === connection.id}
                        >
                          {testingConnection === connection.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            'Test'
                          )}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirmation(connection)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Available Connections */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Available Connections</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CONNECTIONS.map((connection) => {
                const isConnected = connections.some((c: any) => c.provider === connection.id);
                const Icon = connection.icon;
                
                return (
                  <Card 
                    key={connection.id} 
                    className={`border ${isConnected ? 'opacity-50' : ''} hover:shadow-lg transition-shadow cursor-pointer`}
                    onClick={() => {
                      if (!isConnected) {
                        if (connection.id === 'csv_excel') {
                          setLocation('/upload');
                        } else if (connection.id === 'lightspeed') {
                          setLocation('/connections/lightspeed');
                        } else {
                          setSelectedConnection(connection);
                        }
                      }
                    }}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        {connection.name}
                      </CardTitle>
                      <CardDescription>{connection.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isConnected ? (
                        <Badge className="w-full justify-center">Connected</Badge>
                      ) : (
                        <Button className="w-full" variant="outline">
                          Connect
                        </Button>
                      )}
                      
                      {connection.scopes && (
                        <div className="mt-2 text-xs text-gray-500">
                          Permissions: Read-only access
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Connection Dialog */}
          <Dialog open={!!selectedConnection} onOpenChange={() => setSelectedConnection(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  Connect to {selectedConnection?.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedConnection?.id === 'database' && 
                    'Provide a read-only database connection string. We will verify permissions before connecting.'}
                  {selectedConnection?.id === 'csv_excel' && 
                    'Upload a CSV or Excel file. Data will be securely processed and stored.'}
                  {selectedConnection?.noOAuth === false && 
                    'You will be redirected to authenticate with read-only permissions.'}
                </DialogDescription>
              </DialogHeader>

              {selectedConnection?.id === 'database' && (
                <div className="space-y-4">
                  <div>
                    <Label>Database Type</Label>
                    <select 
                      className="w-full p-2 border rounded"
                      value={dbConfig.type}
                      onChange={(e) => setDbConfig({ ...dbConfig, type: e.target.value })}
                    >
                      <option value="postgres">PostgreSQL</option>
                      <option value="mysql">MySQL</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label>Connection String (Read-Only User)</Label>
                    <Input
                      type="password"
                      placeholder={dbConfig.type === 'postgres' ? 
                        'postgresql://readonly:password@host:5432/database' : 
                        'mysql://readonly:password@host:3306/database'}
                      value={dbConfig.connectionString}
                      onChange={(e) => setDbConfig({ ...dbConfig, connectionString: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Must be a read-only user. We'll reject any user with write permissions.
                    </p>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={handleDatabaseConnect}
                    disabled={connectMutation.isPending}
                  >
                    {connectMutation.isPending ? 'Verifying...' : 'Connect Database'}
                  </Button>
                </div>
              )}

              {selectedConnection?.id === 'csv_excel' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <span className="text-primary hover:underline">Choose a file</span>
                      <span className="text-gray-500"> or drag and drop</span>
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      CSV, XLS, XLSX up to 50MB
                    </p>
                  </div>
                </div>
              )}

              {selectedConnection && !selectedConnection.noOAuth && (
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You'll be redirected to {selectedConnection.name} to authorize read-only access.
                      You can revoke this access at any time.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                    <p className="text-sm font-medium mb-2">Requested Permissions:</p>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      {selectedConnection.scopes?.map((scope: string) => (
                        <li key={scope} className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          {scope.split('/').pop()?.replace(/_/g, ' ')}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={() => connectMutation.mutate({ provider: selectedConnection.id })}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Authorize {selectedConnection.name}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation */}
          <AlertDialog open={!!deleteConfirmation} onOpenChange={() => setDeleteConfirmation(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect {deleteConfirmation?.accountLabel}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will immediately revoke access and delete all stored tokens. 
                  You can reconnect at any time.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => disconnectMutation.mutate(deleteConfirmation.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
      </div>

      <Footer />
    </div>
  );
}