import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import AuthForm from '@/components/AuthForm';
import EunoLogo from '@/components/EunoLogo';
import { useAuth } from '@/contexts/AuthContext';
import { queryClient } from '@/lib/queryClient';

export default function SignIn() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  const handleAuthSuccess = () => {
    // Redirect to chat after successful auth
    queryClient.invalidateQueries();
    setLocation('/chat');
  };

  // Redirect to chat if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      setLocation('/chat');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  // If already authenticated, don't render the form
  if (isAuthenticated && !isLoading) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <EunoLogo className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold text-gray-900">Euno</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Euno</h1>
            <p className="text-gray-600">Sign in to access your business insights</p>
          </div>
          
          <Card className="p-8">
            <AuthForm onSuccess={handleAuthSuccess} />
          </Card>
          
          <p className="text-center text-sm text-gray-600 mt-6">
            Need help? Contact us at{' '}
            <a href="mailto:support@askeuno.com" className="text-primary hover:underline">
              support@askeuno.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}