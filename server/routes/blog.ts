import { Router } from 'express';
import { storage } from '../storage';
import { insertBlogPostSchema } from '@shared/schema';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';
import { logger } from '../utils/logger';

const router = Router();

// Get all blog posts
router.get('/', async (req, res) => {
  try {
    const posts = await storage.getAllBlogPosts();
    res.json(posts);
  } catch (error) {
    logger.error('Error fetching blog posts', { error });
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

// Get blog posts by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const posts = await storage.getBlogPostsByCategory(category);
    res.json(posts);
  } catch (error) {
    logger.error('Error fetching posts by category', { error, category });
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Search blog posts
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }
    const posts = await storage.searchBlogPosts(q);
    res.json(posts);
  } catch (error) {
    logger.error('Error searching blog posts', { error, query });
    res.status(500).json({ error: 'Failed to search posts' });
  }
});

// Get a single blog post by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const post = await storage.getBlogPostBySlug(slug);
    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }
    res.json(post);
  } catch (error) {
    logger.error('Error fetching blog post', { error, id });
    res.status(500).json({ error: 'Failed to fetch blog post' });
  }
});

// Create a new blog post (protected route - admin only)
router.post('/', requireAuth, async (req, res) => {
  try {
    // For now, we'll check if the user is an admin based on their email
    // In a production app, you'd have proper role management
    const user = await storage.getUser(req.user!.id);
    if (!user || user.email !== 'admin@euno.com') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const postData = insertBlogPostSchema.parse(req.body);
    const post = await storage.createBlogPost(postData);
    res.status(201).json(post);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid blog post data', details: error.errors });
    }
    logger.error('Error creating blog post', { error });
    res.status(500).json({ error: 'Failed to create blog post' });
  }
});

// Update a blog post (protected route - admin only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const user = await storage.getUser(req.user!.id);
    if (!user || user.email !== 'admin@euno.com') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const updates = req.body;
    const post = await storage.updateBlogPost(parseInt(id), updates);
    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }
    res.json(post);
  } catch (error) {
    logger.error('Error updating blog post', { error, id });
    res.status(500).json({ error: 'Failed to update blog post' });
  }
});

// Delete a blog post (protected route - admin only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const user = await storage.getUser(req.user!.id);
    if (!user || user.email !== 'admin@euno.com') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    await storage.deleteBlogPost(parseInt(id));
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting blog post', { error, id });
    res.status(500).json({ error: 'Failed to delete blog post' });
  }
});

export default router;