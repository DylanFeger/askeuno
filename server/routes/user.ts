import express from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { storage } from '../storage';
import { logger } from '../utils/logger';
import archiver from 'archiver';
import path from 'path';
import { downloadFromS3 } from '../services/s3Service';

const router = express.Router();

// Export user data (GDPR compliance)
router.post('/export-data', requireAuth, async (req: AuthenticatedRequest, res) => {
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
router.put('/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
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

// Delete user account (GDPR compliance)
router.delete('/account', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    logger.info('Account deletion requested', { userId, email: req.user!.email });

    // Mark account for deletion (30-day grace period)
    await storage.updateUser(userId, { 
      deletedAt: new Date(),
      status: 'pending_deletion'
    });

    logger.info('Account marked for deletion', { 
      userId, 
      email: req.user!.email,
      gracePeriodEnds: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

    res.json({ 
      success: true, 
      message: 'Account marked for deletion. You have 30 days to restore your account.',
      gracePeriodEnds: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
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
