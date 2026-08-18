const mongoose = require('mongoose');

const UsdtRateHistorySchema = new mongoose.Schema({
  oldRate: {
    type: Number,
    default: 0
  },
  newRate: {
    type: Number,
    required: true
  },
  oldBonusRatio: {
    type: Number,
    default: 0
  },
  newBonusRatio: {
    type: Number,
    default: 0
  },
  updatedByAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'usdt_rate_history'
});

UsdtRateHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('UsdtRateHistory', UsdtRateHistorySchema);
