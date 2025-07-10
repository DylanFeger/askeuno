import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Home, Database, Settings, LogOut, BarChart } from 'lucide-react';
import AcreLogo from '@/components/AcreLogo';
import { apiRequest } from '@/lib/queryClient';

export default function Navbar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
      logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/connections', label: 'Data Sources', icon: Database },
    { path: '/dashboards', label: 'Dashboards', icon: BarChart },
  ];

  return (
    <nav className="bg-white border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/">
              <div className="flex items-center cursor-pointer hover:opacity-80 transition-opacity">
                <AcreLogo className="w-8 h-8 text-primary" />
                <span className="ml-3 text-xl font-bold text-gray-900">Acre</span>
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
  );
}