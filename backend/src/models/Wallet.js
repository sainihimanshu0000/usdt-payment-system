const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  currency: {
    type: String,
    required: true,
    enum: ['INR', 'USDT'],
    uppercase: true
  },
  availableBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  lockedBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  totalBalance: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  collection: 'wallets'
});

WalletSchema.index({ userId: 1, currency: 1 }, { unique: true });

module.exports = mongoose.model('Wallet', WalletSchema);
