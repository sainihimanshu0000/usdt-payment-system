const mongoose = require('mongoose');

const UsdtRateSettingSchema = new mongoose.Schema({
  rateInr: {
    type: Number,
    required: true,
    min: 0.0001
  },
  bonusRatio: {
    type: Number,
    default: 0,
    min: 0
  },
  minDeposit: {
    type: Number,
    default: null
  },
  maxDeposit: {
    type: Number,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  updatedByAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true,
  collection: 'usdt_rate_settings'
});

module.exports = mongoose.model('UsdtRateSetting', UsdtRateSettingSchema);
