const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  entityType: {
    type: String,
    required: true,
    index: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true
  },
  fromStatus: String,
  toStatus: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ip: String
}, {
  timestamps: true,
  collection: 'audit_logs'
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
