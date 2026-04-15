import connectToDatabase from '../../index.js';
import Like from '../../../server/models/Like.js';
import Post from '../../../server/models/Post.js';
import jwt from 'jsonwebtoken';
import User from '../../../server/models/User.js';

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

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { postId } = req.query;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const existingLike = await Like.findOne({ user: userId, post: postId });

    if (existingLike) {
      await Like.deleteOne({ _id: existingLike._id });
      post.likes = post.likes.filter(id => id.toString() !== userId.toString());
      post.likesCount = Math.max(0, post.likesCount - 1);
      await post.save();
      
      res.json({ liked: false, likesCount: post.likesCount });
    } else {
      const like = new Like({ user: userId, post: postId });
      await like.save();
      post.likes.push(userId);
      post.likesCount += 1;
      await post.save();
      
      res.json({ liked: true, likesCount: post.likesCount });
    }
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

export default requireAuth(handler);
