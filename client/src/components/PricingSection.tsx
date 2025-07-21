import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PricingSection() {
  const plans = [
    {
      name: 'Starter',
      price: 29,
      description: 'Perfect for small businesses',
      features: [
        '5 AI queries per month',
        'Basic short responses',
        '1 database connection',
        'File uploads only',
        '10,000 rows per source',
        'Email support',
        '30-day data history',
      ],
      popular: false,
    },
    {
      name: 'Professional',
      price: 79,
      description: 'For growing businesses',
      features: [
        '20 AI queries per month',
        'Detailed responses toggle',
        'Business recommendations',
        '3 database connections',
        'Live data connections',
        '100,000 rows per source',
        'Real-time data sync',
        'Priority support',
      ],
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 149,
      description: 'Enterprise-grade intelligence',
      features: [
        '50 AI queries per month',
        'Visual graphs & charts',
        'Comprehensive insights',
        '10 database connections',
        'Unlimited rows',
        'Real-time sync (1-min)',
        'Dedicated onboarding',
        'Phone & priority support',
      ],
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
          <p className="text-xl text-gray-600">Choose the plan that fits your business needs</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`p-8 relative ${
                plan.popular ? 'border-2 border-primary shadow-lg' : 'border border-gray-200'
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  ${plan.price}
                  <span className="text-lg font-normal text-gray-600">/month</span>
                </div>
                <p className="text-gray-600">{plan.description}</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button
                className="w-full"
                variant={plan.popular ? 'default' : 'secondary'}
                onClick={() => {
                  document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                aria-label={`Select ${plan.name} plan - $${plan.price}/month`}
              >
                Start Free Trial
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
