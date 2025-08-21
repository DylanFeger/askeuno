import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);
  
  const plans = [
    {
      name: 'Starter',
      monthlyPrice: 0,
      annualPrice: 0,
      description: 'Perfect for small businesses',
      features: [
        '5 AI queries per hour',
        'Basic short responses (80 words)',
        '1 database connection',
        'CSV & Excel file uploads',
        '10,000 rows per source',
        'Data quality warnings',
        'Email support',
      ],
      popular: false,
    },
    {
      name: 'Professional',
      monthlyPrice: 99,
      annualPrice: Math.round(99 * 12 * 0.85), // 15% off = $1,009/year
      description: 'For growing businesses',
      features: [
        '25 AI queries per hour',
        'Extended responses (180 words)',
        'Suggested follow-up questions',
        '3 database connections',
        'CSV & Excel file uploads',
        '100,000 rows per source',
        'Visual charts & graphs',
        'Email support',
      ],
      popular: true,
    },
    {
      name: 'Enterprise',
      monthlyPrice: 249,
      annualPrice: Math.round(249 * 12 * 0.85), // 15% off = $2,540/year
      description: 'Enterprise-grade intelligence',
      features: [
        'Unlimited AI queries',
        'Unlimited response length',
        'Visual charts & graphs',
        'Forecasting & predictions',
        '10 database connections',
        'CSV & Excel file uploads',
        'Unlimited rows per source',
        'Priority support',
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
          
          {/* Annual/Monthly Toggle */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Label htmlFor="annual-toggle" className={`text-lg ${!isAnnual ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>
              Monthly
            </Label>
            <Switch
              id="annual-toggle"
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
              className="data-[state=checked]:bg-primary"
            />
            <Label htmlFor="annual-toggle" className={`text-lg ${isAnnual ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>
              Annual
              <Badge variant="secondary" className="ml-2">Save 15%</Badge>
            </Label>
          </div>
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
                  {plan.monthlyPrice === 0 ? (
                    'Free'
                  ) : (
                    <>
                      ${isAnnual ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice}
                      <span className="text-lg font-normal text-gray-600">/month</span>
                    </>
                  )}
                </div>
                {plan.monthlyPrice > 0 && isAnnual && (
                  <div className="text-sm text-gray-500 mb-2">
                    ${plan.annualPrice} billed annually
                  </div>
                )}
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
                aria-label={`Select ${plan.name} plan - ${plan.monthlyPrice === 0 ? 'Free' : isAnnual ? `$${Math.round(plan.annualPrice / 12)}/month billed annually` : `$${plan.monthlyPrice}/month`}`}
              >
                {plan.monthlyPrice === 0 ? 'Get Started Free' : 'Start Free Trial'}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
