import connectToDatabase from '../index.js';
import Story from '../../server/models/Story.js';
import jwt from 'jsonwebtoken';
import User from '../../server/models/User.js';

const requireAuth = (handler) => async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    return handler(req, res);
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

async function handler(req, res) {
  await connectToDatabase();

  const { method } = req;

  switch (method) {
    case 'GET':
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
      break;

    case 'POST':
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
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ message: 'Method not allowed' });
  }
}

export default requireAuth(handler);
