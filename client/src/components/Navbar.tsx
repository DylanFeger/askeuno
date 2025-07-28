import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { MessageCircle, Database, Settings, LogOut, CreditCard, TrendingUp } from 'lucide-react';
import HyppoLogo from '@/components/HyppoLogo';
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

  const navItems = [
    { path: '/chat', label: 'Chat', icon: MessageCircle },
    { path: '/connections', label: 'Data Sources', icon: Database },
  ];

  return (
    <div>
      {/* Banner for users without data */}
      {user && !hasDataSources && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20">
          <div className="container mx-auto px-4 py-2">
            <Link href="/start-tracking">
              <div className="flex items-center justify-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  No data yet? Start tracking now
                </span>
              </div>
            </Link>
          </div>
        </div>
      )}
      
      <nav className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/">
                <div className="flex items-center cursor-pointer hover:opacity-80 transition-opacity">
                  <HyppoLogo className="w-8 h-8" />
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
                        ? 'bg-sage-100 text-sage-700' 
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
              </span>
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