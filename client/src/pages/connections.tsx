import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Cloud, Building2, ShoppingCart, BarChart3, FileSpreadsheet, Server, Wifi, AlertCircle, CheckCircle, Upload, FileIcon, Trash2, Shield, TrendingUp, Users, Mail, Code, DollarSign, Activity, Package, Briefcase, RefreshCw, Loader2, Plus, Search } from 'lucide-react';
import { FaGoogle } from 'react-icons/fa';
import { Link, useLocation } from 'wouter';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const dataSourceTypes = [
  // CRM
  { id: 'hubspot', name: 'HubSpot', icon: Users, category: 'crm' },
  { id: 'pipedrive', name: 'Pipedrive', icon: Users, category: 'crm' },
  { id: 'zoho_crm', name: 'Zoho CRM', icon: Users, category: 'crm' },
  { id: 'dynamics', name: 'Microsoft Dynamics', icon: Users, category: 'crm' },
  { id: 'salesforce', name: 'Salesforce', icon: Building2, category: 'crm' },
  { id: 'intercom', name: 'Intercom', icon: Users, category: 'crm' },
  { id: 'zendesk', name: 'Zendesk', icon: Users, category: 'crm' },
  { id: 'freshdesk', name: 'Freshdesk', icon: Users, category: 'crm' },
  
  // Marketing
  { id: 'googleads', name: 'Google Ads', icon: BarChart3, category: 'marketing' },
  { id: 'facebook_ads', name: 'Facebook Ads', icon: BarChart3, category: 'marketing' },
  { id: 'instagram', name: 'Instagram', icon: BarChart3, category: 'marketing' },
  { id: 'linkedin_ads', name: 'LinkedIn Ads', icon: BarChart3, category: 'marketing' },
  { id: 'twitter_ads', name: 'Twitter Ads', icon: BarChart3, category: 'marketing' },
  { id: 'mailchimp', name: 'Mailchimp', icon: Mail, category: 'marketing' },
  { id: 'sendgrid', name: 'SendGrid', icon: Mail, category: 'marketing' },
  { id: 'klaviyo', name: 'Klaviyo', icon: Mail, category: 'marketing' },
  { id: 'activecampaign', name: 'ActiveCampaign', icon: Mail, category: 'marketing' },
  { id: 'constantcontact', name: 'Constant Contact', icon: Mail, category: 'marketing' },
  { id: 'twilio', name: 'Twilio', icon: Mail, category: 'marketing' },
  
  // E-commerce
  { id: 'shopify', name: 'Shopify', icon: ShoppingCart, category: 'ecommerce' },
  { id: 'lightspeed', name: 'Lightspeed', icon: ShoppingCart, category: 'ecommerce' },
  { id: 'woocommerce', name: 'WooCommerce', icon: ShoppingCart, category: 'ecommerce' },
  { id: 'amazon_seller', name: 'Amazon Seller', icon: ShoppingCart, category: 'ecommerce' },
  { id: 'ebay', name: 'eBay', icon: ShoppingCart, category: 'ecommerce' },
  { id: 'bigcommerce', name: 'BigCommerce', icon: ShoppingCart, category: 'ecommerce' },
  
  // Payments
  { id: 'stripe', name: 'Stripe', icon: DollarSign, category: 'payments' },
  { id: 'square', name: 'Square', icon: DollarSign, category: 'payments' },
  { id: 'paypal', name: 'PayPal', icon: DollarSign, category: 'payments' },
  
  // Accounting/Finance
  { id: 'quickbooks', name: 'QuickBooks', icon: Briefcase, category: 'accounting' },
  { id: 'xero', name: 'Xero', icon: Briefcase, category: 'accounting' },
  { id: 'netsuite', name: 'NetSuite', icon: Briefcase, category: 'accounting' },
  { id: 'freshbooks', name: 'FreshBooks', icon: Briefcase, category: 'accounting' },
  
  // Analytics
  { id: 'google_analytics', name: 'Google Analytics', icon: Activity, category: 'analytics' },
  { id: 'mixpanel', name: 'Mixpanel', icon: Activity, category: 'analytics' },
  { id: 'segment', name: 'Segment', icon: Activity, category: 'analytics' },
  { id: 'amplitude', name: 'Amplitude', icon: Activity, category: 'analytics' },
  { id: 'snowflake', name: 'Snowflake', icon: Activity, category: 'analytics' },
  { id: 'bigquery', name: 'BigQuery', icon: Activity, category: 'analytics' },
  { id: 'redshift', name: 'Redshift', icon: Activity, category: 'analytics' },
  { id: 'datadog', name: 'Datadog', icon: Activity, category: 'analytics' },
  { id: 'newrelic', name: 'New Relic', icon: Activity, category: 'analytics' },
  { id: 'sentry', name: 'Sentry', icon: Activity, category: 'analytics' },
  
  // Productivity
  { id: 'slack', name: 'Slack', icon: Package, category: 'productivity' },
  { id: 'trello', name: 'Trello', icon: Package, category: 'productivity' },
  { id: 'asana', name: 'Asana', icon: Package, category: 'productivity' },
  { id: 'jira', name: 'Jira', icon: Package, category: 'productivity' },
  { id: 'clickup', name: 'ClickUp', icon: Package, category: 'productivity' },
  { id: 'monday', name: 'Monday.com', icon: Package, category: 'productivity' },
  { id: 'notion', name: 'Notion', icon: Package, category: 'productivity' },
  { id: 'airtable', name: 'Airtable', icon: Package, category: 'productivity' },
  { id: 'github', name: 'GitHub', icon: Code, category: 'productivity' },
  { id: 'gitlab', name: 'GitLab', icon: Code, category: 'productivity' },
  { id: 'bitbucket', name: 'Bitbucket', icon: Code, category: 'productivity' },
  { id: 'pagerduty', name: 'PagerDuty', icon: Package, category: 'productivity' },
  { id: 'opsgenie', name: 'Opsgenie', icon: Package, category: 'productivity' },
  
  // Databases
  { id: 'mysql', name: 'MySQL', icon: Database, category: 'database' },
  { id: 'postgres', name: 'PostgreSQL', icon: Database, category: 'database' },
  { id: 'mongodb', name: 'MongoDB', icon: Database, category: 'database' },
  
  // Cloud Storage
  { id: 'googlesheets', name: 'Google Sheets', icon: FileSpreadsheet, category: 'cloud' },
  { id: 's3', name: 'AWS S3', icon: Cloud, category: 'cloud' },
  
  // Generic
  { id: 'api', name: 'Custom API', icon: Server, category: 'api' },
];

// Define data source limits per tier
const DATA_SOURCE_LIMITS = {
  starter: 1,
  professional: 3,  
  enterprise: 10
};

export default function ConnectionsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [connectionForm, setConnectionForm] = useState<any>({});
  const [deleteConfirmation, setDeleteConfirmation] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Move all hooks before conditional returns
  const { data: connections = [] } = useQuery<any[]>({
    queryKey: ['/api/data-sources'],
    enabled: isAuthenticated, // Only fetch when authenticated
  });

  const createConnectionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/data-sources/connect', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Connection created!',
        description: 'Your data source has been connected successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Connection failed',
        description: error.message || 'Please check your connection details.',
        variant: 'destructive',
      });
    },
  });

  const deleteDataSourceMutation = useMutation({
    mutationFn: async (dataSourceId: number) => {
      const response = await apiRequest('DELETE', `/api/data-sources/${dataSourceId}`);
      if (!response.ok) {
        throw new Error('Failed to delete data source');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Data source removed successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
      setDeleteConfirmation(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to remove data source. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/signin');
    }
  }, [isAuthenticated, isLoading, setLocation]);
  
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }
  
  // Calculate current usage and limit
  const userTier = user?.subscriptionTier || 'starter';
  const dataSourceLimit = DATA_SOURCE_LIMITS[userTier as keyof typeof DATA_SOURCE_LIMITS] || DATA_SOURCE_LIMITS.starter;
  const canAddMore = connections.length < dataSourceLimit;

  const resetForm = () => {
    setSelectedType('');
    setConnectionForm({});
    setSearchQuery('');
    setSelectedCategory('all');
  };

  const renderConnectionForm = () => {
    switch (selectedType) {
      case 'mysql':
      case 'postgres':
        return (
          <div className="space-y-4">
            <Alert className="mb-4 bg-sage-50 dark:bg-sage-900/20 border-sage-200 dark:border-sage-800">
              <Database className="h-4 w-4 text-sage-600 dark:text-sage-400" />
              <AlertDescription>
                <strong>{selectedType === 'postgres' ? 'PostgreSQL' : 'MySQL'} Live Database Connection</strong><br />
                Connect directly to your database for real-time queries and analytics. Data stays in your database - we only read when you ask questions.
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="connectionName">Connection Name</Label>
              <Input
                id="connectionName"
                placeholder="Production Database"
                value={connectionForm.name || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, name: e.target.value })}
              />
            </div>
            <Tabs value={connectionForm.connectionMethod || 'manual'} onValueChange={(value) => setConnectionForm({ ...connectionForm, connectionMethod: value })}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Manual Configuration</TabsTrigger>
                <TabsTrigger value="string">Connection String</TabsTrigger>
              </TabsList>
              <TabsContent value="manual" className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="host">Host</Label>
                    <Input
                      id="host"
                      placeholder="db.example.com"
                      value={connectionForm.host || ''}
                      onChange={(e) => setConnectionForm({ ...connectionForm, host: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="port">Port</Label>
                    <Input
                      id="port"
                      type="number"
                      placeholder={selectedType === 'mysql' ? '3306' : '5432'}
                      value={connectionForm.port || ''}
                      onChange={(e) => setConnectionForm({ ...connectionForm, port: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="database">Database Name</Label>
                  <Input
                    id="database"
                    placeholder="production_db"
                    value={connectionForm.database || ''}
                    onChange={(e) => setConnectionForm({ ...connectionForm, database: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="db_user"
                    value={connectionForm.username || ''}
                    onChange={(e) => setConnectionForm({ ...connectionForm, username: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={connectionForm.password || ''}
                    onChange={(e) => setConnectionForm({ ...connectionForm, password: e.target.value })}
                  />
                </div>
              </TabsContent>
              <TabsContent value="string" className="space-y-2">
                <div>
                  <Label htmlFor="connectionString">Connection String</Label>
                  <Input
                    id="connectionString"
                    type="password"
                    placeholder={selectedType === 'postgres' 
                      ? 'postgresql://user:password@host:5432/database'
                      : 'mysql://user:password@host:3306/database'}
                    value={connectionForm.connectionString || ''}
                    onChange={(e) => setConnectionForm({ ...connectionForm, connectionString: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Your connection string is encrypted and stored securely</p>
                </div>
              </TabsContent>
            </Tabs>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sslMode"
                  checked={connectionForm.sslMode || false}
                  onChange={(e) => setConnectionForm({ ...connectionForm, sslMode: e.target.checked })}
                />
                <Label htmlFor="sslMode" className="text-sm">Use SSL/TLS encryption (recommended for production)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="readOnly"
                  checked={connectionForm.readOnly !== false}
                  onChange={(e) => setConnectionForm({ ...connectionForm, readOnly: e.target.checked })}
                />
                <Label htmlFor="readOnly" className="text-sm">Read-only access (recommended for safety)</Label>
              </div>
            </div>
            <Alert>
              <AlertDescription className="text-sm">
                <strong>Security Note:</strong> We recommend creating a dedicated read-only user for Euno. This ensures your data remains safe while enabling powerful analytics.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'mongodb':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="connectionString">Connection String</Label>
              <Input
                id="connectionString"
                placeholder="mongodb://username:password@host:port/database"
                value={connectionForm.connectionString || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, connectionString: e.target.value })}
              />
            </div>
          </div>
        );

      case 'googlesheets':
        return (
          <div className="space-y-4">
            <Alert className="mb-4 bg-sage-50 dark:bg-sage-900/20 border-sage-200 dark:border-sage-800">
              <Shield className="h-4 w-4 text-sage-600 dark:text-sage-400" />
              <AlertDescription>
                <strong>Google Sheets Live Connection</strong><br />
                Connect your Google Sheets for real-time data sync. Changes in your sheets are automatically reflected in your analytics.
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="connectionName">Connection Name</Label>
              <Input
                id="connectionName"
                placeholder="My Sales Data"
                value={connectionForm.name || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, name: e.target.value })}
              />
            </div>
            <Button 
              className="w-full" 
              variant="default"
              onClick={() => {
                // Store connection name in session for OAuth callback
                sessionStorage.setItem('googleSheetsConnectionName', connectionForm.name || 'Google Sheets Connection');
                // Initiate OAuth2 flow
                window.location.href = `/api/auth/google/sheets?redirect=${encodeURIComponent(window.location.origin + '/connections')}`;
              }}
              disabled={!connectionForm.name}
            >
              <FaGoogle className="mr-2" />
              Connect with Google Account
            </Button>
            <div className="text-sm text-gray-600 space-y-2">
              <p className="font-semibold">After authorization:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Select any spreadsheet from your Google Drive</li>
                <li>Data syncs automatically every 5 minutes</li>
                <li>Real-time AI analysis of live data</li>
                <li>No manual downloads or uploads needed</li>
              </ul>
            </div>
            <Alert>
              <AlertDescription className="text-sm">
                <strong>Privacy:</strong> We only request read access to spreadsheets you explicitly select.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 's3':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="bucketName">Bucket Name</Label>
              <Input
                id="bucketName"
                placeholder="my-data-bucket"
                value={connectionForm.bucketName || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, bucketName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                placeholder="us-east-1"
                value={connectionForm.region || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, region: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="accessKeyId">Access Key ID</Label>
              <Input
                id="accessKeyId"
                placeholder="AKIA... (your AWS access key)"
                value={connectionForm.accessKeyId || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, accessKeyId: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="secretAccessKey">Secret Access Key</Label>
              <Input
                id="secretAccessKey"
                type="password"
                placeholder="••••••••"
                value={connectionForm.secretAccessKey || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, secretAccessKey: e.target.value })}
              />
            </div>
          </div>
        );

      case 'lightspeed':
        return (
          <div className="space-y-4">
            <Alert className="mb-4 bg-sage-50 dark:bg-sage-900/20 border-sage-200 dark:border-sage-800">
              <Shield className="h-4 w-4 text-sage-600 dark:text-sage-400" />
              <AlertDescription>
                <strong>Lightspeed Retail POS Integration</strong><br />
                Connect your Lightspeed account to sync sales, inventory, customer data, and product catalogs in real-time.
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="accountId">Account ID</Label>
              <Input
                id="accountId"
                placeholder="Your Lightspeed Account ID"
                value={connectionForm.accountId || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, accountId: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                placeholder="OAuth Client ID from Lightspeed"
                value={connectionForm.clientId || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, clientId: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="clientSecret">Client Secret</Label>
              <Input
                id="clientSecret"
                type="password"
                placeholder="••••••••"
                value={connectionForm.clientSecret || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, clientSecret: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="refreshToken">Refresh Token (Optional)</Label>
              <Input
                id="refreshToken"
                type="password"
                placeholder="Existing refresh token if available"
                value={connectionForm.refreshToken || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, refreshToken: e.target.value })}
              />
            </div>
            <Alert className="mt-2">
              <AlertDescription className="text-sm">
                <strong>How to get credentials:</strong><br />
                1. Log in to your Lightspeed Back Office<br />
                2. Go to Settings → API Access<br />
                3. Create a new API client for Euno<br />
                4. Copy your Client ID and Client Secret
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'salesforce':
        return (
          <div className="space-y-4">
            <Alert className="mb-4 bg-sage-50 dark:bg-sage-900/20 border-sage-200 dark:border-sage-800">
              <Shield className="h-4 w-4 text-sage-600 dark:text-sage-400" />
              <AlertDescription>
                <strong>Salesforce Live Connection</strong><br />
                Connect your Salesforce CRM for real-time access to leads, opportunities, accounts, and custom objects.
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="connectionName">Connection Name</Label>
              <Input
                id="connectionName"
                placeholder="Salesforce Production"
                value={connectionForm.name || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="environment">Environment</Label>
              <Select
                value={connectionForm.environment || 'production'}
                onValueChange={(value) => setConnectionForm({ ...connectionForm, environment: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="developer">Developer Edition</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              className="w-full" 
              variant="default"
              onClick={() => {
                sessionStorage.setItem('salesforceConnectionName', connectionForm.name || 'Salesforce Connection');
                sessionStorage.setItem('salesforceEnvironment', connectionForm.environment || 'production');
                const loginUrl = connectionForm.environment === 'sandbox' ? 'test.salesforce.com' : 'login.salesforce.com';
                window.location.href = `/api/auth/salesforce/connect?loginUrl=${loginUrl}&redirect=${encodeURIComponent(window.location.origin + '/connections')}`;
              }}
              disabled={!connectionForm.name}
            >
              <Shield className="mr-2 h-4 w-4" />
              Connect with Salesforce
            </Button>
            <div className="text-sm text-gray-600 space-y-2">
              <p className="font-semibold">Live data access includes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Real-time CRM data sync</li>
                <li>Leads, Opportunities, and Accounts</li>
                <li>Custom objects and fields</li>
                <li>Reports and dashboards data</li>
                <li>Activity and task tracking</li>
              </ul>
            </div>
          </div>
        );

      case 'shopify':
        return (
          <div className="space-y-4">
            <Alert className="mb-4 bg-sage-50 dark:bg-sage-900/20 border-sage-200 dark:border-sage-800">
              <Shield className="h-4 w-4 text-sage-600 dark:text-sage-400" />
              <AlertDescription>
                <strong>Shopify Live Store Connection</strong><br />
                Connect your Shopify store for real-time access to orders, products, customers, and inventory data.
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="connectionName">Connection Name</Label>
              <Input
                id="connectionName"
                placeholder="My Shopify Store"
                value={connectionForm.name || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="storeDomain">Store Domain</Label>
              <Input
                id="storeDomain"
                placeholder="mystore.myshopify.com"
                value={connectionForm.storeDomain || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, storeDomain: e.target.value })}
              />
            </div>
            <Tabs value={connectionForm.authMethod || 'oauth'} onValueChange={(value) => setConnectionForm({ ...connectionForm, authMethod: value })}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="oauth">OAuth (Recommended)</TabsTrigger>
                <TabsTrigger value="private">Private App</TabsTrigger>
              </TabsList>
              <TabsContent value="oauth" className="space-y-2">
                <Button 
                  className="w-full" 
                  variant="default"
                  onClick={() => {
                    sessionStorage.setItem('shopifyConnectionName', connectionForm.name || 'Shopify Store');
                    sessionStorage.setItem('shopifyStoreDomain', connectionForm.storeDomain || '');
                    window.location.href = `/api/auth/shopify/connect?shop=${connectionForm.storeDomain}&redirect=${encodeURIComponent(window.location.origin + '/connections')}`;
                  }}
                  disabled={!connectionForm.name || !connectionForm.storeDomain}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Install Euno App on Shopify
                </Button>
              </TabsContent>
              <TabsContent value="private" className="space-y-2">
                <div>
                  <Label htmlFor="adminApiToken">Admin API Access Token</Label>
                  <Input
                    id="adminApiToken"
                    type="password"
                    placeholder="shpat_..."
                    value={connectionForm.adminApiToken || ''}
                    onChange={(e) => setConnectionForm({ ...connectionForm, adminApiToken: e.target.value })}
                  />
                </div>
                <Alert>
                  <AlertDescription className="text-sm">
                    <strong>How to create a Private App:</strong><br />
                    1. Go to Settings → Apps → Develop apps<br />
                    2. Create a private app for Euno<br />
                    3. Grant read access to required scopes<br />
                    4. Copy the Admin API access token
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>
            <div className="text-sm text-gray-600 space-y-2">
              <p className="font-semibold">Live store data includes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Real-time order tracking</li>
                <li>Product catalog and variants</li>
                <li>Customer profiles and segments</li>
                <li>Inventory levels</li>
                <li>Sales analytics and trends</li>
              </ul>
            </div>
          </div>
        );

      case 'googleads':
        return (
          <div className="space-y-4">
            <Alert className="mb-4 bg-sage-50 dark:bg-sage-900/20 border-sage-200 dark:border-sage-800">
              <Shield className="h-4 w-4 text-sage-600 dark:text-sage-400" />
              <AlertDescription>
                <strong>Google Ads Live Connection</strong><br />
                Connect your Google Ads account for real-time campaign performance and ad spend analytics.
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="connectionName">Connection Name</Label>
              <Input
                id="connectionName"
                placeholder="Google Ads Account"
                value={connectionForm.name || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, name: e.target.value })}
              />
            </div>
            <Button 
              className="w-full" 
              variant="default"
              onClick={() => {
                sessionStorage.setItem('googleAdsConnectionName', connectionForm.name || 'Google Ads Connection');
                window.location.href = `/api/auth/google/ads?redirect=${encodeURIComponent(window.location.origin + '/connections')}`;
              }}
              disabled={!connectionForm.name}
            >
              <FaGoogle className="mr-2" />
              Connect with Google Ads
            </Button>
            <div className="text-sm text-gray-600 space-y-2">
              <p className="font-semibold">Live advertising data includes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Campaign performance metrics</li>
                <li>Ad spend and budget tracking</li>
                <li>Keyword performance</li>
                <li>Conversion tracking</li>
                <li>ROI and ROAS analytics</li>
              </ul>
            </div>
          </div>
        );

      case 'stripe':
        return (
          <div className="space-y-4">
            <Alert className="mb-4 bg-sage-50 dark:bg-sage-900/20 border-sage-200 dark:border-sage-800">
              <Shield className="h-4 w-4 text-sage-600 dark:text-sage-400" />
              <AlertDescription>
                <strong>Stripe Live Data Connection</strong><br />
                Connect your Stripe account for real-time payment analytics. Automatically sync transactions, customers, subscriptions, and revenue data.
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="connectionName">Connection Name</Label>
              <Input
                id="connectionName"
                placeholder="Stripe Production"
                value={connectionForm.name || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="stripeSecretKey">Secret Key</Label>
              <Input
                id="stripeSecretKey"
                type="password"
                placeholder="sk_live_... or sk_test_..."
                value={connectionForm.apiKey || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, apiKey: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">Use sk_test_ for testing or sk_live_ for production data</p>
            </div>
            <div>
              <Label htmlFor="webhookEndpoint">Webhook Endpoint (Optional)</Label>
              <Input
                id="webhookEndpoint"
                placeholder="https://your-domain.com/webhooks/stripe"
                value={connectionForm.webhookEndpoint || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, webhookEndpoint: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">For real-time event updates (we'll set this up for you)</p>
            </div>
            <div className="text-sm text-gray-600 space-y-2">
              <p className="font-semibold">Live data includes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Real-time payment transactions</li>
                <li>Customer profiles and lifetime value</li>
                <li>Subscription metrics and MRR</li>
                <li>Refunds and dispute tracking</li>
                <li>Revenue analytics and forecasts</li>
              </ul>
            </div>
            <Alert>
              <AlertDescription className="text-sm">
                <strong>How to get your API key:</strong><br />
                1. Go to <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="underline text-sage-600">Stripe Dashboard → API Keys</a><br />
                2. Copy your Secret key (starts with sk_)<br />
                3. Use Restricted keys for enhanced security
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'square':
        return (
          <div className="space-y-4">
            <Alert className="mb-4">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Square Integration</strong><br />
                Connect your Square account to sync transactions, inventory, and customer data from your point of sale.
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="squareAccessToken">Access Token</Label>
              <Input
                id="squareAccessToken"
                type="password"
                placeholder="EAAAE..."
                value={connectionForm.apiKey || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, apiKey: e.target.value })}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Get this from Square Developer Dashboard → Applications → Access Tokens
              </p>
            </div>
            <div>
              <Label htmlFor="environment">Environment</Label>
              <Select
                value={connectionForm.environment || 'production'}
                onValueChange={(value) => setConnectionForm({ ...connectionForm, environment: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'paypal':
        return (
          <div className="space-y-4">
            <Alert className="mb-4">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>PayPal Integration</strong><br />
                Connect your PayPal Business account to track payments, refunds, and transaction fees.
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="paypalClientId">Client ID</Label>
              <Input
                id="paypalClientId"
                placeholder="AWj..."
                value={connectionForm.clientId || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, clientId: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="paypalClientSecret">Client Secret</Label>
              <Input
                id="paypalClientSecret"
                type="password"
                placeholder="••••••••"
                value={connectionForm.clientSecret || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, clientSecret: e.target.value })}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Find these in PayPal Developer Dashboard → My Apps & Credentials
              </p>
            </div>
          </div>
        );

      case 'quickbooks':
        return (
          <div className="space-y-4">
            <Alert className="mb-4">
              <Building2 className="h-4 w-4" />
              <AlertDescription>
                <strong>QuickBooks Integration</strong><br />
                Connect your QuickBooks account to sync invoices, expenses, and financial reports.
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="quickbooksCompanyId">Company ID</Label>
              <Input
                id="quickbooksCompanyId"
                placeholder="123456789"
                value={connectionForm.companyId || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, companyId: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="quickbooksAccessToken">Access Token</Label>
              <Input
                id="quickbooksAccessToken"
                type="password"
                placeholder="••••••••"
                value={connectionForm.apiKey || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, apiKey: e.target.value })}
              />
              <p className="text-sm text-muted-foreground mt-1">
                You'll need to authorize Euno in your QuickBooks account first
              </p>
            </div>
          </div>
        );

      case 'api':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="endpoint">API Endpoint</Label>
              <Input
                id="endpoint"
                placeholder="https://api.example.com/data"
                value={connectionForm.endpoint || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, endpoint: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="method">HTTP Method</Label>
              <Select
                value={connectionForm.method || 'GET'}
                onValueChange={(value) => setConnectionForm({ ...connectionForm, method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="headers">Headers (JSON)</Label>
              <Input
                id="headers"
                placeholder='{"Authorization": "Bearer token"}'
                value={connectionForm.headers || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, headers: e.target.value })}
              />
            </div>
          </div>
        );

      // Default case for all other connectors that need API keys
      case 'instagram':
      case 'facebook':
      case 'twitter':
      case 'linkedin':
      case 'pinterest':
      case 'youtube':
      case 'tiktok':
      case 'snapchat':
        return (
          <div className="space-y-4">
            <Alert className="mb-4 bg-sage-50 dark:bg-sage-900/20 border-sage-200 dark:border-sage-800">
              <Shield className="h-4 w-4 text-sage-600 dark:text-sage-400" />
              <AlertDescription>
                <strong>{dataSourceTypes.find(ds => ds.id === selectedType)?.name} Live Connection</strong><br />
                Connect your account for real-time data sync and analytics.
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="connectionName">Connection Name</Label>
              <Input
                id="connectionName"
                placeholder={`My ${dataSourceTypes.find(ds => ds.id === selectedType)?.name} Account`}
                value={connectionForm.name || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="accessToken">Access Token</Label>
              <Input
                id="accessToken"
                type="password"
                placeholder="Your access token or API key"
                value={connectionForm.apiKey || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, apiKey: e.target.value })}
              />
            </div>
            <Alert>
              <AlertDescription className="text-sm">
                <strong>How to get your access token:</strong><br />
                1. Go to your {dataSourceTypes.find(ds => ds.id === selectedType)?.name} Developer Portal<br />
                2. Create an app or project for Euno<br />
                3. Generate an access token with analytics permissions<br />
                4. Copy and paste it above
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'pipedrive':
      case 'hubspot':
      case 'zendesk':
      case 'intercom':
      case 'freshdesk':
      case 'zoho':
        return (
          <div className="space-y-4">
            <Alert className="mb-4 bg-sage-50 dark:bg-sage-900/20 border-sage-200 dark:border-sage-800">
              <Shield className="h-4 w-4 text-sage-600 dark:text-sage-400" />
              <AlertDescription>
                <strong>{dataSourceTypes.find(ds => ds.id === selectedType)?.name} CRM Connection</strong><br />
                Connect your CRM for real-time access to contacts, deals, and sales pipeline data.
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="connectionName">Connection Name</Label>
              <Input
                id="connectionName"
                placeholder={`${dataSourceTypes.find(ds => ds.id === selectedType)?.name} CRM`}
                value={connectionForm.name || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="apiToken">API Token</Label>
              <Input
                id="apiToken"
                type="password"
                placeholder="Your API token"
                value={connectionForm.apiKey || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, apiKey: e.target.value })}
              />
            </div>
            {(selectedType === 'pipedrive' || selectedType === 'hubspot' || selectedType === 'zoho') && (
              <div>
                <Label htmlFor="domain">Company Domain</Label>
                <Input
                  id="domain"
                  placeholder={selectedType === 'pipedrive' ? 'mycompany.pipedrive.com' : 'mycompany'}
                  value={connectionForm.domain || ''}
                  onChange={(e) => setConnectionForm({ ...connectionForm, domain: e.target.value })}
                />
              </div>
            )}
            <Alert>
              <AlertDescription className="text-sm">
                <strong>How to get your API token:</strong><br />
                1. Go to Settings → API or Integrations<br />
                2. Generate a new API token for Euno<br />
                3. Grant read permissions for contacts, deals, and activities<br />
                4. Copy the token above
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'mailchimp':
      case 'sendgrid':
      case 'mailgun':
      case 'sendinblue':
      case 'activecampaign':
      case 'constantcontact':
      case 'klaviyo':
        return (
          <div className="space-y-4">
            <Alert className="mb-4 bg-sage-50 dark:bg-sage-900/20 border-sage-200 dark:border-sage-800">
              <Shield className="h-4 w-4 text-sage-600 dark:text-sage-400" />
              <AlertDescription>
                <strong>{dataSourceTypes.find(ds => ds.id === selectedType)?.name} Email Marketing Connection</strong><br />
                Connect your email platform for campaign analytics and subscriber insights.
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="connectionName">Connection Name</Label>
              <Input
                id="connectionName"
                placeholder={`${dataSourceTypes.find(ds => ds.id === selectedType)?.name} Account`}
                value={connectionForm.name || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Your API key"
                value={connectionForm.apiKey || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, apiKey: e.target.value })}
              />
            </div>
            {selectedType === 'mailchimp' && (
              <div>
                <Label htmlFor="serverPrefix">Server Prefix</Label>
                <Input
                  id="serverPrefix"
                  placeholder="us1, us2, etc. (found in your API key)"
                  value={connectionForm.serverPrefix || ''}
                  onChange={(e) => setConnectionForm({ ...connectionForm, serverPrefix: e.target.value })}
                />
              </div>
            )}
            <Alert>
              <AlertDescription className="text-sm">
                <strong>How to get your API key:</strong><br />
                1. Go to Account Settings → API Keys<br />
                2. Create a new API key for Euno<br />
                3. Copy the full API key<br />
                {selectedType === 'mailchimp' && '4. The server prefix is the part after the dash in your API key (e.g., us1)'}
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'quickbooks':
      case 'xero':
      case 'wave':
      case 'freshbooks':
      case 'sage':
        return (
          <div className="space-y-4">
            <Alert className="mb-4 bg-sage-50 dark:bg-sage-900/20 border-sage-200 dark:border-sage-800">
              <Shield className="h-4 w-4 text-sage-600 dark:text-sage-400" />
              <AlertDescription>
                <strong>{dataSourceTypes.find(ds => ds.id === selectedType)?.name} Accounting Connection</strong><br />
                Connect your accounting software for financial data and reporting.
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="connectionName">Connection Name</Label>
              <Input
                id="connectionName"
                placeholder={`${dataSourceTypes.find(ds => ds.id === selectedType)?.name} Account`}
                value={connectionForm.name || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, name: e.target.value })}
              />
            </div>
            {selectedType === 'quickbooks' ? (
              <Button 
                className="w-full" 
                variant="default"
                onClick={() => {
                  sessionStorage.setItem('quickbooksConnectionName', connectionForm.name || 'QuickBooks Connection');
                  window.location.href = `/api/auth/quickbooks/connect?redirect=${encodeURIComponent(window.location.origin + '/connections')}`;
                }}
                disabled={!connectionForm.name}
              >
                <Shield className="mr-2 h-4 w-4" />
                Connect with QuickBooks
              </Button>
            ) : (
              <>
                <div>
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input
                    id="clientId"
                    placeholder="Your OAuth Client ID"
                    value={connectionForm.clientId || ''}
                    onChange={(e) => setConnectionForm({ ...connectionForm, clientId: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="clientSecret">Client Secret</Label>
                  <Input
                    id="clientSecret"
                    type="password"
                    placeholder="Your OAuth Client Secret"
                    value={connectionForm.clientSecret || ''}
                    onChange={(e) => setConnectionForm({ ...connectionForm, clientSecret: e.target.value })}
                  />
                </div>
              </>
            )}
            <Alert>
              <AlertDescription className="text-sm">
                <strong>Financial data includes:</strong><br />
                • Invoices and payments<br />
                • Expenses and bills<br />
                • P&L and balance sheets<br />
                • Tax reports
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'googledrive':
      case 'onedrive':
      case 'dropbox':
      case 'box':
        return (
          <div className="space-y-4">
            <Alert className="mb-4 bg-sage-50 dark:bg-sage-900/20 border-sage-200 dark:border-sage-800">
              <Shield className="h-4 w-4 text-sage-600 dark:text-sage-400" />
              <AlertDescription>
                <strong>{dataSourceTypes.find(ds => ds.id === selectedType)?.name} File Storage Connection</strong><br />
                Connect your cloud storage to analyze files and documents.
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="connectionName">Connection Name</Label>
              <Input
                id="connectionName"
                placeholder={`My ${dataSourceTypes.find(ds => ds.id === selectedType)?.name}`}
                value={connectionForm.name || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, name: e.target.value })}
              />
            </div>
            <Button 
              className="w-full" 
              variant="default"
              onClick={() => {
                const provider = selectedType.replace('drive', '').replace('onedrive', 'microsoft');
                sessionStorage.setItem(`${provider}ConnectionName`, connectionForm.name || `${dataSourceTypes.find(ds => ds.id === selectedType)?.name} Connection`);
                window.location.href = `/api/auth/${provider}/connect?redirect=${encodeURIComponent(window.location.origin + '/connections')}`;
              }}
              disabled={!connectionForm.name}
            >
              <Shield className="mr-2 h-4 w-4" />
              Connect with {dataSourceTypes.find(ds => ds.id === selectedType)?.name}
            </Button>
            <Alert>
              <AlertDescription className="text-sm">
                <strong>We'll be able to:</strong><br />
                • Analyze spreadsheets and CSVs<br />
                • Extract data from documents<br />
                • Monitor file changes<br />
                • Process reports automatically
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'excel':
      case 'csv':
      case 'json':
        return (
          <div className="space-y-4">
            <Alert className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <FileSpreadsheet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription>
                <strong>File Upload Required</strong><br />
                {selectedType.toUpperCase()} files need to be uploaded directly. Please use the "Upload Files" tab to add your {selectedType.toUpperCase()} files.
              </AlertDescription>
            </Alert>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setIsDialogOpen(false);
                setSelectedType('');
                setConnectionForm({});
              }}
            >
              Go to Upload Files Tab
            </Button>
          </div>
        );

      case 'googleanalytics':
      case 'googleadsense':
      case 'googlesearchconsole':
      case 'facebookads':
      case 'linkedinads':
        return (
          <div className="space-y-4">
            <Alert className="mb-4 bg-sage-50 dark:bg-sage-900/20 border-sage-200 dark:border-sage-800">
              <Shield className="h-4 w-4 text-sage-600 dark:text-sage-400" />
              <AlertDescription>
                <strong>{dataSourceTypes.find(ds => ds.id === selectedType)?.name} Analytics Connection</strong><br />
                Connect your analytics platform for performance insights and metrics.
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="connectionName">Connection Name</Label>
              <Input
                id="connectionName"
                placeholder={`${dataSourceTypes.find(ds => ds.id === selectedType)?.name} Account`}
                value={connectionForm.name || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, name: e.target.value })}
              />
            </div>
            <Button 
              className="w-full" 
              variant="default"
              onClick={() => {
                const provider = selectedType.includes('google') ? 'google' : selectedType.replace('ads', '');
                sessionStorage.setItem(`${selectedType}ConnectionName`, connectionForm.name || `${dataSourceTypes.find(ds => ds.id === selectedType)?.name} Connection`);
                window.location.href = `/api/auth/${provider}/${selectedType}?redirect=${encodeURIComponent(window.location.origin + '/connections')}`;
              }}
              disabled={!connectionForm.name}
            >
              <Shield className="mr-2 h-4 w-4" />
              Connect with {dataSourceTypes.find(ds => ds.id === selectedType)?.name}
            </Button>
            <Alert>
              <AlertDescription className="text-sm">
                <strong>Analytics data includes:</strong><br />
                • Traffic and user behavior<br />
                • Conversion tracking<br />
                • Campaign performance<br />
                • Revenue attribution
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        // Generic form for any remaining connectors
        return (
          <div className="space-y-4">
            <Alert className="mb-4 bg-sage-50 dark:bg-sage-900/20 border-sage-200 dark:border-sage-800">
              <Shield className="h-4 w-4 text-sage-600 dark:text-sage-400" />
              <AlertDescription>
                <strong>{dataSourceTypes.find(ds => ds.id === selectedType)?.name} Connection</strong><br />
                Connect your account for real-time data sync and analytics.
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="connectionName">Connection Name</Label>
              <Input
                id="connectionName"
                placeholder="My Connection"
                value={connectionForm.name || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="apiKey">API Key / Access Token</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Your API key or access token"
                value={connectionForm.apiKey || ''}
                onChange={(e) => setConnectionForm({ ...connectionForm, apiKey: e.target.value })}
              />
            </div>
            <Alert>
              <AlertDescription className="text-sm">
                Please refer to your {dataSourceTypes.find(ds => ds.id === selectedType)?.name} account settings to generate an API key or access token for Euno.
              </AlertDescription>
            </Alert>
          </div>
        );
    }
  };

  const handleConnect = () => {
    const dataSource = dataSourceTypes.find(ds => ds.id === selectedType);
    if (!dataSource) return;

    createConnectionMutation.mutate({
      name: connectionForm.name || `${dataSource.name} Connection`,
      type: selectedType,
      connectionType: 'live',
      connectionData: connectionForm,
      syncFrequency: connectionForm.syncFrequency || 60, // default 60 minutes
    });
  };

  const handleDeleteDataSource = (dataSource: any) => {
    setDeleteConfirmation(dataSource);
  };

  const confirmDelete = () => {
    if (deleteConfirmation) {
      deleteDataSourceMutation.mutate(deleteConfirmation.id);
    }
  };

  const liveConnections = connections.filter((conn: any) => conn.connectionType === 'live');
  const uploadedFiles = connections.filter((conn: any) => conn.connectionType === 'upload');

  return (
    <ProtectedRoute requireMainUser={true}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
        <Navbar />
      
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Data Sources</h1>
          <p className="text-gray-600 mt-2">Manage your live connections and uploaded files</p>
          <div className="mt-4 flex items-center gap-4">
            <Badge variant="outline" className="px-3 py-1">
              {connections.length} / {dataSourceLimit} connections used
            </Badge>
            {!canAddMore && (
              <Alert className="py-2 px-4 inline-flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                <AlertDescription className="text-sm">
                  You've reached your plan limit. <Link href="/subscription" className="underline">Upgrade</Link> to add more connections.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <Tabs defaultValue="live" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="live">
              <Wifi className="w-4 h-4 mr-2" />
              Live Connections ({liveConnections.length})
            </TabsTrigger>
            <TabsTrigger value="uploads">
              <FileIcon className="w-4 h-4 mr-2" />
              Uploaded Files ({uploadedFiles.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live">
            <div className="mb-6">
              {userTier === 'starter' && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Live database connections are available on Professional and Enterprise plans. 
                    <Link href="/subscription" className="underline ml-1">Upgrade now</Link> to connect live data sources.
                  </AlertDescription>
                </Alert>
              )}
              <div className="flex gap-3">
                <Button 
                  onClick={() => setIsDialogOpen(true)}
                  disabled={!canAddMore || userTier === 'starter'}
                >
                  <Wifi className="mr-2 h-4 w-4" />
                  Connect New Data Source
                </Button>
              </div>
            </div>

            {liveConnections.length === 0 ? (
              <Card className="p-8 text-center">
                <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No live connections yet</h3>
                <p className="text-gray-600 mb-6">Connect to databases, APIs, and business apps for real-time data sync</p>
                <div className="flex flex-col gap-3 items-center">
                  <Button 
                    onClick={() => setIsDialogOpen(true)}
                    disabled={!canAddMore || userTier === 'starter'}
                  >
                    <Wifi className="mr-2 h-4 w-4" />
                    Connect Your First Data Source
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {liveConnections.map((connection: any) => {
                  const sourceType = dataSourceTypes.find(ds => ds.id === connection.type);
                  const Icon = sourceType?.icon || Database;
                  
                  return (
                    <Card key={connection.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Icon className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">{connection.name}</CardTitle>
                          </div>
                          <Badge variant={connection.status === 'active' ? 'default' : 'destructive'}>
                            {connection.status === 'active' ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                            {connection.status}
                          </Badge>
                        </div>
                        <CardDescription>
                          {sourceType?.name} - {connection.rowCount || 0} rows
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-gray-600">
                          <p>Last sync: {connection.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleString() : 'Never'}</p>
                          <p>Sync frequency: Every {connection.syncFrequency} minutes</p>
                        </div>
                        {connection.errorMessage && (
                          <p className="text-sm text-red-600 mt-2">{connection.errorMessage}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="uploads">
            <div className="mb-6">
              <Link href="/upload">
                <Button disabled={!canAddMore}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload New File
                </Button>
              </Link>
            </div>

            {uploadedFiles.length === 0 ? (
              <Card className="p-8 text-center">
                <FileIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No uploaded files yet</h3>
                <p className="text-gray-600 mb-6">Upload Excel, CSV, or JSON files for analysis</p>
                <div className="flex flex-col gap-3 items-center">
                  <Link href="/upload">
                    <Button disabled={!canAddMore}>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Your First File
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {uploadedFiles.map((file: any) => (
                  <Card key={file.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileSpreadsheet className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">{file.name}</CardTitle>
                        </div>
                        <Badge variant="secondary">
                          <FileIcon className="h-3 w-3 mr-1" />
                          File
                        </Badge>
                      </div>
                      <CardDescription>
                        {file.rowCount ? `${file.rowCount.toLocaleString()} rows` : 'Processing...'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-600">
                        <p>Uploaded: {file.lastSyncAt ? new Date(file.lastSyncAt).toLocaleDateString() : 'Unknown'}</p>
                        <p>Type: {file.connectionData?.filename?.split('.').pop()?.toUpperCase() || 'Unknown'}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDataSource(file)}
                        className="mt-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Footer />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmation} onOpenChange={() => setDeleteConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Data Source</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{deleteConfirmation?.name}"? This will permanently delete all associated data and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Connect to Data Source</DialogTitle>
              <DialogDescription>
                Choose a data source type and provide connection details
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-y-auto flex-1 pr-2">
              {/* Search Input */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search for a data source..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Category Tabs */}
              <Tabs value={selectedCategory} onValueChange={(value) => {
                setSelectedCategory(value);
                setSelectedType(''); // Clear selection when changing category
              }}>
                <TabsList className="grid grid-cols-4 mb-2">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="database">Databases</TabsTrigger>
                  <TabsTrigger value="crm">CRM</TabsTrigger>
                  <TabsTrigger value="marketing">Marketing</TabsTrigger>
                </TabsList>

                <TabsList className="grid grid-cols-5 mb-4">
                  <TabsTrigger value="ecommerce">E-commerce</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  <TabsTrigger value="productivity">Productivity</TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                  <TabsTrigger value="accounting">Finance</TabsTrigger>
                </TabsList>

                <div className="mb-4">
                  {(() => {
                    const filteredSources = dataSourceTypes.filter(ds => {
                      // Filter by search query
                      const matchesSearch = searchQuery === '' || 
                        ds.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        ds.id.toLowerCase().includes(searchQuery.toLowerCase());
                      
                      // Filter by category
                      const matchesCategory = selectedCategory === 'all' || 
                        ds.category === selectedCategory ||
                        (selectedCategory === 'cloud' && (ds.category === 'cloud' || ds.category === 'api'));
                      
                      return matchesSearch && matchesCategory;
                    });

                    if (filteredSources.length === 0) {
                      return (
                        <div className="text-center py-8 text-gray-500">
                          <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm">
                            {searchQuery 
                              ? `No connectors found matching "${searchQuery}"`
                              : `No connectors in this category`}
                          </p>
                          {searchQuery && (
                            <Button 
                              variant="link" 
                              onClick={() => setSearchQuery('')}
                              className="mt-2"
                            >
                              Clear search
                            </Button>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-3 gap-2">
                        {filteredSources.map((ds) => (
                          <Button
                            key={ds.id}
                            variant={selectedType === ds.id ? 'default' : 'outline'}
                            className="flex flex-col items-center p-4 h-auto"
                            onClick={() => setSelectedType(ds.id)}
                          >
                            <ds.icon className="h-6 w-6 mb-1" />
                            <span className="text-xs">{ds.name}</span>
                          </Button>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {selectedType && (
                  <div className="space-y-4">
                    {renderConnectionForm()}

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button variant="outline" onClick={resetForm}>
                        Cancel
                      </Button>
                      <Button onClick={handleConnect} disabled={createConnectionMutation.isPending}>
                        {createConnectionMutation.isPending ? 'Connecting...' : 'Connect'}
                      </Button>
                    </div>
                  </div>
                )}
              </Tabs>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}