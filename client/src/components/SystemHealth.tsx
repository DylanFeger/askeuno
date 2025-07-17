import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Database, User, FileText, Wifi, Clock } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface SystemStatus {
  status: string;
  timestamp: string;
  user: {
    id: number;
    email: string;
    username: string;
    subscriptionTier: string;
    subscriptionStatus: string;
  };
  system: {
    dataSources: {
      total: number;
      live: number;
      files: number;
      active: number;
      errors: number;
    };
    data: {
      totalRows: number;
      processedToday: number;
    };
    activity: {
      lastUpload: string | null;
      lastSync: string | null;
      totalConversations: number;
    };
  };
}

export default function SystemHealth() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await apiRequest('GET', '/api/health/status');
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
          setError(null);
        } else {
          setError('Failed to fetch system status');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !status) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">Failed to load system status</p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="bg-gradient-to-br from-gray-50 to-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            System Health
          </CardTitle>
          <Badge variant={status.status === 'healthy' ? 'default' : 'destructive'}>
            {status.status === 'healthy' ? 'All Systems Operational' : 'Issues Detected'}
          </Badge>
        </div>
        <CardDescription>Real-time system status and activity</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Info */}
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
          <User className="w-5 h-5 text-gray-600" />
          <div className="flex-1">
            <p className="text-sm font-medium">Logged in as: {status.user.email}</p>
            <p className="text-xs text-gray-600">
              {status.user.subscriptionTier} plan • {status.user.subscriptionStatus} status
            </p>
          </div>
        </div>

        {/* Data Sources */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">Data Sources</span>
            </div>
            <div className="pl-6 space-y-1">
              <p className="text-xs text-gray-600">Total: {status.system.dataSources.total}</p>
              <p className="text-xs text-gray-600">Live connections: {status.system.dataSources.live}</p>
              <p className="text-xs text-gray-600">Uploaded files: {status.system.dataSources.files}</p>
              {status.system.dataSources.errors > 0 && (
                <p className="text-xs text-red-600">Errors: {status.system.dataSources.errors}</p>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">Data Volume</span>
            </div>
            <div className="pl-6 space-y-1">
              <p className="text-xs text-gray-600">Total rows: {status.system.data.totalRows.toLocaleString()}</p>
              <p className="text-xs text-gray-600">Processed today: {status.system.data.processedToday.toLocaleString()}</p>
              <p className="text-xs text-gray-600">Conversations: {status.system.activity.totalConversations}</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium">Recent Activity</span>
          </div>
          <div className="pl-6 space-y-1">
            <p className="text-xs text-gray-600">
              Last upload: {formatDate(status.system.activity.lastUpload)}
            </p>
            <p className="text-xs text-gray-600">
              Last sync: {formatDate(status.system.activity.lastSync)}
            </p>
            <p className="text-xs text-gray-600">
              System updated: {formatDate(status.timestamp)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}