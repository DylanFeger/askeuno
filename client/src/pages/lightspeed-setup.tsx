import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowRight, Store, AlertCircle, Shield, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LightspeedSetup() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'store-url' | 'confirmation'>('store-url');
  const [storeUrl, setStoreUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  const validateStoreUrl = (url: string) => {
    // Remove https:// if present
    let cleanUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Check if it matches the Lightspeed pattern
    if (!cleanUrl.endsWith('.lightspeedapp.com') && !cleanUrl.endsWith('.vendhq.com')) {
      return null;
    }
    
    return cleanUrl;
  };

  const handleStoreUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validatedUrl = validateStoreUrl(storeUrl);
    if (!validatedUrl) {
      toast({
        title: 'Invalid Store URL',
        description: 'Please enter your Lightspeed store URL (e.g., yourstore.lightspeedapp.com)',
        variant: 'destructive',
      });
      return;
    }

    setIsValidating(true);
    
    // Store the URL in session storage for the next step
    sessionStorage.setItem('lightspeed_store_url', validatedUrl);
    
    // Move to confirmation step
    setTimeout(() => {
      setIsValidating(false);
      setStep('confirmation');
    }, 1000);
  };

  const handleConnect = async () => {
    const storedUrl = sessionStorage.getItem('lightspeed_store_url');
    if (!storedUrl) {
      toast({
        title: 'Error',
        description: 'Store URL not found. Please start over.',
        variant: 'destructive',
      });
      setStep('store-url');
      return;
    }

    // Redirect to the OAuth endpoint with the store URL
    const { getApiUrl } = await import('@/lib/queryClient');
    window.location.href = getApiUrl(`/api/auth/lightspeed/connect?store_url=${encodeURIComponent(storedUrl)}`);
  };

  const handleCancel = () => {
    sessionStorage.removeItem('lightspeed_store_url');
    setLocation('/connections');
  };

  if (step === 'store-url') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sage-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-6 py-24">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <Store className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-center">Connect Your Lightspeed Store</CardTitle>
              <CardDescription className="text-center">
                Enter your Lightspeed Retail store URL to begin the connection process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStoreUrlSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Store URL
                  </label>
                  <Input
                    type="text"
                    placeholder="yourstore.lightspeedapp.com"
                    value={storeUrl}
                    onChange={(e) => setStoreUrl(e.target.value)}
                    required
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    This is the URL you use to access your Lightspeed Retail admin
                  </p>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You can find your store URL in your browser's address bar when logged into Lightspeed Retail.
                    It typically looks like: <strong>storename.lightspeedapp.com</strong>
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isValidating}
                  >
                    {isValidating ? (
                      'Validating...'
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sage-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-6 py-24">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-center">Connect to Lightspeed Retail</CardTitle>
            <CardDescription className="text-center">
              You're about to connect Euno to your Lightspeed Retail account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Store URL:</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {sessionStorage.getItem('lightspeed_store_url')}
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Euno will be able to:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Read your sales and transaction data
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Access inventory and product information
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  View customer data and analytics
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Generate reports and insights
                </li>
              </ul>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Euno only has <strong>read-only</strong> access. We cannot modify any data in your Lightspeed account.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                Don't Connect
              </Button>
              <Button
                onClick={handleConnect}
                className="flex-1"
              >
                Connect
              </Button>
            </div>

            <p className="text-xs text-center text-gray-500">
              You can disconnect Euno from your Lightspeed account at any time
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}