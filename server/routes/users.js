const express = require('express');
const User = require('../models/User');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

const router = express.Router();

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's posts count
    const postsCount = await Post.countDocuments({ author: req.params.id });

    res.json({
      ...user.toObject(),
      postsCount
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { bio, avatar } = req.body;
    
    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;
    user.updatedAt = Date.now();

    await user.save();

    res.json({
      id: user._id,
      vkId: user.vkId,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      bio: user.bio
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search users
router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const users = await User.find({
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } }
      ]
    })
      .select('vkId firstName lastName avatar')
      .limit(20);

    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
