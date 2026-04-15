const express = require('express');
const Like = require('../models/Like');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const auth = require('../middleware/auth');

const router = express.Router();

// Like/unlike a post
router.post('/post/:postId', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const existingLike = await Like.findOne({ user: userId, post: postId });

    if (existingLike) {
      // Unlike
      await Like.deleteOne({ _id: existingLike._id });
      post.likes = post.likes.filter(id => id.toString() !== userId.toString());
      post.likesCount = Math.max(0, post.likesCount - 1);
      await post.save();
      
      res.json({ liked: false, likesCount: post.likesCount });
    } else {
      // Like
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
});

// Like/unlike a comment
router.post('/comment/:commentId', auth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const existingLike = await Like.findOne({ user: userId, comment: commentId });

    if (existingLike) {
      // Unlike
      await Like.deleteOne({ _id: existingLike._id });
      comment.likes = comment.likes.filter(id => id.toString() !== userId.toString());
      comment.likesCount = Math.max(0, comment.likesCount - 1);
      await comment.save();
      
      res.json({ liked: false, likesCount: comment.likesCount });
    } else {
      // Like
      const like = new Like({ user: userId, comment: commentId });
      await like.save();
      comment.likes.push(userId);
      comment.likesCount += 1;
      await comment.save();
      
      res.json({ liked: true, likesCount: comment.likesCount });
    }
  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if user liked a post
router.get('/post/:postId/check', auth, async (req, res) => {
  try {
    const like = await Like.findOne({
      user: req.user._id,
      post: req.params.postId
    });

    res.json({ liked: !!like });
  } catch (error) {
    console.error('Check like error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if user liked a comment
router.get('/comment/:commentId/check', auth, async (req, res) => {
  try {
    const like = await Like.findOne({
      user: req.user._id,
      comment: req.params.commentId
    });

    res.json({ liked: !!like });
  } catch (error) {
    console.error('Check like error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
