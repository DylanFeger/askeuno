import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { randomBytes } from "crypto";
import { sendEmail } from "../services/awsSes";
import QRCode from "qrcode";

// Extend Express Request to include session with userId
interface AuthRequest extends Request {
  session: any;
  user?: any;
}

const router = Router();

// Middleware to check if user is Enterprise main user
const requireEnterpriseMainUser = async (req: AuthRequest, res: Response, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  if (user.subscriptionTier !== 'enterprise' || user.role !== 'main_user') {
    return res.status(403).json({ error: "This feature is only available for Enterprise main users" });
  }

  req.user = user;
  next();
};

// Get team members and invitations
router.get("/team", requireEnterpriseMainUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.session.userId;
    
    // Get active team members
    const teamMembers = await storage.getTeamMembersByInviterId(userId);
    
    // Get pending invitations
    const pendingInvitations = await storage.getPendingInvitations(userId);
    
    // Get count of active members
    const activeCount = await storage.getActiveTeamMembersCount(userId);
    
    res.json({
      teamMembers: teamMembers.map(member => ({
        id: member.id,
        email: member.email,
        username: member.username,
        status: 'active',
        joinedAt: member.createdAt,
      })),
      pendingInvitations: pendingInvitations.map(invite => ({
        id: invite.id,
        email: invite.inviteeEmail,
        status: 'invited',
        invitedAt: invite.createdAt,
        expiresAt: invite.expiresAt,
      })),
      activeCount,
      maxCount: 5,
    });
  } catch (error) {
    console.error("Error getting team:", error);
    res.status(500).json({ error: "Failed to get team members" });
  }
});

// Send team invitation
router.post("/team/invite", requireEnterpriseMainUser, async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      email: z.string().email(),
    });
    
    const { email } = schema.parse(req.body);
    const userId = req.session.userId;
    
    // Check if already at limit
    const activeCount = await storage.getActiveTeamMembersCount(userId);
    if (activeCount >= 5) {
      return res.status(400).json({ error: "Seat limit reached. Remove a user or contact support." });
    }
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser && existingUser.invitedBy === userId) {
      return res.status(400).json({ error: "This user is already a team member" });
    }
    
    // Generate unique invite token
    const inviteToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
    
    // Create invitation
    await storage.createTeamInvitation(userId, email, inviteToken, expiresAt);
    
    // Send invitation email
    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/accept-invite/${inviteToken}`;
    
    await sendEmail({
      to: email,
      from: 'team@askeuno.com',
      subject: "You've been invited to AskEuno",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You've been invited to AskEuno</h2>
          <p>You've been given chat-only access to your team's AskEuno account.</p>
          <p>Click the button below to join:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invite</a>
          </div>
          <p style="color: #666; font-size: 14px;">This link expires in 72 hours. If you didn't expect this, ignore this email.</p>
        </div>
      `,
    });
    
    res.json({ 
      message: "Invitation sent.",
      inviteUrl,
    });
  } catch (error: any) {
    console.error("Error sending invitation:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid email address" });
    }
    res.status(500).json({ error: "Failed to send invitation" });
  }
});

// Get invite link and QR code
router.get("/team/invite-link", requireEnterpriseMainUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      console.error("No userId in session");
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    console.log(`Generating invite link for user ${userId}`);
    
    // Generate a reusable invite token for QR/link sharing
    const inviteToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    
    // Use a placeholder email with timestamp to avoid duplicates
    const placeholderEmail = `invite-${Date.now()}@pending.euno.com`;
    
    // Store as a generic invitation
    console.log(`Creating team invitation with token: ${inviteToken.substring(0, 10)}...`);
    await storage.createTeamInvitation(userId, placeholderEmail, inviteToken, expiresAt);
    
    const baseUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'https://askeuno.com';
    const inviteUrl = `${baseUrl}/accept-invite/${inviteToken}`;
    
    console.log(`Generating QR code for URL: ${inviteUrl}`);
    // Generate QR code
    const qrCode = await QRCode.toDataURL(inviteUrl);
    
    console.log(`Invite link generated successfully`);
    res.json({
      inviteUrl,
      qrCode,
      expiresAt,
    });
  } catch (error) {
    console.error("Error generating invite link:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ error: "Failed to generate invite link" });
  }
});

// Resend invitation
router.post("/team/resend/:invitationId", requireEnterpriseMainUser, async (req: AuthRequest, res: Response) => {
  try {
    const invitationId = parseInt(req.params.invitationId);
    const userId = req.session.userId;
    
    // Get the invitation
    const invitations = await storage.getPendingInvitations(userId);
    const invitation = invitations.find(inv => inv.id === invitationId);
    
    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found" });
    }
    
    // Generate new token and expiry
    const inviteToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    
    // Update invitation
    await storage.updateTeamInvitation(invitationId, {
      inviteToken,
      expiresAt,
    });
    
    // Resend email
    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/accept-invite/${inviteToken}`;
    
    await sendEmail({
      to: invitation.inviteeEmail,
      from: 'team@askeuno.com',
      subject: "Reminder: You've been invited to AskEuno",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reminder: You've been invited to AskEuno</h2>
          <p>You've been given chat-only access to your team's AskEuno account.</p>
          <p>Click the button below to join:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invite</a>
          </div>
          <p style="color: #666; font-size: 14px;">This link expires in 72 hours. If you didn't expect this, ignore this email.</p>
        </div>
      `,
    });
    
    res.json({ message: "Invitation resent." });
  } catch (error) {
    console.error("Error resending invitation:", error);
    res.status(500).json({ error: "Failed to resend invitation" });
  }
});

// Remove team member
router.delete("/team/member/:memberId", requireEnterpriseMainUser, async (req: AuthRequest, res: Response) => {
  try {
    const memberId = parseInt(req.params.memberId);
    const userId = req.session.userId;
    
    // Verify the member belongs to this team
    const teamMembers = await storage.getTeamMembersByInviterId(userId);
    const member = teamMembers.find(m => m.id === memberId);
    
    if (!member) {
      return res.status(404).json({ error: "Team member not found" });
    }
    
    // Remove the team member
    await storage.removeTeamMember(memberId);
    
    res.json({ message: "Team member removed successfully" });
  } catch (error) {
    console.error("Error removing team member:", error);
    res.status(500).json({ error: "Failed to remove team member" });
  }
});

// Accept invitation
router.post("/accept-invite/:token", async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.params;
    
    // Get invitation
    const invitation = await storage.getTeamInvitationByToken(token);
    
    if (!invitation) {
      return res.status(404).json({ error: "Invalid or expired invitation" });
    }
    
    // Check if expired
    if (new Date(invitation.expiresAt) < new Date()) {
      await storage.updateTeamInvitation(invitation.id, { status: 'expired' });
      return res.status(400).json({ error: "This invitation has expired" });
    }
    
    // Check if already accepted
    if (invitation.status === 'accepted') {
      return res.status(400).json({ error: "This invitation has already been used" });
    }
    
    // Get the inviter to inherit their subscription
    const inviter = await storage.getUser(invitation.inviterId);
    if (!inviter || inviter.subscriptionTier !== 'enterprise') {
      return res.status(400).json({ error: "Invalid invitation" });
    }
    
    // Check if seat limit reached
    const activeCount = await storage.getActiveTeamMembersCount(invitation.inviterId);
    if (activeCount >= 5) {
      return res.status(400).json({ error: "The team has reached its seat limit" });
    }
    
    // Handle based on whether user is logged in
    let acceptedUserId: number;
    
    if (req.session?.userId) {
      // User is logged in - update their role
      acceptedUserId = req.session.userId;
      await storage.updateUser(acceptedUserId, {
        role: 'chat_only_user',
        invitedBy: invitation.inviterId,
        subscriptionTier: 'enterprise',
      });
    } else {
      // User needs to register or login
      // Return success but indicate authentication needed
      return res.json({
        requiresAuth: true,
        inviteToken: token,
        message: "Please login or register to accept this invitation",
      });
    }
    
    // Mark invitation as accepted
    await storage.updateTeamInvitation(invitation.id, {
      status: 'accepted',
      acceptedAt: new Date(),
      acceptedUserId,
    });
    
    res.json({
      success: true,
      message: "Invitation accepted successfully",
      role: 'chat_only_user',
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    res.status(500).json({ error: "Failed to accept invitation" });
  }
});

export default router;