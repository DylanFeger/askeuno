import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PricingSection() {
  const plans = [
    {
      name: 'Starter',
      price: 19,
      description: 'Perfect for small businesses',
      features: [
        'Up to 3 data sources',
        '100 AI queries/month',
        '5GB storage',
        'Email support',
      ],
      popular: false,
    },
    {
      name: 'Professional',
      price: 49,
      description: 'For growing businesses',
      features: [
        'Unlimited data sources',
        '500 AI queries/month',
        '50GB storage',
        'Priority support',
        'Custom reports',
      ],
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 99,
      description: 'For larger organizations',
      features: [
        'Unlimited everything',
        'Advanced AI features',
        '500GB storage',
        '24/7 phone support',
        'Custom integrations',
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
                plan.popular ? 'border-2 border-purple-500 shadow-lg' : 'border border-gray-200'
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-500">
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
                className={`w-full ${
                  plan.popular
                    ? 'bg-purple-500 hover:bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {plan.name === 'Enterprise' ? 'Contact Sales' : 'Start Free Trial'}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
