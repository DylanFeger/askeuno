import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowRight } from 'lucide-react';

export default function LightspeedConnectionSuccess() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to connections page after 5 seconds
    const timeout = setTimeout(() => {
      setLocation('/connections');
    }, 5000);

    return () => clearTimeout(timeout);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sage-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-6 py-24">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-center">Successfully Connected!</CardTitle>
            <CardDescription className="text-center">
              Your Lightspeed Retail account has been connected to Euno
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You can now use your Lightspeed data in conversations with Euno. 
                The AI will have access to your sales, inventory, and customer information.
              </p>
            </div>

            <div className="space-y-2">
              <Button 
                className="w-full" 
                onClick={() => setLocation('/connections')}
              >
                View Connections
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              
              <Button 
                variant="outline"
                className="w-full" 
                onClick={() => setLocation('/chat')}
              >
                Start Analyzing Data
              </Button>
            </div>

            <p className="text-xs text-center text-gray-500">
              Redirecting to connections page in 5 seconds...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}