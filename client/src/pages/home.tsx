import { useState } from 'react';
import { Database, Wifi, MessageSquare, Shield, Upload, Trash2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'wouter';
import ChatInterface from '@/components/ChatInterface';
import ChatHistoryModal from '@/components/ChatHistoryModal';
import PricingSection from '@/components/PricingSection';
import AuthForm from '@/components/AuthForm';
import AcreLogo from '@/components/AcreLogo';
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

export default function Home() {
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

  const handleAuthSuccess = () => {
    // Refresh the page to show authenticated content
    queryClient.invalidateQueries();
  };

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

  // Authenticated user view - no marketing content
  if (isAuthenticated) {
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

  // Unauthenticated user view - show marketing landing page
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/">
              <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
                <AcreLogo className="w-8 h-8 text-primary" />
                <span className="text-xl font-bold text-gray-900">Acre</span>
              </div>
            </Link>
            <nav className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-gray-600 hover:text-primary transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-primary transition-colors">
                Pricing
              </a>
              <Button onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })}>
                Get Started
              </Button>
            </nav>
            <button 
              className="md:hidden text-gray-600 p-2 hover:bg-gray-100 rounded transition-colors"
              aria-label="Toggle mobile menu"
              onClick={() => alert('Mobile menu coming soon!')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Live Business Intelligence{' '}
            <span className="text-primary">Made Simple</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Connect to your live data sources, ask questions, get real-time insights. 
            Your AI assistant monitors and analyzes your business 24/7.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              className="px-8 py-3"
              onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })}
              aria-label="Start your free trial"
            >
              Start Free Trial
            </Button>
            <Button 
              variant="outline" 
              className="px-8 py-3"
              onClick={() => window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank')}
              aria-label="Watch product demo"
            >
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Auth Section */}
      <section id="auth-section" className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <AuthForm onSuccess={handleAuthSuccess} />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything You Need, Nothing You Don't</h2>
            <p className="text-xl text-gray-600">Simple, powerful, and secure data insights for your business</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Wifi className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Live Data Sync</h3>
              <p className="text-gray-600">
                Connect to databases, cloud storage, APIs, and business apps. Real-time sync keeps insights current.
              </p>
            </Card>
            
            <Card className="p-8">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Natural Conversation</h3>
              <p className="text-gray-600">
                Ask questions in plain English. Get clear, actionable answers in seconds.
              </p>
            </Card>
            
            <Card className="p-8">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Enterprise Security</h3>
              <p className="text-gray-600">
                Your data is encrypted and secure. We never share or sell your information.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <PricingSection />

      <Footer />
    </div>
  );
}
