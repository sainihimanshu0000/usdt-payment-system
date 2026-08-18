const mongoose = require('mongoose');

const WalletLedgerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['admin_credit', 'deposit', 'debit', 'adjustment', 'usdt_deposit']
  },
  transactionType: {
    type: String,
    default: ''
  },
  currency: {
    type: String,
    enum: ['INR', 'USDT'],
    default: 'USDT',
    uppercase: true
  },
  direction: {
    type: String,
    required: true,
    enum: ['credit', 'debit']
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  referenceType: {
    type: String,
    default: ''
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  remark: {
    type: String,
    default: ''
  }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'wallet_ledger'
});

WalletLedgerSchema.pre('validate', function setTransactionType(next) {
  if (!this.transactionType) {
    this.transactionType = this.type;
  }
  next();
});

module.exports = mongoose.model('WalletLedger', WalletLedgerSchema);
