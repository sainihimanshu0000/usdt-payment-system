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
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['admin_credit', 'deposit', 'debit', 'adjustment']
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
  remark: {
    type: String,
    default: ''
  }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'wallet_ledger'
});

module.exports = mongoose.model('WalletLedger', WalletLedgerSchema);
