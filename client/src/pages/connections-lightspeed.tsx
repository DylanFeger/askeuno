import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Store, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function LightspeedConnection() {
  const [, setLocation] = useLocation();
  const [storeName, setStoreName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const validateStoreName = (name: string): boolean => {
    // Store name should only contain lowercase letters, numbers, and hyphens
    const regex = /^[a-z0-9-]+$/;
    return regex.test(name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate store name
    if (!storeName.trim()) {
      setError('Please enter your store name');
      return;
    }

    if (!validateStoreName(storeName)) {
      setError('Store name can only contain lowercase letters, numbers, and hyphens');
      return;
    }

    // Construct the full URL
    const storeUrl = `https://${storeName}.lightspeedapp.com`;

    setIsSubmitting(true);

    try {
      const response = await apiRequest('POST', '/api/lightspeed/start', { storeUrl });
      const data = await response.json();

      if (data.redirect) {
        // Redirect to Lightspeed OAuth
        window.location.href = data.redirect;
      } else if (data.error) {
        setError(data.error);
        setIsSubmitting(false);
      }
    } catch (err: any) {
      console.error('Error starting Lightspeed connection:', err);
      toast({
        title: 'Connection Failed',
        description: err.message || 'Failed to initiate Lightspeed connection',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sage-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-6 py-24">
      <div className="max-w-md mx-auto">
        <Button
          variant="ghost"
          onClick={() => setLocation('/connections')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Connections
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <Store className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-center">Connect Lightspeed Retail</CardTitle>
            <CardDescription className="text-center">
              Enter your Lightspeed store URL to connect your retail data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Store Name
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm border border-r-0 rounded-l-md">
                    https://
                  </span>
                  <Input
                    type="text"
                    placeholder="yourstore"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value.toLowerCase())}
                    required
                    disabled={isSubmitting}
                    className="rounded-none border-x-0 focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm border border-l-0 rounded-r-md">
                    .lightspeedapp.com
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Enter only your store name (the part before .lightspeedapp.com)
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You can find your store name in your browser's address bar when logged into Lightspeed Retail.
                  For example, if your URL is <strong>mystore.lightspeedapp.com</strong>, enter <strong>mystore</strong>
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <p className="text-sm font-medium">Euno will request access to:</p>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Read employee information</li>
                  <li>• Read inventory data</li>
                  <li>• Read sales reports</li>
                </ul>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !storeName}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect to Lightspeed'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}