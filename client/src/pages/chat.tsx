import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Database, Upload, TrendingUp, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ChatInterface from '@/components/ChatInterface';
import { ConversationSidebar } from '@/components/ConversationSidebar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { DataSource } from '@shared/schema';

export default function Chat() {
  const [conversationId, setConversationId] = useState<number | undefined>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  
  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/signin');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const { data: dataSources = [] } = useQuery<DataSource[]>({
    queryKey: ['/api/data-sources'],
    enabled: isAuthenticated,
  });

  const handleConversationSelect = (id: number | undefined) => {
    setConversationId(id);
    // Close mobile sidebar when a conversation is selected
    if (isMobile) {
      setIsMobileSidebarOpen(false);
    }
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
      
      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <ConversationSidebar
            currentConversationId={conversationId}
            onConversationSelect={handleConversationSelect}
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          />
        )}

        {/* Mobile Sidebar in Sheet */}
        {isMobile && (
          <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
            <SheetContent side="left" className="p-0 w-[280px]">
              <ConversationSidebar
                currentConversationId={conversationId}
                onConversationSelect={handleConversationSelect}
                isOpen={true}
                onToggle={() => setIsMobileSidebarOpen(false)}
              />
            </SheetContent>
          </Sheet>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          <div className="container mx-auto px-4 py-8 flex-1">
            <div className="max-w-4xl mx-auto">
              {/* Welcome message and quick actions */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  {/* Mobile menu button */}
                  {isMobile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsMobileSidebarOpen(true)}
                      className="mr-2"
                    >
                      <Menu className="w-5 h-5" />
                    </Button>
                  )}
                  
                  <div className="flex-1 text-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      Welcome back, {user?.username}!
                    </h1>
                    <p className="text-gray-600">
                      Ask me anything about your business data
                    </p>
                  </div>

                  {/* Desktop toggle button */}
                  {!isMobile && !isSidebarOpen && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsSidebarOpen(true)}
                      className="ml-2"
                    >
                      <Menu className="w-5 h-5" />
                    </Button>
                  )}
                </div>
                
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
                onNewConversation={() => setConversationId(undefined)}
              />
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}