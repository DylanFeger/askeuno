import express from 'express';
import Stripe from 'stripe';
import { requireAuth, requireMainUser, AuthenticatedRequest } from '../middleware/auth';
import { storage } from '../storage';
import { logger } from '../utils/logger';
import archiver from 'archiver';
import path from 'path';
import { downloadFromS3, deleteFromS3 } from '../services/s3Service';

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
});

const router = express.Router();

// Export user data (GDPR compliance)
router.post('/export-data', requireAuth, requireMainUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    logger.info('Data export requested', { userId });

    // Get full user record
    const fullUser = await storage.getUser(userId);
    if (!fullUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Gather all user data
    const userData = {
      profile: {
        id: fullUser.id,
        username: fullUser.username,
        email: fullUser.email,
        subscriptionTier: fullUser.subscriptionTier,
        subscriptionStatus: fullUser.subscriptionStatus,
        billingCycle: fullUser.billingCycle,
        role: fullUser.role,
        trialStartDate: fullUser.trialStartDate,
        trialEndDate: fullUser.trialEndDate,
        subscriptionStartDate: fullUser.subscriptionStartDate,
        subscriptionEndDate: fullUser.subscriptionEndDate,
        trialHistory: fullUser.trialHistory,
        monthlyQueryCount: fullUser.monthlyQueryCount,
        queryResetDate: fullUser.queryResetDate,
        createdAt: fullUser.createdAt,
      },
      conversations: await storage.getConversationsByUserId(userId),
      dataSources: await storage.getDataSourcesByUserId(userId),
      teamMembers: await storage.getTeamMembersByInviterId(userId),
      teamInvitations: await storage.getPendingInvitations(userId),
      billing: {
        stripeCustomerId: fullUser.stripeCustomerId,
        stripeSubscriptionId: fullUser.stripeSubscriptionId,
      }
    };

    // Get messages for each conversation
    const conversationsWithMessages = await Promise.all(
      userData.conversations.map(async (conv: any) => ({
        ...conv,
        messages: await storage.getMessagesByConversationId(conv.id)
      }))
    );

    // Create a ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Set response headers for download
    const filename = `euno-data-export-${userId}-${Date.now()}.zip`;
    res.attachment(filename);
    res.setHeader('Content-Type', 'application/zip');

    // Pipe archive to response
    archive.pipe(res);

    // Add user profile data
    archive.append(JSON.stringify(userData.profile, null, 2), { 
      name: 'profile.json' 
    });

    // Add conversations with messages
    archive.append(JSON.stringify(conversationsWithMessages, null, 2), { 
      name: 'conversations.json' 
    });

    // Add data sources metadata
    archive.append(JSON.stringify(userData.dataSources, null, 2), { 
      name: 'data_sources.json' 
    });

    // Add team data
    archive.append(JSON.stringify(userData.teamMembers, null, 2), { 
      name: 'team_members.json' 
    });

    archive.append(JSON.stringify(userData.teamInvitations, null, 2), { 
      name: 'team_invitations.json' 
    });

    // Add billing data
    archive.append(JSON.stringify(userData.billing, null, 2), { 
      name: 'billing.json' 
    });

    // Download uploaded files from S3 and add to ZIP
    for (const dataSource of userData.dataSources) {
      if (dataSource.filePath && dataSource.type === 'file') {
        try {
          const fileBuffer = await downloadFromS3(dataSource.filePath);
          if (fileBuffer) {
            const fileName = path.basename(dataSource.filePath);
            archive.append(fileBuffer, { name: `files/${fileName}` });
          }
        } catch (error) {
          logger.warn('Failed to include file in export', { 
            userId, 
            filePath: dataSource.filePath,
            error 
          });
          // Continue with other files even if one fails
        }
      }
    }

    // Finalize the archive
    await archive.finalize();

    logger.info('Data export completed', { userId, filename });
  } catch (error) {
    logger.error('Data export failed', { 
      userId: req.user?.id, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Update user profile (for Settings page)
router.put('/profile', requireAuth, requireMainUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { email, currentPassword, newPassword } = req.body;

    // For now, just update email (password update would require bcrypt verification)
    if (email && email !== req.user!.email) {
      await storage.updateUser(userId, { email });
      logger.info('User email updated', { userId, newEmail: email });
    }

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    logger.error('Profile update failed', { 
      userId: req.user?.id, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Delete user account immediately
router.delete('/account', requireAuth, requireMainUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    logger.info('Account deletion requested', { userId, email: req.user!.email });

    // Get full user record to access all fields
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 1. Cancel Stripe subscription immediately (if exists)
    if (user.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(user.stripeSubscriptionId);
        logger.info('Stripe subscription cancelled', { 
          userId, 
          subscriptionId: user.stripeSubscriptionId 
        });
      } catch (stripeError) {
        logger.error('Stripe subscription cancellation failed', { 
          userId, 
          error: stripeError instanceof Error ? stripeError.message : 'Unknown error'
        });
        // Continue with deletion even if Stripe fails
      }
    }

    // 2. Delete all S3 files
    const userDataSources = await storage.getDataSourcesByUserId(userId);
    for (const dataSource of userDataSources) {
      if (dataSource.filePath && dataSource.type === 'file') {
        try {
          await deleteFromS3(dataSource.filePath);
          logger.info('S3 file deleted', { userId, filePath: dataSource.filePath });
        } catch (s3Error) {
          logger.error('S3 file deletion failed', { 
            userId, 
            filePath: dataSource.filePath,
            error: s3Error instanceof Error ? s3Error.message : 'Unknown error'
          });
          // Continue with deletion even if S3 fails
        }
      }
    }

    // 3. Delete all database records in correct order (respecting foreign keys)
    
    // Delete dashboards owned by this user
    await storage.deleteDashboardsByUserId(userId);
    logger.info('Dashboards deleted', { userId });
    
    // Delete alerts owned by this user
    await storage.deleteAlertsByUserId(userId);
    logger.info('Alerts deleted', { userId });
    
    // Delete team members (chat-only users invited by this user)
    await storage.deleteTeamMembersByInviter(userId);
    logger.info('Team members deleted', { userId });
    
    // Delete data sources (which cascades to conversations and data rows)
    for (const dataSource of userDataSources) {
      await storage.deleteDataSource(dataSource.id);
    }
    logger.info('Data sources deleted', { userId, count: userDataSources.length });
    
    // Delete any remaining conversations not linked to data sources
    const userConversations = await storage.getConversationsByUserId(userId);
    for (const conversation of userConversations) {
      await storage.deleteConversation(conversation.id);
    }
    logger.info('Conversations deleted', { userId, count: userConversations.length });
    
    // Delete team invitations (sent by this user)
    await storage.deleteTeamInvitationsByInviter(userId);
    logger.info('Team invitations deleted', { userId });
    
    // Delete OAuth connections
    const connections = await storage.getConnectionsByUserId(userId);
    for (const connection of connections) {
      await storage.deleteConnection(connection.id);
    }
    logger.info('OAuth connections deleted', { userId, count: connections.length });

    // 4. Delete the user record itself (after all dependent records are removed)
    await storage.deleteUser(userId);

    logger.info('Account fully deleted', { userId, email: user.email });

    res.json({ 
      success: true, 
      message: 'Account and all associated data have been permanently deleted.'
    });
  } catch (error) {
    logger.error('Account deletion failed', { 
      userId: req.user?.id, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
