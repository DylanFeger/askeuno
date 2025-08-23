import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function AcceptInvite() {
  const { token } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'auth-required'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const acceptInvitation = useMutation({
    mutationFn: async (inviteToken: string) => {
      return apiRequest(`/api/accept-invite/${inviteToken}`, {
        method: 'POST',
      });
    },
    onSuccess: (data) => {
      if (data.requiresAuth) {
        setStatus('auth-required');
      } else {
        setStatus('success');
        // Redirect to chat after successful acceptance
        setTimeout(() => {
          setLocation('/chat');
        }, 2000);
      }
    },
    onError: (error: any) => {
      setStatus('error');
      setErrorMessage(error.message || 'Failed to accept invitation');
    },
  });

  useEffect(() => {
    if (token) {
      acceptInvitation.mutate(token);
    }
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
            <h2 className="text-xl font-semibold mb-2">Processing Invitation</h2>
            <p className="text-muted-foreground">
              Please wait while we validate your invitation...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'auth-required') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please login or register to accept this invitation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You've been invited to join a team on AskEuno. To continue, you need to sign in or create an account.
            </p>
            <div className="flex gap-4">
              <Button 
                onClick={() => setLocation(`/signin?redirect=/accept-invite/${token}`)}
                className="flex-1"
              >
                Sign In
              </Button>
              <Button 
                onClick={() => setLocation(`/signin?register=true&redirect=/accept-invite/${token}`)}
                variant="outline"
                className="flex-1"
              >
                Register
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2">Invitation Accepted!</h2>
            <p className="text-muted-foreground">
              You now have chat-only access to your team's AskEuno account.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Redirecting to chat...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="py-12 text-center">
          <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
          <p className="text-muted-foreground mb-4">
            {errorMessage || 'This invitation is invalid or has expired.'}
          </p>
          <Button onClick={() => setLocation('/')}>
            Go to Homepage
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}