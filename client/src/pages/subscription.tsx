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
      'Unlimited database size',
      'Data quality warnings',
      'Email support',
    ],
    notIncluded: [
      'Multiple data sources',
      'Detailed responses toggle',
      'Suggested follow-up questions',
      'Visual charts & graphs',
      'Forecasting & predictions',
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
      'Unlimited database size',
      'Visual charts & graphs',
      'Data quality warnings',
      'Extended thinking toggle',
      'Email support',
    ],
    notIncluded: [
      'More than 3 connections',
      'Unlimited queries',
      'Forecasting & predictions',
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
      'Unlimited database size',
      'Visual charts & graphs',
      'Forecasting & predictions',
      'Data quality warnings',
      'Extended thinking toggle',
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
  const subscriptionStatus = user.subscriptionStatus || 'trial';
  
  // Calculate trial days remaining (mock data for now)
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 25); // Mock: 25 days left
  const daysRemaining = Math.ceil((trialEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-6xl mx-auto">
          {/* Current Plan */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Your Current Plan</CardTitle>
              <CardDescription>
                {subscriptionStatus === 'trial' 
                  ? `You're enjoying your free trial - ${daysRemaining} days remaining`
                  : 'Manage your Euno subscription and billing'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Trial Alert */}
                {subscriptionStatus === 'trial' && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      <strong>Free Trial Active!</strong> You have full access to the {currentPlan === 'starter' ? 'Starter' : currentPlan === 'growth' ? 'Professional' : 'Enterprise'} plan features. 
                      Your trial ends on {trialEndDate.toLocaleDateString()}. No credit card required until you're ready to continue.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">
                      {currentPlan === 'starter' ? 'Starter' : currentPlan === 'growth' ? 'Professional' : 'Enterprise'} Plan
                    </h3>
                    <p className="text-gray-600 mt-1">
                      {subscriptionStatus === 'active' 
                        ? `Billed ${user.billingCycle || 'monthly'} - Next billing date: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}`
                        : 'Trial period - no billing yet'
                      }
                    </p>
                  </div>
                  <Badge variant={subscriptionStatus === 'trial' ? 'default' : 'secondary'} className="text-lg px-4 py-2">
                    {subscriptionStatus === 'trial' ? 'Free Trial' : 'Active'}
                  </Badge>
                </div>

                {/* Query Usage Display */}
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Monthly Query Usage</span>
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
                        You've reached your monthly query limit. Upgrade your plan for more queries.
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
                
                {/* Cancel option - only show if subscribed or on trial */}
                {(subscriptionStatus === 'trial' || subscriptionStatus === 'active') && (
                  <div className="pt-4 border-t">
                    <button 
                      onClick={() => setShowCancelDialog(true)}
                      className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                      Cancel {subscriptionStatus === 'trial' ? 'trial' : 'subscription'}
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
              Start with a 7-day free trial. Upgrade, downgrade, or cancel anytime.
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
                        <span className="text-sm text-gray-600 ml-1">queries/month</span>
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
                            {subscriptionStatus === 'trial' ? 'Select Plan' : 
                             plan.monthlyPrice < plans.find(p => p.id === currentPlan)!.monthlyPrice ? 'Downgrade' : 'Upgrade'}
                          </Button>
                        )}
                      </div>

                      {/* Free trial notice */}
                      {!isCurrentPlan && subscriptionStatus !== 'active' && (
                        <p className="text-xs text-center text-gray-500 mt-3">
                          7-day free trial • No credit card required
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Trust Signals */}
          <div className="mt-16 text-center">
            <h3 className="text-2xl font-bold mb-8">Why Businesses Choose Euno</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-semibold mb-2">Bank-Level Security</h4>
                <p className="text-sm text-gray-600">
                  Your data is encrypted at rest and in transit. We never share or sell your information.
                </p>
              </div>
              
              <div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-semibold mb-2">Real Business Impact</h4>
                <p className="text-sm text-gray-600">
                  Our customers report 40% time savings on data analysis and 25% increase in revenue insights.
                </p>
              </div>
              
              <div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="font-semibold mb-2">Fair, Flexible Billing</h4>
                <p className="text-sm text-gray-600">
                  No hidden fees. Change or cancel your plan anytime. We believe in earning your business every month.
                </p>
              </div>
            </div>

            <div className="mt-8 p-4 bg-gray-100 rounded-lg inline-block">
              <div className="text-sm text-gray-600 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                Questions about pricing? Email us at{' '}
                <span className="ml-1">
                  <EmailWithCopy email="support@askeuno.com" className="text-primary hover:underline" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {subscriptionStatus === 'trial' ? 'Free Trial' : 'Subscription'}?</AlertDialogTitle>
            <AlertDialogDescription>
              {subscriptionStatus === 'trial' 
                ? "We're sorry to see you go! If you cancel now, you'll lose access to all Euno features immediately. You can always start a new trial later, but it won't include the remaining days from this trial."
                : "Your subscription will remain active until the end of your current billing period. After that, you'll lose access to all premium features and your data will be archived for 30 days."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep {subscriptionStatus === 'trial' ? 'Trial' : 'Subscription'}</AlertDialogCancel>
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
  );
}