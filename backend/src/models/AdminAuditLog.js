const mongoose = require('mongoose');

const AdminAuditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  action: {
    type: String,
    required: true
  },
  module: {
    type: String,
    required: true,
    default: 'transactions'
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  oldStatus: String,
  newStatus: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ip: String,
  device: String
}, {
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'admin_audit_logs'
});

module.exports = mongoose.model('AdminAuditLog', AdminAuditLogSchema);
