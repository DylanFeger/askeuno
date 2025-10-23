import { useState, useEffect } from 'react';
import { X, Cookie } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    localStorage.setItem('cookie_consent_date', new Date().toISOString());
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'essential_only');
    localStorage.setItem('cookie_consent_date', new Date().toISOString());
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 animate-in slide-in-from-bottom-5 duration-300"
      data-testid="cookie-consent-banner"
    >
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-start md:items-center justify-between gap-4 flex-col md:flex-row">
          <div className="flex items-start gap-3 flex-1">
            <Cookie className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-gray-900 font-medium mb-1">
                We use cookies to enhance your experience
              </p>
              <p className="text-xs text-gray-600">
                We use essential cookies to make our site work. With your consent, we may also use non-essential cookies to improve user experience and analyze website traffic. 
                By clicking "Accept All", you agree to our use of cookies. Learn more in our{' '}
                <Link href="/cookie-policy" className="text-primary hover:underline">
                  Cookie Policy
                </Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDecline}
              className="flex-1 md:flex-none"
              data-testid="cookie-decline"
            >
              Essential Only
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              className="flex-1 md:flex-none"
              data-testid="cookie-accept"
            >
              Accept All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDecline}
              className="md:hidden"
              data-testid="cookie-close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}