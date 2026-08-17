const mongoose = require('mongoose');

const STATUSES = [
  'pending_user_approval',
  'approved_by_user',
  'rejected_by_user',
  'success',
  'failed'
];

const PAYMENT_MODES = ['upi', 'bank_transfer', 'neft', 'imps', 'rtgs', 'cash', 'other'];

const TransactionSchema = new mongoose.Schema({
  txnId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  utrNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  paymentMode: {
    type: String,
    required: true,
    enum: PAYMENT_MODES,
    default: 'upi'
  },
  status: {
    type: String,
    required: true,
    enum: STATUSES,
    default: 'pending_user_approval',
    index: true
  },
  adminRemark: {
    type: String,
    trim: true,
    default: ''
  },
  userRejectionReason: {
    type: String,
    trim: true,
    default: ''
  },
  balanceBefore: {
    type: Number,
    default: null
  },
  balanceAfter: {
    type: Number,
    default: null
  },
  createdByAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  userActionAt: Date,
  userActionIp: String,
  userActionDevice: String,
  failureReason: String
}, {
  timestamps: true,
  collection: 'transactions'
});

TransactionSchema.index({ userId: 1, status: 1, createdAt: -1 });
TransactionSchema.index({ createdAt: -1 });

TransactionSchema.statics.STATUSES = STATUSES;
TransactionSchema.statics.PAYMENT_MODES = PAYMENT_MODES;

module.exports = mongoose.model('Transaction', TransactionSchema);
