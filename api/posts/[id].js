import connectToDatabase from '../index.js';
import Post from '../../server/models/Post.js';
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
  const { id } = req.query;

  switch (method) {
    case 'GET':
      try {
        const post = await Post.findById(id)
          .populate('author', 'vkId firstName lastName avatar bio')
          .populate('likes', 'vkId firstName lastName avatar')
          .populate({
            path: 'comments',
            populate: {
              path: 'author',
              select: 'vkId firstName lastName avatar'
            }
          });

        if (!post) {
          return res.status(404).json({ message: 'Post not found' });
        }

        res.json(post);
      } catch (error) {
        console.error('Get post error:', error);
        res.status(500).json({ message: 'Server error' });
      }
      break;

    case 'PUT':
      try {
        const post = await Post.findById(id);

        if (!post) {
          return res.status(404).json({ message: 'Post not found' });
        }

        if (post.author.toString() !== req.user._id.toString()) {
          return res.status(403).json({ message: 'Not authorized' });
        }

        const { content, images, location } = req.body;
        
        post.content = content || post.content;
        post.images = images || post.images;
        post.location = location || post.location;
        post.updatedAt = Date.now();

        await post.save();
        await post.populate('author', 'vkId firstName lastName avatar');

        res.json(post);
      } catch (error) {
        console.error('Update post error:', error);
        res.status(500).json({ message: 'Server error' });
      }
      break;

    case 'DELETE':
      try {
        const post = await Post.findById(id);

        if (!post) {
          return res.status(404).json({ message: 'Post not found' });
        }

        if (post.author.toString() !== req.user._id.toString()) {
          return res.status(403).json({ message: 'Not authorized' });
        }

        await Post.findByIdAndDelete(id);
        res.json({ message: 'Post deleted' });
      } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ message: 'Server error' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).json({ message: 'Method not allowed' });
  }
}

export default requireAuth(handler);
