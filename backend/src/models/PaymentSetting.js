const mongoose = require('mongoose');

const PaymentSettingSchema = new mongoose.Schema({
  network: {
    type: String,
    default: 'TRC20',
    enum: ['TRC20', 'ERC20', 'BEP20']
  },
  walletAddress: {
    type: String,
    required: true,
    trim: true
  },
  qrImage: {
    type: String,
    trim: true
  },
  active: {
    type: Boolean,
    default: true
  },
  minAmount: {
    type: Number,
    default: 10
  },
  maxAmount: {
    type: Number,
    default: 10000
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PaymentSetting', PaymentSettingSchema);