import { useState } from 'react';
import { Plus, BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'wouter';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import type { DataSource } from '@shared/schema';

export default function Dashboards() {
  const { user, isAuthenticated } = useAuth();
  
  const { data: dataSources = [] } = useQuery<DataSource[]>({
    queryKey: ['/api/data-sources'],
    enabled: isAuthenticated,
  });

  const sampleDashboards = [
    {
      id: 1,
      name: 'Sales Overview',
      description: 'Track your sales performance and revenue metrics',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      metrics: [
        { label: 'Total Revenue', value: '$45,231' },
        { label: 'Growth', value: '+12.5%' },
      ]
    },
    {
      id: 2,
      name: 'Customer Analytics',
      description: 'Understand your customer behavior and engagement',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      metrics: [
        { label: 'Active Users', value: '2,543' },
        { label: 'Retention', value: '87%' },
      ]
    },
    {
      id: 3,
      name: 'Performance Metrics',
      description: 'Monitor key business performance indicators',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      metrics: [
        { label: 'Efficiency', value: '94%' },
        { label: 'Uptime', value: '99.9%' },
      ]
    },
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-lg mx-auto mt-16 p-8 text-center">
            <CardHeader>
              <CardTitle>Login Required</CardTitle>
              <CardDescription>
                Please log in to access your dashboards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/">
                <Button>Go to Login</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboards</h1>
              <p className="text-gray-600 mt-1">
                Monitor your business metrics in real-time
              </p>
            </div>
            <Button
              onClick={() => alert('Dashboard creation coming soon!')}
              aria-label="Create new dashboard"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Dashboard
            </Button>
          </div>
        </div>

        {dataSources.length === 0 ? (
          <Card className="p-8 text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No data sources connected
            </h3>
            <p className="text-gray-600 mb-6">
              Connect data sources first to create dashboards
            </p>
            <Link href="/connections">
              <Button>Connect Data Sources</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sampleDashboards.map((dashboard) => {
              const Icon = dashboard.icon;
              return (
                <Card key={dashboard.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-lg ${dashboard.bgColor}`}>
                        <Icon className={`w-6 h-6 ${dashboard.color}`} />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => alert(`Viewing ${dashboard.name} dashboard coming soon!`)}
                        aria-label={`View ${dashboard.name} dashboard`}
                      >
                        View
                      </Button>
                    </div>
                    <CardTitle className="mt-4">{dashboard.name}</CardTitle>
                    <CardDescription>{dashboard.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {dashboard.metrics.map((metric, idx) => (
                        <div key={idx}>
                          <p className="text-sm text-gray-600">{metric.label}</p>
                          <p className="text-xl font-bold">{metric.value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Coming Soon
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6 bg-gray-50 border-dashed">
              <h3 className="font-medium text-gray-900 mb-2">
                Custom Visualizations
              </h3>
              <p className="text-sm text-gray-600">
                Build custom charts and graphs tailored to your business needs
              </p>
            </Card>
            <Card className="p-6 bg-gray-50 border-dashed">
              <h3 className="font-medium text-gray-900 mb-2">
                Real-time Alerts
              </h3>
              <p className="text-sm text-gray-600">
                Set up alerts when metrics exceed thresholds or anomalies are detected
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}