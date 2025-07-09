import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Database, Cloud, Building2, ShoppingCart, BarChart3, FileSpreadsheet, Server, Wifi, AlertCircle, CheckCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';

const dataSourceTypes = [
  { id: 'mysql', name: 'MySQL', icon: Database, category: 'database' },
  { id: 'postgres', name: 'PostgreSQL', icon: Database, category: 'database' },
  { id: 'mongodb', name: 'MongoDB', icon: Database, category: 'database' },
  { id: 'googlesheets', name: 'Google Sheets', icon: FileSpreadsheet, category: 'cloud' },
  { id: 's3', name: 'AWS S3', icon: Cloud, category: 'cloud' },
  { id: 'salesforce', name: 'Salesforce', icon: Building2, category: 'apps' },
  { id: 'shopify', name: 'Shopify', icon: ShoppingCart, category: 'apps' },
  { id: 'googleads', name: 'Google Ads', icon: BarChart3, category: 'apps' },
  { id: 'api', name: 'Custom API', icon: Server, category: 'api' },
];

export default function ConnectionsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [connectionForm, setConnectionForm] = useState<any>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: connections = [] } = useQuery({
    queryKey: ['/api/data-sources'],
  });

  const createConnectionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/data-sources/connect', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Connection created!',
        description: 'Your data source has been connected successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Connection failed',
        description: error.message || 'Please check your connection details.',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setSelectedType('');
    setConnectionForm({});
  };

  const renderConnectionForm = () => {
    switch (selectedType) {
      case 'mysql':
      case 'postgres':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="host">Host</Label>
              <Input
                id="host"
                placeholder="localhost or database.example.com"
                value={connectionForm.host || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, host: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                type="number"
                placeholder={selectedType === 'mysql' ? '3306' : '5432'}
                value={connectionForm.port || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, port: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="database">Database Name</Label>
              <Input
                id="database"
                placeholder="my_database"
                value={connectionForm.database || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, database: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="db_user"
                value={connectionForm.username || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, username: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={connectionForm.password || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, password: e.target.value })}
              />
            </div>
          </div>
        );

      case 'mongodb':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="connectionString">Connection String</Label>
              <Input
                id="connectionString"
                placeholder="mongodb://username:password@host:port/database"
                value={connectionForm.connectionString || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, connectionString: e.target.value })}
              />
            </div>
          </div>
        );

      case 'googlesheets':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="spreadsheetId">Spreadsheet ID</Label>
              <Input
                id="spreadsheetId"
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                value={connectionForm.spreadsheetId || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, spreadsheetId: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="sheetName">Sheet Name</Label>
              <Input
                id="sheetName"
                placeholder="Sheet1"
                value={connectionForm.sheetName || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, sheetName: e.target.value })}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              You'll need to authenticate with Google to access your sheets.
            </p>
          </div>
        );

      case 's3':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="bucketName">Bucket Name</Label>
              <Input
                id="bucketName"
                placeholder="my-data-bucket"
                value={connectionForm.bucketName || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, bucketName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                placeholder="us-east-1"
                value={connectionForm.region || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, region: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="accessKeyId">Access Key ID</Label>
              <Input
                id="accessKeyId"
                placeholder="AKIAIOSFODNN7EXAMPLE"
                value={connectionForm.accessKeyId || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, accessKeyId: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="secretAccessKey">Secret Access Key</Label>
              <Input
                id="secretAccessKey"
                type="password"
                placeholder="••••••••"
                value={connectionForm.secretAccessKey || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, secretAccessKey: e.target.value })}
              />
            </div>
          </div>
        );

      case 'salesforce':
      case 'shopify':
      case 'googleads':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="••••••••"
                value={connectionForm.apiKey || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, apiKey: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="domain">Domain/Instance</Label>
              <Input
                id="domain"
                placeholder={selectedType === 'shopify' ? 'mystore.myshopify.com' : 'mycompany.my.salesforce.com'}
                value={connectionForm.domain || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, domain: e.target.value })}
              />
            </div>
          </div>
        );

      case 'api':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="endpoint">API Endpoint</Label>
              <Input
                id="endpoint"
                placeholder="https://api.example.com/data"
                value={connectionForm.endpoint || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, endpoint: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="method">HTTP Method</Label>
              <Select
                value={connectionForm.method || 'GET'}
                onValueChange={(value) => setConnectionForm({ ...connectionForm, method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="headers">Headers (JSON)</Label>
              <Input
                id="headers"
                placeholder='{"Authorization": "Bearer token"}'
                value={connectionForm.headers || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, headers: e.target.value })}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const handleConnect = () => {
    const dataSource = dataSourceTypes.find(ds => ds.id === selectedType);
    if (!dataSource) return;

    createConnectionMutation.mutate({
      name: connectionForm.name || `${dataSource.name} Connection`,
      type: selectedType,
      connectionType: 'live',
      connectionData: connectionForm,
      syncFrequency: connectionForm.syncFrequency || 60, // default 60 minutes
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Data Connections</h1>
          <p className="text-gray-600 mt-2">Connect to live data sources for real-time insights</p>
        </div>

        <Button onClick={() => setIsDialogOpen(true)} className="mb-6">
          <Wifi className="mr-2 h-4 w-4" />
          Connect New Data Source
        </Button>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {connections.filter((conn: any) => conn.connectionType === 'live').map((connection: any) => {
            const sourceType = dataSourceTypes.find(ds => ds.id === connection.type);
            const Icon = sourceType?.icon || Database;
            
            return (
              <Card key={connection.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{connection.name}</CardTitle>
                    </div>
                    <Badge variant={connection.status === 'active' ? 'default' : 'destructive'}>
                      {connection.status === 'active' ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                      {connection.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    {sourceType?.name} • {connection.rowCount || 0} rows
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600">
                    <p>Last sync: {connection.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleString() : 'Never'}</p>
                    <p>Sync frequency: Every {connection.syncFrequency} minutes</p>
                  </div>
                  {connection.errorMessage && (
                    <p className="text-sm text-red-600 mt-2">{connection.errorMessage}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Connect to Data Source</DialogTitle>
              <DialogDescription>
                Choose a data source type and provide connection details
              </DialogDescription>
            </DialogHeader>

            <Tabs value={selectedType} onValueChange={setSelectedType}>
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="database">Databases</TabsTrigger>
                <TabsTrigger value="cloud">Cloud Storage</TabsTrigger>
                <TabsTrigger value="apps">Apps</TabsTrigger>
                <TabsTrigger value="api">APIs</TabsTrigger>
              </TabsList>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {dataSourceTypes.map((ds) => (
                  <Button
                    key={ds.id}
                    variant={selectedType === ds.id ? 'default' : 'outline'}
                    className="flex flex-col items-center p-4 h-auto"
                    onClick={() => setSelectedType(ds.id)}
                  >
                    <ds.icon className="h-6 w-6 mb-1" />
                    <span className="text-xs">{ds.name}</span>
                  </Button>
                ))}
              </div>

              {selectedType && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Connection Name</Label>
                    <Input
                      id="name"
                      placeholder="My Data Connection"
                      value={connectionForm.name || ''}
                      onChange={(e) => setConnectionForm({ ...connectionForm, name: e.target.value })}
                    />
                  </div>

                  {renderConnectionForm()}

                  <div>
                    <Label htmlFor="syncFrequency">Sync Frequency (minutes)</Label>
                    <Input
                      id="syncFrequency"
                      type="number"
                      placeholder="60"
                      value={connectionForm.syncFrequency || ''}
                      onChange={(e) => setConnectionForm({ ...connectionForm, syncFrequency: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button onClick={handleConnect} disabled={createConnectionMutation.isPending}>
                      {createConnectionMutation.isPending ? 'Connecting...' : 'Connect'}
                    </Button>
                  </div>
                </div>
              )}
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}