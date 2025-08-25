import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export function ResponseLengthToggle() {
  const { toast } = useToast();
  const [extendedResponses, setExtendedResponses] = useState(false);
  
  // Get user data to check tier and preferences
  const { data: user } = useQuery({
    queryKey: ['/api/auth/me'],
  });
  
  useEffect(() => {
    if (user?.preferences?.extendedResponses !== undefined) {
      setExtendedResponses(user.preferences.extendedResponses);
    }
  }, [user]);
  
  // Only show for Professional and Enterprise tiers
  if (!user || (user.subscriptionTier !== 'professional' && user.subscriptionTier !== 'enterprise')) {
    return null;
  }
  
  const handleToggle = async (checked: boolean) => {
    try {
      setExtendedResponses(checked);
      
      await apiRequest('PATCH', '/api/auth/preferences', {
        extendedResponses: checked
      });
      
      toast({
        title: checked ? "Extended responses enabled" : "Concise responses enabled",
        description: checked 
          ? "AI will provide up to 5 sentences of analysis" 
          : "AI will provide 1-2 sentence responses",
      });
    } catch (error) {
      setExtendedResponses(!checked); // Revert on error
      toast({
        title: "Failed to update preference",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="flex items-center space-x-2 p-4 bg-sage-50 rounded-lg border border-sage-200">
      <Switch
        id="extended-responses"
        checked={extendedResponses}
        onCheckedChange={handleToggle}
        className="data-[state=checked]:bg-sage-600"
      />
      <Label 
        htmlFor="extended-responses" 
        className="cursor-pointer flex-1"
      >
        <div>
          <div className="font-medium text-sage-900">
            Extended Responses
          </div>
          <div className="text-sm text-sage-600">
            {extendedResponses 
              ? "Get detailed analysis (up to 5 sentences)" 
              : "Get concise insights (1-2 sentences)"}
          </div>
        </div>
      </Label>
    </div>
  );
}