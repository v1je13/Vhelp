import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { vkAuth } from '../middleware/vkAuth.js';

const auth = new Hono();

// VK Bridge authentication
auth.post('/vk', vkAuth, async (c) => {
  try {
    const token = jwt.sign(
      { userId: c.get('user')._id },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: '30d' }
    );

    return c.json({
      token,
      user: {
        id: c.get('user')._id,
        vkId: c.get('user').vkId,
        firstName: c.get('user').firstName,
        lastName: c.get('user').lastName,
        avatar: c.get('user').avatar,
        bio: c.get('user').bio
      }
    });
  } catch (error) {
    console.error('Auth error:', error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// Get current user
auth.get('/me', async (c) => {
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return c.json({ message: 'No token' }, 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return c.json({ message: 'User not found' }, 404);
    }

    return c.json({
      id: user._id,
      vkId: user.vkId,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      bio: user.bio
    });
  } catch (error) {
    return c.json({ message: 'Invalid token' }, 401);
  }
});

export default auth;
