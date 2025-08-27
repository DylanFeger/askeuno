import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

export default function OAuthCallback() {
  const { provider } = useParams();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        // Get the query parameters from the URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        if (error) {
          setStatus('error');
          setMessage(error === 'access_denied' 
            ? 'Authorization was denied. Please try again.'
            : `Authentication failed: ${error}`);
          return;
        }

        if (!code || !state) {
          setStatus('error');
          setMessage('Invalid callback parameters. Please try connecting again.');
          return;
        }

        // Forward the OAuth callback to the backend
        const response = await fetch(`/api/callback/${provider}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`, {
          method: 'GET',
          credentials: 'include',
        });

        if (response.redirected) {
          // Backend will redirect us, follow the redirect
          window.location.href = response.url;
          return;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Connection failed' }));
          throw new Error(errorData.error || 'Connection failed');
        }

        setStatus('success');
        setMessage('Connection established successfully!');
        
        // Redirect to connections page after a short delay
        setTimeout(() => {
          setLocation('/connections');
        }, 2000);

      } catch (error: any) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to establish connection. Please try again.');
      }
    };

    processOAuthCallback();
  }, [provider, setLocation]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center">
            {status === 'processing' && (
              <>
                <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
                <h2 className="text-xl font-semibold mb-2">Connecting to {provider}</h2>
                <p className="text-gray-600">{message}</p>
              </>
            )}
            
            {status === 'success' && (
              <>
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Successfully Connected!</h2>
                <p className="text-gray-600 mb-4">{message}</p>
                <p className="text-sm text-gray-500">Redirecting to connections page...</p>
              </>
            )}
            
            {status === 'error' && (
              <>
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Connection Failed</h2>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="space-y-2">
                  <Link href="/connections">
                    <Button className="w-full">
                      Back to Connections
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}