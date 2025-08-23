import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireMainUser?: boolean;
}

export default function ProtectedRoute({ children, requireMainUser = false }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to signin if not authenticated
    if (!isLoading && !isAuthenticated) {
      setLocation('/signin');
    }

    // If chat-only user tries to access restricted area
    if (user?.role === 'chat_only_user' && requireMainUser) {
      // Don't redirect, show message instead
    }
  }, [isAuthenticated, isLoading, user, requireMainUser, setLocation]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Show blocked message for chat-only users on restricted pages
  if (user?.role === 'chat_only_user' && requireMainUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center">
            <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground mb-6">
              Chat-only access enabled by your admin.
            </p>
            <Button onClick={() => setLocation('/chat')}>
              Go to Chat
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render children if all checks pass
  return <>{children}</>;
}