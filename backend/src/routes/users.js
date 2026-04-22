import { Hono } from 'hono';
import User from '../models/User.js';
import Post from '../models/Post.js';
import { auth } from '../middleware/auth.js';

const users = new Hono();

// Get user by ID
users.get('/:id', async (c) => {
  try {
    const user = await User.findById(c.req.param('id')).select('-password');

    if (!user) {
      return c.json({ message: 'User not found' }, 404);
    }

    // Get user's posts count
    const postsCount = await Post.countDocuments({ author: c.req.param('id') });

    return c.json({
      ...user.toObject(),
      postsCount
    });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// Update user profile
users.put('/:id', auth, async (c) => {
  try {
    const user = await User.findById(c.req.param('id'));

    if (!user) {
      return c.json({ message: 'User not found' }, 404);
    }

    if (user._id.toString() !== c.get('user')._id.toString()) {
      return c.json({ message: 'Not authorized' }, 403);
    }

    const { bio, avatar, background_image } = await c.req.json();

    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;
    if (background_image !== undefined) user.background_image = background_image;
    user.updatedAt = Date.now();

    await user.save();

    return c.json({
      id: user._id,
      vkId: user.vkId,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      bio: user.bio,
      background_image: user.background_image
    });
  } catch (error) {
    console.error('Update user error:', error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// Update user background image
users.put('/:id/background', auth, async (c) => {
  try {
    const user = await User.findById(c.req.param('id'));

    if (!user) {
      return c.json({ message: 'User not found' }, 404);
    }

    if (user._id.toString() !== c.get('user')._id.toString()) {
      return c.json({ message: 'Not authorized' }, 403);
    }

    const { background_image } = await c.req.json();

    if (background_image !== undefined) {
      user.background_image = background_image;
      user.updatedAt = Date.now();
      await user.save();
    }

    return c.json({
      background_image: user.background_image
    });
  } catch (error) {
    console.error('Update background error:', error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// Search users
users.get('/search/:query', async (c) => {
  try {
    const query = c.req.param('query');
    const users = await User.find({
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } }
      ]
    })
      .select('vkId firstName lastName avatar')
      .limit(20);

    return c.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    return c.json({ message: 'Server error' }, 500);
  }
});

export default users;
