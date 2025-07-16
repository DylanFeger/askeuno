import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X } from "lucide-react";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
let stripePromise: Promise<any> | null = null;

if (import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY).catch((error) => {
    console.warn('Failed to load Stripe.js:', error);
    return null;
  });
}

interface SubscribeFormProps {
  tier: string;
  billingCycle: string;
  onSuccess: () => void;
}

const SubscribeForm = ({ tier, billingCycle, onSuccess }: SubscribeFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/subscription?success=true`,
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payment Successful",
          description: "Your subscription is now active!",
        });
        onSuccess();
      }
    } catch (err) {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          `Subscribe to ${tier.charAt(0).toUpperCase() + tier.slice(1)}`
        )}
      </Button>
    </form>
  );
};

interface SubscribePageProps {
  tier: string;
  billingCycle: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function Subscribe({ tier, billingCycle, onSuccess, onCancel }: SubscribePageProps) {
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripeLoadError, setStripeLoadError] = useState(false);

  // Pricing configuration
  const pricing = {
    starter: { monthly: 29, annual: 290 },
    growth: { monthly: 79, annual: 790 },
    pro: { monthly: 149, annual: 1490 }
  };

  const currentPrice = pricing[tier as keyof typeof pricing]?.[billingCycle as keyof typeof pricing.starter];
  const annualSavings = billingCycle === 'annual' ? 
    (pricing[tier as keyof typeof pricing].monthly * 12) - pricing[tier as keyof typeof pricing].annual : 0;

  useEffect(() => {
    // Check if Stripe is available
    if (!stripePromise || !import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
      setStripeLoadError(true);
      setIsLoading(false);
      return;
    }

    // Create subscription as soon as the component loads
    const createSubscription = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest("POST", "/api/subscription/get-or-create-subscription", {
          tier,
          billingCycle
        });

        if (!response.ok) {
          throw new Error('Failed to create subscription');
        }

        const data = await response.json();
        
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          throw new Error('No client secret received');
        }
      } catch (err) {
        console.error('Subscription creation error:', err);
        setError(err instanceof Error ? err.message : 'Failed to create subscription');
      } finally {
        setIsLoading(false);
      }
    };

    createSubscription();
  }, [tier, billingCycle]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Setting up your subscription...</p>
        </div>
      </div>
    );
  }

  if (stripeLoadError) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <X className="h-5 w-5 mr-2" />
            Payment System Unavailable
          </CardTitle>
          <CardDescription>
            The payment system is temporarily unavailable. Please try again later or contact support.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onCancel} variant="outline" className="w-full">
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <X className="h-5 w-5 mr-2" />
            Subscription Error
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onCancel} variant="outline" className="w-full">
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!clientSecret) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Setup Error</CardTitle>
          <CardDescription>Unable to initialize payment. Please try again.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onCancel} variant="outline" className="w-full">
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Subscribe to {tier.charAt(0).toUpperCase() + tier.slice(1)}</span>
            <Badge variant="secondary">{billingCycle}</Badge>
          </CardTitle>
          <CardDescription>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>${currentPrice}</span>
                <span className="text-sm text-muted-foreground">
                  {billingCycle === 'annual' ? 'per year' : 'per month'}
                </span>
              </div>
              {billingCycle === 'annual' && annualSavings > 0 && (
                <div className="flex items-center text-sm text-green-600">
                  <Check className="h-4 w-4 mr-1" />
                  Save ${annualSavings} annually
                </div>
              )}
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stripePromise ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <SubscribeForm 
                tier={tier} 
                billingCycle={billingCycle} 
                onSuccess={onSuccess}
              />
            </Elements>
          ) : (
            <div className="text-center py-8">
              <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Payment system is temporarily unavailable. Please contact support.
              </p>
            </div>
          )}
          <div className="mt-4">
            <Button 
              onClick={onCancel} 
              variant="ghost" 
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}