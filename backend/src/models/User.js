const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  passwordHash: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'active',
    enum: ['active', 'disabled']
  },
  balance: {
    type: Number,
    default: 0
  },
  totalDeposited: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);