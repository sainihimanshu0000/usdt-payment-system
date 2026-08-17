const mongoose = require('mongoose');

const PaymentRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amountUSDT: {
    type: Number,
    required: true,
    min: 0.01
  },
  txHash: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  network: {
    type: String,
    required: true,
    enum: ['TRC20', 'ERC20', 'BEP20'],
    default: 'TRC20'
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'verified', 'approved', 'rejected']
  },
  blockchainVerified: {
    type: Boolean,
    default: false
  },
  verificationData: {
    fromAddress: String,
    toAddress: String,
    confirmedAmount: Number,
    confirmations: Number,
    blockNumber: Number,
    verifiedAt: Date
  },
  adminNote: String,
  reviewedAt: Date,
  bankAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount'
  }
}, {
  timestamps: true
});

// Indexes for faster queries
PaymentRequestSchema.index({ userId: 1, status: 1 });
PaymentRequestSchema.index({ txHash: 1 });
PaymentRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PaymentRequest', PaymentRequestSchema);