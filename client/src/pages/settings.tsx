import { useState, useEffect } from 'react';
import { Settings, User, Bell, Shield, Database, Save, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';

export default function SettingsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    syncFrequency: '60',
    dataRetention: '0',
    autoAnalysis: true
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PUT', '/api/user/profile', data);
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    }
  });

  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/user/export-data');
      if (!response.ok) throw new Error('Failed to export data');
      
      // Get the blob data
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `euno-data-export-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: 'Export Complete',
        description: 'Your data has been downloaded successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to export data',
        variant: 'destructive',
      });
    }
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', '/api/user/account');
      if (!response.ok) throw new Error('Failed to delete account');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Account Deleted',
        description: 'Your account and all data have been permanently deleted.',
      });
      // Clear all cached data and redirect to homepage after a delay
      setTimeout(() => {
        queryClient.clear();
        setLocation('/');
      }, 2000);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete account',
        variant: 'destructive',
      });
    }
  });

  const handleProfileUpdate = () => {
    if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }
    updateProfileMutation.mutate(profileData);
  };

  return (
    <ProtectedRoute requireMainUser={true}>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
      
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-8 h-8" />
              Settings
            </h1>
            <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList>
              <TabsTrigger value="profile">
                <User className="w-4 h-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="preferences">
                <Bell className="w-4 h-4 mr-2" />
                Preferences
              </TabsTrigger>
              <TabsTrigger value="security">
                <Shield className="w-4 h-4 mr-2" />
                Security
              </TabsTrigger>
              <TabsTrigger value="data">
                <Database className="w-4 h-4 mr-2" />
                Data Management
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={profileData.username}
                      onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                      disabled
                    />
                    <p className="text-sm text-gray-500 mt-1">Username cannot be changed</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    />
                  </div>
                  
                  <Button onClick={handleProfileUpdate} disabled={updateProfileMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preferences">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Control how and when you receive notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-notifications">Email Notifications</Label>
                      <p className="text-sm text-gray-500">Receive alerts and updates via email</p>
                    </div>
                    <Switch
                      id="email-notifications"
                      checked={preferences.emailNotifications}
                      onCheckedChange={(checked) => setPreferences({...preferences, emailNotifications: checked})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="sync-frequency">Default Sync Frequency</Label>
                    <Select
                      value={preferences.syncFrequency}
                      onValueChange={(value) => setPreferences({...preferences, syncFrequency: value})}
                    >
                      <SelectTrigger id="sync-frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">Every 15 minutes</SelectItem>
                        <SelectItem value="30">Every 30 minutes</SelectItem>
                        <SelectItem value="60">Every hour</SelectItem>
                        <SelectItem value="360">Every 6 hours</SelectItem>
                        <SelectItem value="1440">Daily</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="auto-analysis">Automatic Analysis</Label>
                      <p className="text-sm text-gray-500">Automatically analyze new data when uploaded</p>
                    </div>
                    <Switch
                      id="auto-analysis"
                      checked={preferences.autoAnalysis}
                      onCheckedChange={(checked) => setPreferences({...preferences, autoAnalysis: checked})}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Manage your password and security preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={profileData.currentPassword}
                      onChange={(e) => setProfileData({...profileData, currentPassword: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={profileData.newPassword}
                      onChange={(e) => setProfileData({...profileData, newPassword: e.target.value})}
                    />
                    <p className="text-sm text-gray-500 mt-1">Must be at least 8 characters with uppercase, lowercase, and numbers</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={profileData.confirmPassword}
                      onChange={(e) => setProfileData({...profileData, confirmPassword: e.target.value})}
                    />
                  </div>
                  
                  <Button onClick={handleProfileUpdate} disabled={updateProfileMutation.isPending}>
                    <Shield className="w-4 h-4 mr-2" />
                    Update Password
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="data">
              <Card>
                <CardHeader>
                  <CardTitle>Data Management</CardTitle>
                  <CardDescription>Configure data retention and privacy settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Export Your Data</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Download a complete copy of all your data including conversations, uploaded files, and data sources. 
                      This may take a few minutes to prepare.
                    </p>
                    <Button 
                      onClick={() => exportDataMutation.mutate()}
                      disabled={exportDataMutation.isPending}
                      data-testid="button-export-data"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {exportDataMutation.isPending ? 'Preparing Export...' : 'Download My Data'}
                    </Button>
                  </div>

                  <div className="pt-4 border-t">
                    <Label htmlFor="data-retention">Data Retention Period</Label>
                    <Select
                      value={preferences.dataRetention}
                      onValueChange={(value) => setPreferences({...preferences, dataRetention: value})}
                    >
                      <SelectTrigger id="data-retention">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="180">6 months</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                        <SelectItem value="0">Forever</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500 mt-1">How long to keep your uploaded data</p>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold text-red-600 mb-3">Danger Zone</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive"
                          data-testid="button-delete-account"
                          disabled={deleteAccountMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete My Account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action will immediately and permanently delete your account and all associated data, including:
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              <li>All uploaded files and data sources</li>
                              <li>All chat conversations and AI analysis</li>
                              <li>All database connections and OAuth tokens</li>
                              <li>Your profile and settings</li>
                              <li>Your Stripe subscription will be cancelled</li>
                            </ul>
                            <p className="mt-4 font-semibold text-red-600">
                              This action cannot be undone. All data will be permanently deleted.
                            </p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteAccountMutation.mutate()}
                            className="bg-red-600 hover:bg-red-700"
                            data-testid="button-confirm-delete"
                          >
                            Yes, Delete My Account
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <Footer />
      </div>
    </ProtectedRoute>
  );
}