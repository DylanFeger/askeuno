import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Database, Upload, TrendingUp, Menu, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ChatInterface from '@/components/ChatInterface';
import { ConversationSearch } from '@/components/ConversationSearch';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';
import type { DataSource, ChatMessage } from '@shared/schema';

export default function Chat() {
  const [conversationId, setConversationId] = useState<number | undefined>();
  const [conversationMessages, setConversationMessages] = useState<ChatMessage[]>([]);
  const { user, isLoading, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [newDatasetName, setNewDatasetName] = useState<string | null>(null);
  
  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/signin');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  // Handle new dataset query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const newDataset = params.get('newDataset');
    
    if (newDataset) {
      setNewDatasetName(decodeURIComponent(newDataset));
      // Clean up URL
      window.history.replaceState({}, '', '/chat');
      // Auto-dismiss banner after 5 seconds
      setTimeout(() => setNewDatasetName(null), 5000);
    }
  }, []);

  const { data: dataSources = [] } = useQuery<DataSource[]>({
    queryKey: ['/api/data-sources'],
    enabled: isAuthenticated,
  });

  const handleConversationSelect = (id: number, messages: ChatMessage[]) => {
    setConversationId(id);
    setConversationMessages(messages);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex flex-col">
        <div className="container mx-auto px-4 py-8 flex-1">
          <div className="max-w-4xl mx-auto">
            {/* Welcome message and quick actions */}
            <div className="mb-8">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome back, {user?.username}!
                </h1>
                <p className="text-gray-600">
                  Ask me anything about your business data
                </p>
              </div>
              
              {/* Search Bar */}
              <ConversationSearch
                onConversationSelect={handleConversationSelect}
                currentConversationId={conversationId}
              />

              {/* New Dataset Banner */}
              {newDatasetName && (
                <Alert className="mb-6 bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="flex items-center justify-between">
                    <span className="text-green-800">
                      New dataset "{newDatasetName}" is ready! You can now ask questions about your data.
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewDatasetName(null)}
                      className="ml-4"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
                
                {dataSources.length === 0 && !conversationId && (
                  <Card className="p-6 mb-8 bg-amber-50 border-amber-200">
                    <p className="text-amber-800 mb-4">
                      You haven't connected any data sources yet. Get started by:
                    </p>
                    <div className="flex gap-3 justify-center flex-wrap">
                      <Link href="/upload">
                        <Button>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload a File
                        </Button>
                      </Link>
                      <Link href="/connections">
                        <Button variant="outline">
                          <Database className="w-4 h-4 mr-2" />
                          Connect Live Data
                        </Button>
                      </Link>
                    </div>
                  </Card>
                )}
            </div>
            
            {/* Chat Interface - the main focus */}
            <ChatInterface 
              conversationId={conversationId}
              initialMessages={conversationMessages}
              onNewConversation={() => {
                setConversationId(undefined);
                setConversationMessages([]);
              }}
            />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}