const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipientType: {
    type: String,
    enum: ['user', 'admin'],
    required: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  module: {
    type: String,
    default: 'transactions'
  },
  referenceId: mongoose.Schema.Types.ObjectId,
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'notifications'
});

NotificationSchema.index({ recipientType: 1, recipientId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
