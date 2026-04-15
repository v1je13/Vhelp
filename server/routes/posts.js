const express = require('express');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all posts (feed)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .populate('author', 'vkId firstName lastName avatar')
      .populate('likes', 'vkId firstName lastName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments();

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single post
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'vkId firstName lastName avatar bio')
      .populate('likes', 'vkId firstName lastName avatar')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'vkId firstName lastName avatar'
        }
      });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create post
router.post('/', auth, async (req, res) => {
  try {
    const { content, images, location } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const post = new Post({
      author: req.user._id,
      content,
      images: images || [],
      location: location || ''
    });

    await post.save();
    await post.populate('author', 'vkId firstName lastName avatar');

    res.status(201).json(post);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update post
router.put('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { content, images, location } = req.body;
    
    post.content = content || post.content;
    post.images = images || post.images;
    post.location = location || post.location;
    post.updatedAt = Date.now();

    await post.save();
    await post.populate('author', 'vkId firstName lastName avatar');

    res.json(post);
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete post
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's posts
router.get('/user/:userId', async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.userId })
      .populate('author', 'vkId firstName lastName avatar')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
