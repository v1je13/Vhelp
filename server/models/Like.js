const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

likeSchema.index({ user: 1, post: 1 }, { unique: true });
likeSchema.index({ user: 1, comment: 1 }, { unique: true });

module.exports = mongoose.model('Like', likeSchema);
