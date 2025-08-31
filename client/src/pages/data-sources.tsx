import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Trash2, RefreshCw, FileText, Database, Upload, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

export default function DataSources() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [deleteConfirmation, setDeleteConfirmation] = useState<any>(null);
  const [syncingSource, setSyncingSource] = useState<number | null>(null);

  // Fetch all data sources
  const { data: dataSources = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/data-sources'],
    enabled: isAuthenticated,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (dataSourceId: number) => {
      return apiRequest('DELETE', `/api/data-sources/${dataSourceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      toast({
        title: 'Success',
        description: 'Data source removed successfully',
      });
      setDeleteConfirmation(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove data source',
        variant: 'destructive',
      });
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async (dataSourceId: number) => {
      setSyncingSource(dataSourceId);
      return apiRequest('POST', `/api/data-sources/${dataSourceId}/sync`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
      toast({
        title: 'Success',
        description: 'Data source synced successfully',
      });
      setSyncingSource(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sync data source',
        variant: 'destructive',
      });
      setSyncingSource(null);
    },
  });

  const getSourceIcon = (type: string) => {
    if (type === 'file' || type === 'csv' || type === 'xlsx') {
      return <FileText className="h-5 w-5" />;
    }
    return <Database className="h-5 w-5" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'connected':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      case 'syncing':
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Syncing
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        );
    }
  };

  const formatDate = (date: string | Date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sage-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-6 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-sage-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sage-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-6 py-24">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Data Sources</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your connected databases and uploaded files
          </p>
        </div>

        {/* Add new data source buttons */}
        <div className="mb-8 flex gap-4">
          <Link href="/connections">
            <Button className="bg-sage-600 hover:bg-sage-700">
              <Database className="h-4 w-4 mr-2" />
              Connect Database
            </Button>
          </Link>
          <Link href="/upload">
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </Button>
          </Link>
        </div>

        {/* Data sources list */}
        {dataSources.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No data sources yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Connect a database or upload a file to get started
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="/connections">
                  <Button className="bg-sage-600 hover:bg-sage-700">
                    Connect Database
                  </Button>
                </Link>
                <Link href="/upload">
                  <Button variant="outline">
                    Upload File
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {dataSources.map((source: any) => (
              <Card key={source.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getSourceIcon(source.type)}</div>
                      <div>
                        <CardTitle className="text-lg">{source.name}</CardTitle>
                        <CardDescription className="mt-1">
                          Type: {source.type === 'csv' || source.type === 'xlsx' ? 'File Upload' : source.type}
                          {source.rowCount && ` • ${source.rowCount.toLocaleString()} rows`}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(source.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div>
                      <span className="font-medium">Created:</span> {formatDate(source.createdAt)}
                    </div>
                    {source.lastSyncAt && (
                      <div>
                        <span className="font-medium">Last synced:</span> {formatDate(source.lastSyncAt)}
                      </div>
                    )}
                    {source.connectionData?.uploadDate && (
                      <div>
                        <span className="font-medium">Uploaded:</span> {formatDate(source.connectionData.uploadDate)}
                      </div>
                    )}
                    {source.connectionData?.filename && (
                      <div>
                        <span className="font-medium">File:</span> {source.connectionData.filename}
                      </div>
                    )}
                    {source.errorMessage && (
                      <div className="text-red-600 dark:text-red-400">
                        <span className="font-medium">Error:</span> {source.errorMessage}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Link href={`/chat?dataSourceId=${source.id}`}>
                      <Button size="sm" variant="outline">
                        Open in Chat
                      </Button>
                    </Link>
                    
                    {source.connectionType === 'live' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => syncMutation.mutate(source.id)}
                        disabled={syncingSource === source.id}
                      >
                        {syncingSource === source.id ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Sync Now
                          </>
                        )}
                      </Button>
                    )}

                    {source.type === 'file' && source.connectionData?.s3Key && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            const response = await apiRequest('GET', `/api/upload/download/${source.id}`);
                            const data = await response.json();
                            if (data.downloadUrl) {
                              window.open(data.downloadUrl, '_blank');
                            }
                          } catch (error) {
                            toast({
                              title: 'Error',
                              description: 'Failed to generate download link',
                              variant: 'destructive',
                            });
                          }
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={() => setDeleteConfirmation(source)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete confirmation dialog */}
        <AlertDialog open={!!deleteConfirmation} onOpenChange={() => setDeleteConfirmation(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Data Source</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove "{deleteConfirmation?.name}"? This will permanently delete all associated data and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => deleteMutation.mutate(deleteConfirmation.id)}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}