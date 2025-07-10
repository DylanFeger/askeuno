import { useState } from 'react';
import { Database, Wifi, MessageSquare, Shield, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'wouter';
import ChatInterface from '@/components/ChatInterface';
import PricingSection from '@/components/PricingSection';
import AuthForm from '@/components/AuthForm';
import AcreLogo from '@/components/AcreLogo';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { queryClient } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import type { DataSource } from '@shared/schema';

export default function Home() {
  const [conversationId, setConversationId] = useState<number | undefined>();
  const { user, isLoading, isAuthenticated } = useAuth();

  const { data: dataSources = [] } = useQuery<DataSource[]>({
    queryKey: ['/api/data-sources'],
    enabled: isAuthenticated,
  });

  const handleAuthSuccess = () => {
    // Refresh the page to show authenticated content
    queryClient.invalidateQueries();
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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="container mx-auto px-4 py-8">
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            
            <ChatInterface conversationId={conversationId} />
          </div>
        </div>
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

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <Link href="/">
                <div className="flex items-center space-x-3 mb-4 cursor-pointer hover:opacity-80 transition-opacity">
                  <AcreLogo className="w-8 h-8 text-white" />
                  <span className="text-xl font-bold">Acre</span>
                </div>
              </Link>
              <p className="text-gray-400">Making business data simple and actionable for everyone.</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Acre. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
