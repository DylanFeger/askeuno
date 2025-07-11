import { useState } from 'react';
import { Database, Wifi, MessageSquare, Shield, Upload, Trash2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'wouter';
import ChatInterface from '@/components/ChatInterface';
import ChatHistoryModal from '@/components/ChatHistoryModal';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
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
import type { DataSource } from '@shared/schema';

export default function Dashboard() {
  const [conversationId, setConversationId] = useState<number | undefined>();
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DataSource | null>(null);
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: dataSources = [] } = useQuery<DataSource[]>({
    queryKey: ['/api/data-sources'],
    enabled: isAuthenticated,
  });

  const deleteDataSourceMutation = useMutation({
    mutationFn: async (dataSourceId: number) => {
      const response = await apiRequest('DELETE', `/api/data-sources/${dataSourceId}`);
      if (!response.ok) {
        throw new Error('Failed to delete data source');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Database removed successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
      setDeleteConfirmation(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to remove database. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleViewChatHistory = (dataSource: DataSource) => {
    setSelectedDataSource(dataSource);
    setShowChatHistory(true);
  };

  const handleDeleteDataSource = (dataSource: DataSource) => {
    setDeleteConfirmation(dataSource);
  };

  const confirmDelete = () => {
    if (deleteConfirmation) {
      deleteDataSourceMutation.mutate(deleteConfirmation.id);
    }
  };

  const handleSelectConversation = (conversationId: number) => {
    setConversationId(conversationId);
    setShowChatHistory(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = '/';
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Data Sources Overview */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Your Data Sources</h1>
              <div className="flex gap-3">
                <Link href="/connections">
                  <Button variant="outline">
                    <Database className="w-4 h-4 mr-2" />
                    Connect Live Data
                  </Button>
                </Link>
                <Link href="/upload">
                  <Button>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload File
                  </Button>
                </Link>
              </div>
            </div>
            
            {dataSources.length === 0 ? (
              <Card className="p-8 text-center">
                <Wifi className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No data sources connected yet</h3>
                <p className="text-gray-600 mb-6">Connect to your live data sources to start getting real-time insights</p>
                <Link href="/connections">
                  <Button>Connect Your First Data Source</Button>
                </Link>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {dataSources.map((source) => (
                  <Card key={source.id} className="p-4">
                    <CardHeader className="p-0 pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{source.name}</CardTitle>
                          <CardDescription>{source.connectionType || source.type}</CardDescription>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          source.status === 'connected' ? 'bg-green-100 text-green-700' : 
                          source.status === 'error' ? 'bg-red-100 text-red-700' : 
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {source.status || 'connected'}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 pt-2">
                      <div className="text-sm text-gray-600">
                        {source.rowCount ? `${source.rowCount.toLocaleString()} rows` : 'Syncing...'}
                      </div>
                      {source.lastSyncAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          Last sync: {new Date(source.lastSyncAt).toLocaleDateString()}
                        </div>
                      )}
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewChatHistory(source)}
                        >
                          <History className="w-4 h-4 mr-1" />
                          Chat History
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDataSource(source)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          
          <ChatInterface conversationId={conversationId} />
        </div>
      </div>

      <Footer />

      {/* Chat History Modal */}
      <ChatHistoryModal
        isOpen={showChatHistory}
        onClose={() => setShowChatHistory(false)}
        dataSource={selectedDataSource}
        onSelectConversation={handleSelectConversation}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmation} onOpenChange={() => setDeleteConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Database</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{deleteConfirmation?.name}"? This will permanently delete:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All uploaded files and data</li>
                <li>All chat conversations related to this database</li>
                <li>All analysis and insights</li>
              </ul>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove Database
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}