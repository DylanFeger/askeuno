import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { MessageCircle, Database, Settings, LogOut, CreditCard, TrendingUp, BookOpen, Users, Menu, X } from 'lucide-react';
import EunoLogo from '@/components/EunoLogo';
import { apiRequest } from '@/lib/queryClient';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [hasDataSources, setHasDataSources] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      { path: '/resources', label: 'Resources', icon: TrendingUp },
    ];
  }

  return (
    <nav className="bg-white border-b relative">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center cursor-pointer hover:opacity-80 transition-opacity">
              <EunoLogo className="w-8 h-8" />
              <span className="ml-3 text-xl font-bold text-gray-900">Euno</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <div className="flex space-x-4">
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

            {/* Desktop User Menu */}
            {user && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {user.username}
                  {isChatOnlyUser && <span className="ml-2 text-xs text-muted-foreground">(Chat-only)</span>}
                </span>
                
                {/* Show Team management for Enterprise main users */}
                {isEnterpriseMainUser && (
                  <Link href="/team">
                    <Button variant="ghost" size="sm">
                      <Users className="h-4 w-4 mr-2" />
                      Team
                    </Button>
                  </Link>
                )}
                
                {/* Hide Settings and Subscription for chat-only users */}
                {!isChatOnlyUser && (
                  <>
                    <Link href="/settings">
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Button>
                    </Link>
                    <Link href="/subscription">
                      <Button variant="ghost" size="sm">
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

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t py-3">
            {/* Mobile Navigation Items */}
            <div className="space-y-1 pb-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                
                return (
                  <Link key={item.path} href={item.path}>
                    <div 
                      className={`flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium transition-colors cursor-pointer ${
                        isActive 
                          ? 'bg-green-100 text-green-700' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Mobile User Menu */}
            {user && (
              <div className="border-t pt-3 space-y-1">
                <div className="px-3 py-2 text-sm text-gray-600 border-b pb-3 mb-2">
                  Signed in as <span className="font-medium">{user.username}</span>
                  {isChatOnlyUser && <span className="ml-2 text-xs text-muted-foreground">(Chat-only)</span>}
                </div>
                
                {/* Show Team management for Enterprise main users */}
                {isEnterpriseMainUser && (
                  <Link href="/team">
                    <div 
                      className="flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 cursor-pointer"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Users className="h-5 w-5" />
                      <span>Team</span>
                    </div>
                  </Link>
                )}
                
                {/* Hide Settings and Subscription for chat-only users */}
                {!isChatOnlyUser && (
                  <>
                    <Link href="/settings">
                      <div 
                        className="flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 cursor-pointer"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Settings className="h-5 w-5" />
                        <span>Settings</span>
                      </div>
                    </Link>
                    <Link href="/subscription">
                      <div 
                        className="flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 cursor-pointer"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <CreditCard className="h-5 w-5" />
                        <span>Subscription</span>
                      </div>
                    </Link>
                  </>
                )}
                
                <div 
                  className="flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}