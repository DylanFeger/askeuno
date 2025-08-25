import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Lock, TrendingUp } from 'lucide-react';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  requiredTier: 'professional' | 'enterprise';
  currentTier: string;
  feature: string;
  onUpgrade?: () => void;
}

const tierFeatures = {
  professional: {
    name: 'Professional',
    price: '$99/month',
    features: [
      '25 queries per hour',
      'Extended 180-word responses',
      'Suggested follow-up questions',
      '3 database connections',
      'Visual charts & graphs',
    ]
  },
  enterprise: {
    name: 'Enterprise',
    price: '$249/month',
    features: [
      'Unlimited queries',
      'Unlimited response length',
      'Forecasting & predictions',
      '10 database connections',
      'Team management (5 users)',
      'Priority support',
    ]
  }
};

export default function UpgradePrompt({
  isOpen,
  onClose,
  requiredTier,
  currentTier,
  feature,
  onUpgrade
}: UpgradePromptProps) {
  const [, setLocation] = useLocation();
  const tier = tierFeatures[requiredTier];

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      setLocation(`/subscription?upgrade=${requiredTier}`);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-5 w-5 text-yellow-600" />
            <Badge variant="secondary">{tier.name} Required</Badge>
          </div>
          <DialogTitle>Upgrade to Access This Feature</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{feature}</span> requires a {tier.name} subscription.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">{tier.name} Plan</h4>
              <span className="text-lg font-bold text-primary">{tier.price}</span>
            </div>
            
            <div className="space-y-2">
              {tier.features.map((feat, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleUpgrade} className="flex-1">
              <TrendingUp className="mr-2 h-4 w-4" />
              Upgrade Now
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Maybe Later
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            You're currently on the {currentTier === 'starter' ? 'Free' : currentTier} plan
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}