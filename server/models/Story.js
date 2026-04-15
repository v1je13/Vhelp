const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  images: [{
    type: String,
    required: true
  }],
  caption: {
    type: String,
    default: ''
  },
  viewers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  viewersCount: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    required: true,
    default: function() {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Story', storySchema);
