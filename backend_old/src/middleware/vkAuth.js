import crypto from 'crypto';
import User from '../models/User.js';

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

const vkAuth = async (c, next) => {
  try {
    const { vk_user_id, vk_first_name, vk_last_name, vk_avatar, sign } = await c.req.json();

    if (!vk_user_id || !sign) {
      return c.json({ message: 'VK auth data required' }, 401);
    }

    // Verify signature (skip in development)
    if (process.env.NODE_ENV === 'production' && !verifyVKSignature({ vk_user_id, vk_first_name, vk_last_name, vk_avatar, sign })) {
      return c.json({ message: 'Invalid VK signature' }, 401);
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

    c.set('user', user);
    await next();
  } catch (error) {
    console.error('VK Auth error:', error);
    return c.json({ message: 'VK authentication failed' }, 500);
  }
};

export { vkAuth };
