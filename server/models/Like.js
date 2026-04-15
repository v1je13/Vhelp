import mongoose from 'mongoose';

const likeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  },
}, {
  timestamps: true
});

likeSchema.index({ user: 1, post: 1 }, { unique: true });
likeSchema.index({ user: 1, comment: 1 }, { unique: true });

export default mongoose.model('Like', likeSchema);
