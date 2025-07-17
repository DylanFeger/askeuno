import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import HyppoLogo from '@/components/HyppoLogo';

export default function Error404() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center">
          <div className="p-4 bg-primary/10 rounded-full">
            <HyppoLogo className="w-16 h-16" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-gray-900">404</h1>
          <h2 className="text-2xl font-semibold text-gray-800">Page Not Found</h2>
          <p className="text-gray-600">
            Oops! The page you're looking for doesn't exist. 
            It might have been moved or deleted.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button variant="default">
              <Home className="w-4 h-4 mr-2" />
              Go to Homepage
            </Button>
          </Link>
          <Button 
            variant="outline"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
        
        <div className="pt-8 text-sm text-gray-500">
          <p>Need help? Contact us at <a href="mailto:support@euno.com" className="text-primary hover:underline">support@euno.com</a></p>
        </div>
      </div>
    </div>
  );
}