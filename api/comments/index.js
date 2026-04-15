import connectToDatabase from '../index.js';
import Comment from '../../server/models/Comment.js';
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

  switch (method) {
    case 'GET':
      try {
        const { postId } = req.query;
        const comments = await Comment.find({ post: postId })
          .populate('author', 'vkId firstName lastName avatar')
          .populate('likes', 'vkId firstName lastName avatar')
          .sort({ createdAt: -1 });

        res.json(comments);
      } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ message: 'Server error' });
      }
      break;

    case 'POST':
      try {
        const { postId, content } = req.body;

        if (!postId || !content) {
          return res.status(400).json({ message: 'Post ID and content are required' });
        }

        const post = await Post.findById(postId);
        if (!post) {
          return res.status(404).json({ message: 'Post not found' });
        }

        const comment = new Comment({
          post: postId,
          author: req.user._id,
          content
        });

        await comment.save();
        await comment.populate('author', 'vkId firstName lastName avatar');

        post.comments.push(comment._id);
        post.commentsCount += 1;
        await post.save();

        res.status(201).json(comment);
      } catch (error) {
        console.error('Create comment error:', error);
        res.status(500).json({ message: 'Server error' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ message: 'Method not allowed' });
  }
}

export default requireAuth(handler);
