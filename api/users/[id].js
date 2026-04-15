import connectToDatabase from '../index.js';
import User from '../../server/models/User.js';
import Post from '../../server/models/Post.js';
import jwt from 'jsonwebtoken';

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
  const { id } = req.query;

  switch (method) {
    case 'GET':
      try {
        const user = await User.findById(id).select('-password');

        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }

        const postsCount = await Post.countDocuments({ author: id });

        res.json({
          ...user.toObject(),
          postsCount
        });
      } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Server error' });
      }
      break;

    case 'PUT':
      try {
        const user = await User.findById(id);

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
      break;

    default:
      res.setHeader('Allow', ['GET', 'PUT']);
      res.status(405).json({ message: 'Method not allowed' });
  }
}

export default requireAuth(handler);
