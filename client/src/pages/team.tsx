import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Users, Mail, Link, QrCode, UserPlus, Trash2, RefreshCw, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

interface TeamMember {
  id: number;
  email: string;
  username: string;
  status: 'active' | 'invited';
  joinedAt?: string;
  invitedAt?: string;
  expiresAt?: string;
}

interface TeamData {
  teamMembers: TeamMember[];
  pendingInvitations: TeamMember[];
  activeCount: number;
  maxCount: number;
}

export default function TeamPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [qrCode, setQrCode] = useState('');

  // Fetch team data (hook must be called before conditional returns)
  const { data: teamData, isLoading } = useQuery<TeamData>({
    queryKey: ['/api/team'],
    enabled: !!user && user.subscriptionTier === 'enterprise' && user.role !== 'chat_only_user',
  });

  // Send invitation mutation
  const sendInvitation = useMutation({
    mutationFn: async (email: string) => {
      return apiRequest('/api/team/invite', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Invitation sent',
        description: 'The team member will receive an email invitation.',
      });
      setInviteEmail('');
      setShowInviteDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/team'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to send invitation',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Generate invite link mutation
  const generateInviteLink = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/team/invite-link', {
        method: 'GET',
      });
    },
    onSuccess: (data) => {
      setInviteLink(data.inviteUrl);
      setQrCode(data.qrCode);
    },
    onError: () => {
      toast({
        title: 'Failed to generate invite link',
        description: 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Resend invitation mutation
  const resendInvitation = useMutation({
    mutationFn: async (invitationId: number) => {
      return apiRequest(`/api/team/resend/${invitationId}`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Invitation resent',
        description: 'A new invitation email has been sent.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/team'] });
    },
    onError: () => {
      toast({
        title: 'Failed to resend invitation',
        description: 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Remove team member mutation
  const removeTeamMember = useMutation({
    mutationFn: async (memberId: number) => {
      return apiRequest(`/api/team/member/${memberId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Team member removed',
        description: 'The team member has been removed successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/team'] });
    },
    onError: () => {
      toast({
        title: 'Failed to remove team member',
        description: 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: 'The invite link has been copied.',
    });
  };

  // Check if user has access (AFTER all hooks are called)
  if (!user || user.subscriptionTier !== 'enterprise' || user.role === 'chat_only_user') {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">Team Management</h2>
            <p className="text-muted-foreground">
              This feature is only available for Enterprise main users.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const seatUsage = teamData ? `${teamData.activeCount} of ${teamData.maxCount} seats used` : '';
  const canInvite = teamData && teamData.activeCount < teamData.maxCount;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Team Management</h1>
        <p className="text-muted-foreground">
          Invite teammates to use AskEuno's chat. Teammates can chat. Only you can manage data and settings.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Team Overview</span>
            <Badge variant="outline">{seatUsage}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
              <DialogTrigger asChild>
                <Button disabled={!canInvite}>
                  <Mail className="mr-2 h-4 w-4" />
                  Invite by Email
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an email invitation to add a team member with chat-only access.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <Input
                    type="email"
                    placeholder="teammate@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <Button
                    onClick={() => sendInvitation.mutate(inviteEmail)}
                    disabled={!inviteEmail || sendInvitation.isPending}
                    className="w-full"
                  >
                    {sendInvitation.isPending ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => generateInviteLink.mutate()} disabled={!canInvite}>
                  <Link className="mr-2 h-4 w-4" />
                  Get Invite Link
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Share Invite Link</DialogTitle>
                  <DialogDescription>
                    Share this link or QR code to invite team members.
                  </DialogDescription>
                </DialogHeader>
                {inviteLink && (
                  <div className="space-y-4 mt-4">
                    <div className="flex gap-2">
                      <Input value={inviteLink} readOnly />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => copyToClipboard(inviteLink)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    {qrCode && (
                      <div className="text-center">
                        <img src={qrCode} alt="Invite QR Code" className="mx-auto" />
                        <p className="text-sm text-muted-foreground mt-2">
                          Scan to join the team
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>

          {!canInvite && (
            <p className="text-sm text-destructive mt-4">
              Seat limit reached. Remove a user or contact support.
            </p>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active Members ({teamData?.teamMembers.length || 0})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending Invitations ({teamData?.pendingInvitations.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {teamData?.teamMembers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Users className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No teammates yet. Invite someone to get them chatting.
                </p>
              </CardContent>
            </Card>
          ) : (
            teamData?.teamMembers.map((member) => (
              <Card key={member.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{member.username}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                    {member.joinedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Joined {format(new Date(member.joinedAt), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Active</Badge>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                          <AlertDialogDescription>
                            Remove this teammate's chat access? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeTeamMember.mutate(member.id)}
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {teamData?.pendingInvitations.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Mail className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No pending invitations.
                </p>
              </CardContent>
            </Card>
          ) : (
            teamData?.pendingInvitations.map((invitation) => (
              <Card key={invitation.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{invitation.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Invited {format(new Date(invitation.invitedAt!), 'MMM d, yyyy')}
                    </p>
                    {invitation.expiresAt && (
                      <p className="text-xs text-muted-foreground">
                        Expires {format(new Date(invitation.expiresAt), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Pending</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => resendInvitation.mutate(invitation.id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}