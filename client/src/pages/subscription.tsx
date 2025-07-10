import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Zap, Building2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import type { User } from '@shared/schema';

const plans = [
  {
    name: 'Starter',
    id: 'starter',
    price: '$99/mo',
    description: 'Perfect for small businesses just getting started',
    features: [
      'Up to 5 data sources',
      '10,000 AI queries/month',
      'Basic insights & analytics',
      'Email support',
      '1GB storage'
    ],
    icon: Sparkles,
  },
  {
    name: 'Professional',
    id: 'professional',
    price: '$299/mo',
    description: 'For growing businesses that need more power',
    features: [
      'Unlimited data sources',
      '50,000 AI queries/month',
      'Advanced insights & predictions',
      'Priority email & chat support',
      '10GB storage',
      'Custom dashboards',
      'Team collaboration (up to 5 users)'
    ],
    icon: Zap,
    recommended: true,
  },
  {
    name: 'Enterprise',
    id: 'enterprise',
    price: 'Custom',
    description: 'For large organizations with specific needs',
    features: [
      'Everything in Professional',
      'Unlimited AI queries',
      'Dedicated account manager',
      '24/7 phone support',
      'Custom storage limits',
      'API access',
      'Custom integrations',
      'Unlimited team members',
      'SLA guarantees'
    ],
    icon: Building2,
  }
];

export default function SubscriptionPage() {
  const [loading, setLoading] = useState<string | null>(null);
  
  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/me'],
  });

  const currentPlan = plans.find(p => p.id === user?.subscriptionTier) || plans[0];

  const handleUpgrade = async (planId: string) => {
    if (planId === user?.subscriptionTier) {
      return;
    }

    setLoading(planId);
    
    // TODO: Implement actual subscription upgrade logic
    // This would typically redirect to a payment page or open a Stripe checkout
    toast({
      title: "Upgrade Coming Soon",
      description: `Upgrade to ${planId} plan will be available soon. Contact support@acre.com for manual upgrade.`,
    });
    
    setLoading(null);
  };

  const handleCancelSubscription = async () => {
    setLoading('cancel');
    
    // TODO: Implement actual subscription cancellation
    toast({
      title: "Cancellation",
      description: "Please contact support@acre.com to cancel your subscription.",
    });
    
    setLoading(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Manage Subscription</h1>
            <p className="text-gray-600">
              You're currently on the <Badge variant="default" className="ml-2">{currentPlan.name}</Badge> plan
            </p>
          </div>

          {/* Current Plan Details */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Current Plan Details</CardTitle>
              <CardDescription>Your subscription information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Plan: {currentPlan.name}</h4>
                  <p className="text-sm text-gray-600 mb-4">{currentPlan.description}</p>
                  <p className="text-2xl font-bold">{currentPlan.price}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Features:</h4>
                  <ul className="space-y-2">
                    {currentPlan.features.slice(0, 4).map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Plans */}
          <h2 className="text-2xl font-bold mb-6">Available Plans</h2>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isCurrentPlan = plan.id === user?.subscriptionTier;
              
              return (
                <Card 
                  key={plan.id} 
                  className={`relative ${plan.recommended ? 'border-primary' : ''} ${isCurrentPlan ? 'bg-gray-50' : ''}`}
                >
                  {plan.recommended && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary">Recommended</Badge>
                    </div>
                  )}
                  
                  <CardHeader>
                    <div className="flex items-center justify-between mb-4">
                      <Icon className="w-8 h-8 text-primary" />
                      {isCurrentPlan && <Badge variant="secondary">Current</Badge>}
                    </div>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="mb-6">
                      <span className="text-3xl font-bold">{plan.price}</span>
                    </div>
                    
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button 
                      className="w-full" 
                      variant={isCurrentPlan ? 'secondary' : 'default'}
                      disabled={isCurrentPlan || loading !== null}
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      {loading === plan.id ? 'Processing...' : 
                       isCurrentPlan ? 'Current Plan' : 
                       plan.id === 'enterprise' ? 'Contact Sales' : 'Upgrade'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Cancel Subscription */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Cancel Subscription</CardTitle>
              <CardDescription>
                We'll be sad to see you go. You can cancel your subscription at any time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={handleCancelSubscription}
                disabled={loading !== null}
              >
                {loading === 'cancel' ? 'Processing...' : 'Cancel Subscription'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}