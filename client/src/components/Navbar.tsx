import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { MessageCircle, Database, Settings, LogOut, CreditCard, TrendingUp, BookOpen, Users } from 'lucide-react';
import EunoLogo from '@/components/EunoLogo';
import { apiRequest } from '@/lib/queryClient';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [hasDataSources, setHasDataSources] = useState(true);

  useEffect(() => {
    // Check if user has any data sources
    const checkDataSources = async () => {
      if (user) {
        try {
          const response = await apiRequest('GET', '/api/data-sources');
          const dataSources = await response.json();
          setHasDataSources(dataSources.length > 0);
        } catch (error) {
          console.error('Error checking data sources:', error);
        }
      }
    };
    checkDataSources();
  }, [user, location]);

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
      logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Different navigation items based on user role
  const isChatOnlyUser = user?.role === 'chat_only_user';
  const isEnterpriseMainUser = user?.subscriptionTier === 'enterprise' && user?.role === 'main_user';
  
  let navItems = [];
  
  if (isChatOnlyUser) {
    // Chat-only users can only access chat
    navItems = [
      { path: '/chat', label: 'Chat', icon: MessageCircle },
    ];
  } else {
    // Main users get full navigation
    navItems = [
      { path: '/chat', label: 'Chat', icon: MessageCircle },
      { path: '/connections', label: 'Data Sources', icon: Database },
      { path: '/blog', label: 'Blog', icon: BookOpen },
      { path: '/resources', label: 'Resources', icon: TrendingUp },
    ];
  }

  return (
    <div>

      
      <nav className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/">
                <div className="flex items-center cursor-pointer hover:opacity-80 transition-opacity">
                  <EunoLogo className="w-8 h-8" />
                  <span className="ml-3 text-xl font-bold text-gray-900">Euno</span>
                </div>
              </Link>
            
            <div className="hidden md:flex space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                
                return (
                  <Link key={item.path} href={item.path}>
                    <div className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                      isActive 
                        ? 'bg-green-100 text-green-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}>
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.username}
                {isChatOnlyUser && <span className="ml-2 text-xs text-muted-foreground">(Chat-only)</span>}
              </span>
              
              {/* Show Team management for Enterprise main users */}
              {isEnterpriseMainUser && (
                <Link href="/team">
                  <Button
                    variant="ghost"
                    size="sm"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Team
                  </Button>
                </Link>
              )}
              
              {/* Hide Settings and Subscription for chat-only users */}
              {!isChatOnlyUser && (
                <>
                  <Link href="/settings">
                    <Button
                      variant="ghost"
                      size="sm"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Button>
                  </Link>
                  <Link href="/subscription">
                    <Button
                      variant="ghost"
                      size="sm"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Subscription
                    </Button>
                  </Link>
                </>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
    </div>
  );
}