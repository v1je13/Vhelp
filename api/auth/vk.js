import jwt from 'jsonwebtoken';
import connectToDatabase from '../index.js';
import User from '../../server/models/User.js';
import crypto from 'crypto';

// Verify VK Bridge signature
const verifyVKSignature = (params) => {
  const { sign, ...queryParams } = params;
  if (!sign) return false;

  const secret = process.env.VK_CLIENT_SECRET || '';
  const paramsString = Object.keys(queryParams)
    .sort()
    .map(key => `${key}=${queryParams[key]}`)
    .join('\n');

  const hash = crypto
    .createHmac('sha256', secret)
    .update(paramsString)
    .digest('base64');

  return hash === sign;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectToDatabase();

    const { vk_user_id, vk_first_name, vk_last_name, vk_avatar, sign } = req.body;

    if (!vk_user_id || !sign) {
      return res.status(401).json({ message: 'VK auth data required' });
    }

    // Verify signature (skip in development)
    if (process.env.NODE_ENV === 'production' && !verifyVKSignature(req.body)) {
      return res.status(401).json({ message: 'Invalid VK signature' });
    }

    // Find or create user
    let user = await User.findOne({ vkId: vk_user_id });
    
    if (!user) {
      user = new User({
        vkId: vk_user_id,
        firstName: vk_first_name || 'User',
        lastName: vk_last_name || '',
        avatar: vk_avatar || ''
      });
      await user.save();
    } else {
      // Update user info if changed
      user.firstName = vk_first_name || user.firstName;
      user.lastName = vk_last_name || user.lastName;
      user.avatar = vk_avatar || user.avatar;
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        vkId: user.vkId,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        bio: user.bio
      }
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}
