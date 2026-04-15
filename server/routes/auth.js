const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const vkAuth = require('../middleware/vkAuth');

const router = express.Router();

// VK Bridge authentication
router.post('/vk', vkAuth, async (req, res) => {
  try {
    const token = jwt.sign(
      { userId: req.user._id },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: req.user._id,
        vkId: req.user.vkId,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        avatar: req.user.avatar,
        bio: req.user.bio
      }
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user._id,
      vkId: user.vkId,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      bio: user.bio
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;
