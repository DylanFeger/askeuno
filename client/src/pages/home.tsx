import { useState } from 'react';
import { Database, Upload, MessageSquare, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import FileUpload from '@/components/FileUpload';
import ChatInterface from '@/components/ChatInterface';
import PricingSection from '@/components/PricingSection';

export default function Home() {
  const [conversationId, setConversationId] = useState<number | undefined>();

  const handleUploadSuccess = (dataSource: any) => {
    // Reset conversation to start fresh with new data
    setConversationId(undefined);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <Database className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Acre</span>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-gray-600 hover:text-purple-500 transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-purple-500 transition-colors">
                Pricing
              </a>
              <Button className="bg-purple-500 hover:bg-purple-600 text-white">
                Get Started
              </Button>
            </nav>
            <button className="md:hidden text-gray-600">
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
            Turn Your Business Data Into{' '}
            <span className="text-purple-500">Instant Insights</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Upload your data, ask questions, get clear answers. No technical skills needed. 
            Your AI assistant handles all the complexity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-purple-500 hover:bg-purple-600 text-white px-8 py-3">
              Start Free Trial
            </Button>
            <Button variant="outline" className="px-8 py-3">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Main Interface */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <FileUpload onUploadSuccess={handleUploadSuccess} />
          <ChatInterface conversationId={conversationId} />
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
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Instant Upload</h3>
              <p className="text-gray-600">
                Drop your files and they're instantly understood. No setup, no configuration, no waiting.
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
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Database className="w-4 h-4 text-white" />
                </div>
                <span className="text-xl font-bold">Acre</span>
              </div>
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
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
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
