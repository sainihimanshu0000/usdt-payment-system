const mongoose = require('mongoose');

const BankAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  accountNo: {
    type: String,
    required: true,
    trim: true
  },
  upiId: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  accountHolderName: {
    type: String,
    required: true,
    trim: true
  },
  ifscCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  bankName: {
    type: String,
    required: true,
    trim: true
  },
  bankBranch: {
    type: String,
    required: true,
    trim: true
  },
  bankAddress: {
    type: String,
    required: true,
    trim: true
  },
  countryCode: {
    type: String,
    required: true,
    default: '+91'
  },
  phoneNo: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'inactive', 'rejected'],
    default: 'pending',
    index: true
  },
  isActive: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'bank_accounts'
});

BankAccountSchema.index({ userId: 1, accountNo: 1 }, { unique: true });
BankAccountSchema.index({ userId: 1, upiId: 1 }, { unique: true });
BankAccountSchema.index({ userId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('BankAccount', BankAccountSchema);
