import { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useLocation } from 'wouter';

interface User {
  id: number;
  username: string;
  email: string;
  subscriptionTier: string;
  subscriptionStatus?: string;
  billingCycle?: string;
  monthlyQueryCount?: number;
  queryResetDate?: string;
  trialStartDate?: string;
  trialEndDate?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  refetch: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  
  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/auth/me');
        if (!response.ok) return null;
        return response.json();
      } catch {
        return null;
      }
    },
    retry: false,
  });

  const logout = () => {
    // Clear the user data from the cache
    queryClient.setQueryData(['/api/auth/me'], null);
    
    // Invalidate all queries to force refetch
    queryClient.invalidateQueries();
    
    // Redirect to home page
    setLocation('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        isAuthenticated: !!user,
        logout,
        refetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}