import { Hono } from 'hono';
import Like from '../models/Like.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import { auth } from '../middleware/auth.js';

const likes = new Hono();

// Like/unlike a post
likes.post('/post/:postId', auth, async (c) => {
  try {
    const postId = c.req.param('postId');
    const userId = c.get('user')._id;

    const post = await Post.findById(postId);
    if (!post) {
      return c.json({ message: 'Post not found' }, 404);
    }

    const existingLike = await Like.findOne({ user: userId, post: postId });

    if (existingLike) {
      // Unlike
      await Like.deleteOne({ _id: existingLike._id });
      post.likes = post.likes.filter(id => id.toString() !== userId.toString());
      post.likesCount = Math.max(0, post.likesCount - 1);
      await post.save();
      
      return c.json({ liked: false, likesCount: post.likesCount });
    } else {
      // Like
      const like = new Like({ user: userId, post: postId });
      await like.save();
      post.likes.push(userId);
      post.likesCount += 1;
      await post.save();
      
      return c.json({ liked: true, likesCount: post.likesCount });
    }
  } catch (error) {
    console.error('Like post error:', error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// Like/unlike a comment
likes.post('/comment/:commentId', auth, async (c) => {
  try {
    const commentId = c.req.param('commentId');
    const userId = c.get('user')._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return c.json({ message: 'Comment not found' }, 404);
    }

    const existingLike = await Like.findOne({ user: userId, comment: commentId });

    if (existingLike) {
      // Unlike
      await Like.deleteOne({ _id: existingLike._id });
      comment.likes = comment.likes.filter(id => id.toString() !== userId.toString());
      comment.likesCount = Math.max(0, comment.likesCount - 1);
      await comment.save();
      
      return c.json({ liked: false, likesCount: comment.likesCount });
    } else {
      // Like
      const like = new Like({ user: userId, comment: commentId });
      await like.save();
      comment.likes.push(userId);
      comment.likesCount += 1;
      await comment.save();
      
      return c.json({ liked: true, likesCount: comment.likesCount });
    }
  } catch (error) {
    console.error('Like comment error:', error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// Check if user liked a post
likes.get('/post/:postId/check', auth, async (c) => {
  try {
    const like = await Like.findOne({
      user: c.get('user')._id,
      post: c.req.param('postId')
    });

    return c.json({ liked: !!like });
  } catch (error) {
    console.error('Check like error:', error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// Check if user liked a comment
likes.get('/comment/:commentId/check', auth, async (c) => {
  try {
    const like = await Like.findOne({
      user: c.get('user')._id,
      comment: c.req.param('commentId')
    });

    return c.json({ liked: !!like });
  } catch (error) {
    console.error('Check like error:', error);
    return c.json({ message: 'Server error' }, 500);
  }
});

export default likes;
