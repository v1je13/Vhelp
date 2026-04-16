import { Hono } from 'hono';
import Comment from '../models/Comment.js';
import Post from '../models/Post.js';
import { auth } from '../middleware/auth.js';

const comments = new Hono();

// Get comments for a post
comments.get('/post/:postId', async (c) => {
  try {
    const comments = await Comment.find({ post: c.req.param('postId') })
      .populate('author', 'vkId firstName lastName avatar')
      .populate('likes', 'vkId firstName lastName avatar')
      .sort({ createdAt: -1 });

    return c.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// Create comment
comments.post('/', auth, async (c) => {
  try {
    const { postId, content } = await c.req.json();

    if (!postId || !content) {
      return c.json({ message: 'Post ID and content are required' }, 400);
    }

    const post = await Post.findById(postId);
    if (!post) {
      return c.json({ message: 'Post not found' }, 404);
    }

    const comment = new Comment({
      post: postId,
      author: c.get('user')._id,
      content
    });

    await comment.save();
    await comment.populate('author', 'vkId firstName lastName avatar');

    // Update post's comments array and count
    post.comments.push(comment._id);
    post.commentsCount += 1;
    await post.save();

    return c.json(comment, 201);
  } catch (error) {
    console.error('Create comment error:', error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// Update comment
comments.put('/:id', auth, async (c) => {
  try {
    const comment = await Comment.findById(c.req.param('id'));

    if (!comment) {
      return c.json({ message: 'Comment not found' }, 404);
    }

    if (comment.author.toString() !== c.get('user')._id.toString()) {
      return c.json({ message: 'Not authorized' }, 403);
    }

    const { content } = await c.req.json();
    comment.content = content || comment.content;
    comment.updatedAt = Date.now();

    await comment.save();
    await comment.populate('author', 'vkId firstName lastName avatar');

    return c.json(comment);
  } catch (error) {
    console.error('Update comment error:', error);
    return c.json({ message: 'Server error' }, 500);
  }
});

// Delete comment
comments.delete('/:id', auth, async (c) => {
  try {
    const comment = await Comment.findById(c.req.param('id'));

    if (!comment) {
      return c.json({ message: 'Comment not found' }, 404);
    }

    if (comment.author.toString() !== c.get('user')._id.toString()) {
      return c.json({ message: 'Not authorized' }, 403);
    }

    // Update post's comments count
    const post = await Post.findById(comment.post);
    if (post) {
      post.comments = post.comments.filter(id => id.toString() !== comment._id.toString());
      post.commentsCount = Math.max(0, post.commentsCount - 1);
      await post.save();
    }

    await Comment.findByIdAndDelete(c.req.param('id'));
    return c.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    return c.json({ message: 'Server error' }, 500);
  }
});

export default comments;
