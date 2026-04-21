import { Hono } from 'hono';
import Story from '../models/Story.js';
import { auth } from '../middleware/auth.js';

const stories = new Hono();

// Get all active stories
stories.get('/', async (c) => {
  try {
    const stories = await Story.find({
      expiresAt: { $gt: new Date() }
    })
      .populate('author', 'vkId firstName lastName avatar')
      .populate('viewers', 'vkId firstName lastName avatar')
      .sort({ createdAt: -1 });

    return c.json(stories);
  } catch (error) {
    console.error('Get stories error:', error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// Get user's stories
stories.get('/user/:userId', async (c) => {
  try {
    const stories = await Story.find({
      author: c.req.param('userId'),
      expiresAt: { $gt: new Date() }
    })
      .populate('author', 'vkId firstName lastName avatar')
      .sort({ createdAt: -1 });

    return c.json(stories);
  } catch (error) {
    console.error('Get user stories error:', error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// Get single story
stories.get('/:id', async (c) => {
  try {
    const story = await Story.findById(c.req.param('id'))
      .populate('author', 'vkId firstName lastName avatar bio')
      .populate('viewers', 'vkId firstName lastName avatar');

    if (!story) {
      return c.json({ message: 'Story not found' }, 404);
    }

    return c.json(story);
  } catch (error) {
    console.error('Get story error:', error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// Create story
stories.post('/', auth, async (c) => {
  try {
    const { images, caption } = await c.req.json();

    if (!images || !images.length) {
      return c.json({ message: 'At least one image is required' }, 400);
    }

    const story = new Story({
      author: c.get('user')._id,
      images,
      caption: caption || ''
    });

    await story.save();
    await story.populate('author', 'vkId firstName lastName avatar');

    return c.json(story, 201);
  } catch (error) {
    console.error('Create story error:', error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// Mark story as viewed
stories.post('/:id/view', auth, async (c) => {
  try {
    const story = await Story.findById(c.req.param('id'));

    if (!story) {
      return c.json({ message: 'Story not found' }, 404);
    }

    // Check if user already viewed
    const alreadyViewed = story.viewers.some(
      viewer => viewer.toString() === c.get('user')._id.toString()
    );

    if (!alreadyViewed) {
      story.viewers.push(c.get('user')._id);
      story.viewersCount += 1;
      await story.save();
    }

    await story.populate('author', 'vkId firstName lastName avatar');
    await story.populate('viewers', 'vkId firstName lastName avatar');

    return c.json(story);
  } catch (error) {
    console.error('View story error:', error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// Delete story
stories.delete('/:id', auth, async (c) => {
  try {
    const story = await Story.findById(c.req.param('id'));

    if (!story) {
      return c.json({ message: 'Story not found' }, 404);
    }

    if (story.author.toString() !== c.get('user')._id.toString()) {
      return c.json({ message: 'Not authorized' }, 403);
    }

    await Story.findByIdAndDelete(c.req.param('id'));
    return c.json({ message: 'Story deleted' });
  } catch (error) {
    console.error('Delete story error:', error);
    return c.json({ message: 'Server error' }, 500);
  }
});

export default stories;
