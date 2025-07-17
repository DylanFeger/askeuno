import { useState } from 'react';
import { Link } from 'wouter';
import { Database, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ChatInterface from '@/components/ChatInterface';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import type { DataSource } from '@shared/schema';

export default function Chat() {
  const [conversationId, setConversationId] = useState<number | undefined>();
  const { user, isLoading, isAuthenticated } = useAuth();

  const { data: dataSources = [] } = useQuery<DataSource[]>({
    queryKey: ['/api/data-sources'],
    enabled: isAuthenticated,
  });

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
        <div className="max-w-4xl mx-auto">
          {/* Welcome message and quick actions */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {user?.username}!
            </h1>
            <p className="text-gray-600 mb-6">
              Ask me anything about your business data
            </p>
            
            {dataSources.length === 0 && (
              <Card className="p-6 mb-8 bg-amber-50 border-amber-200">
                <p className="text-amber-800 mb-4">
                  You haven't connected any data sources yet. Get started by:
                </p>
                <div className="flex gap-3 justify-center">
                  <Link href="/connections">
                    <Button variant="outline">
                      <Database className="w-4 h-4 mr-2" />
                      Connect Live Data
                    </Button>
                  </Link>
                  <Link href="/upload">
                    <Button>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload a File
                    </Button>
                  </Link>
                </div>
              </Card>
            )}
          </div>
          
          {/* Chat Interface - the main focus */}
          <ChatInterface conversationId={conversationId} />
        </div>
      </div>

      <Footer />
    </div>
  );
}