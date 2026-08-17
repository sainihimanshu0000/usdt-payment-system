const mongoose = require('mongoose');

const TokenBlacklistSchema = new mongoose.Schema({
  tokenHash: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId
  },
  role: {
    type: String,
    enum: ['user', 'admin']
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

TokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('TokenBlacklist', TokenBlacklistSchema);
