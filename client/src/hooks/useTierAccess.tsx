import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import UpgradePrompt from '@/components/UpgradePrompt';

interface TierAccessResult {
  hasAccess: boolean;
  checkAccess: () => boolean;
  requireAccess: () => void;
  UpgradeModal: () => JSX.Element;
}

const tierLevels = {
  'starter': 1,
  'professional': 2,
  'enterprise': 3
};

export function useTierAccess(
  requiredTier: 'starter' | 'professional' | 'enterprise',
  featureName: string
): TierAccessResult {
  const { user } = useAuth();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  
  const currentTier = (user?.subscriptionTier || 'starter') as keyof typeof tierLevels;
  const currentStatus = user?.subscriptionStatus || 'active';
  
  // Check if user has access to the feature
  const hasAccess = () => {
    // Free tier (starter) always has access to starter features
    if (requiredTier === 'starter') {
      return true;
    }
    
    // For paid tiers, check both tier level and subscription status
    const hasRequiredTier = tierLevels[currentTier] >= tierLevels[requiredTier];
    const hasActiveSubscription = currentStatus === 'active';
    
    return hasRequiredTier && hasActiveSubscription;
  };
  
  // Check access and return boolean
  const checkAccess = () => {
    return hasAccess();
  };
  
  // Require access - shows upgrade prompt if needed
  const requireAccess = () => {
    if (!hasAccess()) {
      setShowUpgradePrompt(true);
    }
  };
  
  // Upgrade modal component
  const UpgradeModal = () => (
    <UpgradePrompt
      isOpen={showUpgradePrompt}
      onClose={() => setShowUpgradePrompt(false)}
      requiredTier={requiredTier}
      currentTier={currentTier}
      feature={featureName}
    />
  );
  
  return {
    hasAccess: hasAccess(),
    checkAccess,
    requireAccess,
    UpgradeModal
  };
}