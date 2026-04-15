import connectToDatabase from '../index.js';
import Post from '../../server/models/Post.js';
import jwt from 'jsonwebtoken';
import User from '../../server/models/User.js';

// Auth middleware for serverless
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const posts = await Post.find()
          .populate('author', 'vkId firstName lastName avatar')
          .populate('likes', 'vkId firstName lastName avatar')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit);

        const total = await Post.countDocuments();

        res.json({
          posts,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        });
      } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({ message: 'Server error' });
      }
      break;

    case 'POST':
      try {
        const { content, images, location } = req.body;

        if (!content) {
          return res.status(400).json({ message: 'Content is required' });
        }

        const post = new Post({
          author: req.user._id,
          content,
          images: images || [],
          location: location || ''
        });

        await post.save();
        await post.populate('author', 'vkId firstName lastName avatar');

        res.status(201).json(post);
      } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ message: 'Server error' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ message: 'Method not allowed' });
  }
}

export default requireAuth(handler);
