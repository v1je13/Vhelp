const crypto = require('crypto');
const User = require('../models/User');

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

const vkAuth = async (req, res, next) => {
  try {
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

    req.user = user;
    next();
  } catch (error) {
    console.error('VK Auth error:', error);
    res.status(500).json({ message: 'VK authentication failed' });
  }
};

module.exports = vkAuth;
