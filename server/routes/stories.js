const express = require('express');
const Story = require('../models/Story');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all active stories
router.get('/', async (req, res) => {
  try {
    const stories = await Story.find({
      expiresAt: { $gt: new Date() }
    })
      .populate('author', 'vkId firstName lastName avatar')
      .populate('viewers', 'vkId firstName lastName avatar')
      .sort({ createdAt: -1 });

    res.json(stories);
  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's stories
router.get('/user/:userId', async (req, res) => {
  try {
    const stories = await Story.find({
      author: req.params.userId,
      expiresAt: { $gt: new Date() }
    })
      .populate('author', 'vkId firstName lastName avatar')
      .sort({ createdAt: -1 });

    res.json(stories);
  } catch (error) {
    console.error('Get user stories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single story
router.get('/:id', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate('author', 'vkId firstName lastName avatar bio')
      .populate('viewers', 'vkId firstName lastName avatar');

    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    res.json(story);
  } catch (error) {
    console.error('Get story error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create story
router.post('/', auth, async (req, res) => {
  try {
    const { images, caption } = req.body;

    if (!images || !images.length) {
      return res.status(400).json({ message: 'At least one image is required' });
    }

    const story = new Story({
      author: req.user._id,
      images,
      caption: caption || ''
    });

    await story.save();
    await story.populate('author', 'vkId firstName lastName avatar');

    res.status(201).json(story);
  } catch (error) {
    console.error('Create story error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark story as viewed
router.post('/:id/view', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    // Check if user already viewed
    const alreadyViewed = story.viewers.some(
      viewer => viewer.toString() === req.user._id.toString()
    );

    if (!alreadyViewed) {
      story.viewers.push(req.user._id);
      story.viewersCount += 1;
      await story.save();
    }

    await story.populate('author', 'vkId firstName lastName avatar');
    await story.populate('viewers', 'vkId firstName lastName avatar');

    res.json(story);
  } catch (error) {
    console.error('View story error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete story
router.delete('/:id', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    if (story.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Story.findByIdAndDelete(req.params.id);
    res.json({ message: 'Story deleted' });
  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
