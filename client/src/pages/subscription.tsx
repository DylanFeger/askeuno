import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, X, CreditCard, Shield, TrendingUp, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { Link } from 'wouter';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';
import Subscribe from './subscribe';
import EmailWithCopy from '@/components/EmailWithCopy';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 0,
    annualPrice: 0, // Free plan
    description: 'Perfect for small businesses getting started with data insights',
    queryLimit: 5,
    features: [
      '5 AI queries per hour',
      'Basic short responses (80 words max)',
      '1 database connection',
      'CSV & Excel file uploads',
      'Data quality warnings',
      'Email support',
    ],
    notIncluded: [
      'Multiple data sources',
      'Detailed responses toggle',
      'Suggested follow-up questions',
      'Visual charts & graphs',
      'Forecasting & predictions',
      'Team management',
      'Priority support',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    monthlyPrice: 99,
    annualPrice: 1009, // 15% off annual
    description: 'For growing businesses that need detailed insights',
    queryLimit: 25,
    features: [
      '25 AI queries per hour',
      'Extended responses (180 words)',
      'Suggested follow-up questions',
      '3 database connections',
      'CSV & Excel file uploads',
      'Visual charts & graphs',
      'Data quality warnings',
      'Extended thinking toggle',
      'Email support',
    ],
    notIncluded: [
      'More than 3 connections',
      'Unlimited queries',
      'Forecasting & predictions',
      'Team management',
      'Priority support',
    ],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 249,
    annualPrice: 2540, // 15% off annual
    description: 'Everything you need for enterprise-grade business intelligence',
    queryLimit: Infinity,
    features: [
      'Unlimited AI queries',
      'Unlimited response length',
      'Suggested follow-up questions',
      '10 database connections',
      'CSV & Excel file uploads',
      'Visual charts & graphs',
      'Forecasting & predictions',
      'Data quality warnings',
      'Extended thinking toggle',
      'Up to 5 teammates',
      'Team management dashboard',
      'Priority support',
    ],
    notIncluded: [],
  },
];

export default function SubscriptionPage() {
  const { user, refetch } = useAuth();
  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex-1">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Please log in to manage your subscription</h1>
            <Link href="/">
              <Button>Go to Login</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const currentPlan = user.subscriptionTier || 'starter';
  const subscriptionStatus = user.subscriptionStatus || 'active';
  const isPaidPlan = currentPlan === 'professional' || currentPlan === 'enterprise';

  const handleCancelSubscription = async () => {
    setIsProcessing(true);
    try {
      const response = await apiRequest('POST', '/api/subscription/cancel');
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Subscription Cancelled",
          description: data.message,
        });
        refetch(); // Refresh user data
      } else {
        throw new Error('Failed to cancel subscription');
      }
    } catch (error) {
      toast({
        title: "Cancellation Failed",
        description: error instanceof Error ? error.message : "Failed to cancel subscription",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setShowCancelDialog(false);
    }
  };

  const handleSubscribe = (tier: string) => {
    setSelectedTier(tier);
    setShowSubscribeModal(true);
  };

  const handleSubscribeSuccess = () => {
    setShowSubscribeModal(false);
    refetch(); // Refresh user data
    toast({
      title: "Subscription Active",
      description: "Your subscription has been activated successfully!",
    });
  };

  const handleSubscribeCancel = () => {
    setShowSubscribeModal(false);
    setSelectedTier('');
  };

  return (
    <ProtectedRoute requireMainUser={true}>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
      
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-6xl mx-auto">
          {/* Current Plan */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Your Current Plan</CardTitle>
              <CardDescription>
                {currentPlan === 'starter' 
                  ? 'You are on the free Starter plan'
                  : 'Manage your Euno subscription and billing'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Free Plan Alert */}
                {currentPlan === 'starter' && (
                  <Alert className="bg-green-50 border-green-200">
                    <Sparkles className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-900">
                      <strong>Free Forever!</strong> You have access to all Starter plan features with no credit card required. 
                      Upgrade anytime to unlock more queries and advanced features.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">
                      {currentPlan === 'starter' ? 'Starter' : currentPlan === 'professional' ? 'Professional' : 'Enterprise'} Plan
                    </h3>
                    <p className="text-gray-600 mt-1">
                      {currentPlan === 'starter'
                        ? 'Free plan - no billing'
                        : subscriptionStatus === 'active' 
                          ? `Billed ${user.billingCycle || 'monthly'} - Next billing date: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}`
                          : 'No active subscription'
                      }
                    </p>
                  </div>
                  <Badge variant={currentPlan === 'starter' ? 'secondary' : subscriptionStatus === 'active' ? 'default' : 'destructive'} className="text-lg px-4 py-2">
                    {currentPlan === 'starter' ? 'Free' : subscriptionStatus === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                {/* Query Usage Display */}
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Hourly Query Usage</span>
                    <span className="text-sm text-gray-600">
                      {user.monthlyQueryCount || 0} / {plans.find(p => p.id === currentPlan)?.queryLimit || 5} queries
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-primary h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(((user?.monthlyQueryCount || 0) / (plans.find(p => p.id === currentPlan)?.queryLimit || 5)) * 100, 100)}%` }}
                    />
                  </div>
                  {(user.monthlyQueryCount || 0) >= (plans.find(p => p.id === currentPlan)?.queryLimit || 5) && (
                    <Alert className="mt-3 bg-yellow-50 border-yellow-200">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-900">
                        You've reached your hourly query limit. Upgrade your plan for more queries.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Features for current plan */}
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Your plan includes:</h4>
                  <div className="grid md:grid-cols-2 gap-2">
                    {plans.find(p => p.id === currentPlan)?.features.slice(0, 6).map((feature) => (
                      <div key={feature} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Cancel option - only show if on paid plan */}
                {isPaidPlan && subscriptionStatus === 'active' && (
                  <div className="pt-4 border-t">
                    <button 
                      onClick={() => setShowCancelDialog(true)}
                      className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                      Cancel subscription
                    </button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-8 space-x-4">
            <Label htmlFor="billing-toggle" className={billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}>
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={billingCycle === 'annual'}
              onCheckedChange={(checked) => setBillingCycle(checked ? 'annual' : 'monthly')}
            />
            <Label htmlFor="billing-toggle" className={billingCycle === 'annual' ? 'text-gray-900' : 'text-gray-500'}>
              Annual
              <Badge variant="secondary" className="ml-2 text-xs">Save 2 months</Badge>
            </Label>
          </div>

          {/* Pricing Plans */}
          <div>
            <h2 className="text-3xl font-bold text-center mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600 text-center mb-12">
              Start free, upgrade when you're ready. Cancel anytime.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const price = billingCycle === 'monthly' ? plan.monthlyPrice : Math.round(plan.annualPrice / 12);
                const isCurrentPlan = plan.id === currentPlan;
                
                return (
                  <Card 
                    key={plan.id} 
                    className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-primary text-white px-4 py-1">
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    
                    <CardHeader className="text-center pt-8">
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      
                      {/* Query Limit Highlight */}
                      <div className="mt-3 p-2 bg-primary/10 rounded-lg">
                        <span className="text-2xl font-bold text-primary">
                          {plan.queryLimit === Infinity ? 'Infinite' : plan.queryLimit}
                        </span>
                        <span className="text-sm text-gray-600 ml-1">queries/hour</span>
                      </div>
                      
                      <div className="mt-4">
                        <span className="text-4xl font-bold">{price === 0 ? 'Free' : `$${price}`}</span>
                        {price > 0 && <span className="text-gray-600">/month</span>}
                      </div>
                      {billingCycle === 'annual' && price > 0 && (
                        <p className="text-sm text-green-600 mt-1">
                          ${plan.annualPrice}/year (save ${plan.monthlyPrice * 12 - plan.annualPrice})
                        </p>
                      )}
                      <CardDescription className="mt-2">{plan.description}</CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-3">
                        {plan.features.map((feature) => (
                          <div key={feature} className="flex items-start gap-2">
                            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}
                        
                        {plan.notIncluded.map((feature) => (
                          <div key={feature} className="flex items-start gap-2 opacity-50">
                            <X className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                            <span className="text-sm line-through">{feature}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-8">
                        {isCurrentPlan ? (
                          <Button className="w-full" disabled>
                            Current Plan
                          </Button>
                        ) : (
                          <Button 
                            className="w-full" 
                            variant={plan.popular ? 'default' : 'outline'}
                            onClick={() => handleSubscribe(plan.id)}
                          >
                            {plan.id === 'starter' ? 'Downgrade to Free' :
                             plan.monthlyPrice < (plans.find(p => p.id === currentPlan)?.monthlyPrice || 0) ? 'Downgrade' : 'Upgrade'}
                          </Button>
                        )}
                      </div>

                      {/* Payment notice */}
                      {!isCurrentPlan && plan.id !== 'starter' && (
                        <p className="text-xs text-center text-gray-500 mt-3">
                          Credit card required • Cancel anytime
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will remain active until the end of your current billing period. After that, you'll be downgraded to the free Starter plan with limited features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelSubscription}
              className="bg-red-600 hover:bg-red-700"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Subscribe Modal */}
      {showSubscribeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-full p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full my-8">
              <Subscribe 
                tier={selectedTier}
                billingCycle={billingCycle}
                onSuccess={handleSubscribeSuccess}
                onCancel={handleSubscribeCancel}
              />
            </div>
          </div>
        </div>
      )}

      <Footer />
      </div>
    </ProtectedRoute>
  );
}