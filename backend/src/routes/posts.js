import { Hono } from 'hono';
import Post from '../models/Post.js';
import { auth } from '../middleware/auth.js';

const posts = new Hono();

// Get all posts (feed)
posts.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page')) || 1;
    const limit = parseInt(c.req.query('limit')) || 20;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .populate('author', 'vkId firstName lastName avatar')
      .populate('likes', 'vkId firstName lastName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments();

    return c.json({
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
    return c.json({ message: 'Server error' }, 500);
  }
});

// Get single post
posts.get('/:id', async (c) => {
  try {
    const post = await Post.findById(c.req.param('id'))
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
      return c.json({ message: 'Post not found' }, 404);
    }

    return c.json(post);
  } catch (error) {
    console.error('Get post error:', error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// Create post
posts.post('/', auth, async (c) => {
  try {
    const { content, images, location } = await c.req.json();

    if (!content) {
      return c.json({ message: 'Content is required' }, 400);
    }

    const post = new Post({
      author: c.get('user')._id,
      content,
      images: images || [],
      location: location || ''
    });

    await post.save();
    await post.populate('author', 'vkId firstName lastName avatar');

    return c.json(post, 201);
  } catch (error) {
    console.error('Create post error:', error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// Update post
posts.put('/:id', auth, async (c) => {
  try {
    const post = await Post.findById(c.req.param('id'));

    if (!post) {
      return c.json({ message: 'Post not found' }, 404);
    }

    if (post.author.toString() !== c.get('user')._id.toString()) {
      return c.json({ message: 'Not authorized' }, 403);
    }

    const { content, images, location } = await c.req.json();
    
    post.content = content || post.content;
    post.images = images || post.images;
    post.location = location || post.location;
    post.updatedAt = Date.now();

    await post.save();
    await post.populate('author', 'vkId firstName lastName avatar');

    return c.json(post);
  } catch (error) {
    console.error('Update post error:', error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// Delete post
posts.delete('/:id', auth, async (c) => {
  try {
    const post = await Post.findById(c.req.param('id'));

    if (!post) {
      return c.json({ message: 'Post not found' }, 404);
    }

    if (post.author.toString() !== c.get('user')._id.toString()) {
      return c.json({ message: 'Not authorized' }, 403);
    }

    await Post.findByIdAndDelete(c.req.param('id'));
    return c.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('Delete post error:', error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// Get user's posts
posts.get('/user/:userId', async (c) => {
  try {
    const posts = await Post.find({ author: c.req.param('userId') })
      .populate('author', 'vkId firstName lastName avatar')
      .sort({ createdAt: -1 });

    return c.json(posts);
  } catch (error) {
    console.error('Get user posts error:', error);
    return c.json({ message: 'Server error' }, 500);
  }
});

export default posts;
