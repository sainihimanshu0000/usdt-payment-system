const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { verifyUser, verifyAdmin } = require('../middleware/auth');
const { getBearerToken, isBlacklisted, revokeToken } = require('../utils/token');

const router = express.Router();

// Admin Login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role || 'admin',
        canApproveOnBehalf: !!admin.canApproveOnBehalf
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User Login
router.post('/user/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status === 'disabled') {
      return res.status(401).json({ error: 'Account is disabled' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        balance: user.balance,
        role: 'user'
      }
    });
  } catch (error) {
    console.error('User login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User Logout
router.post('/user/logout', verifyUser, async (req, res) => {
  try {
    await revokeToken(req.token, { userId: req.user._id, role: 'user' });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('User logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin Logout
router.post('/admin/logout', verifyAdmin, async (req, res) => {
  try {
    await revokeToken(req.token, { userId: req.admin._id, role: 'admin' });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify Token (for both admin and user)
router.get('/verify', async (req, res) => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    if (await isBlacklisted(token)) {
      return res.status(401).json({ error: 'Token revoked' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Try admin first
    let admin = await Admin.findById(decoded.id);
    if (admin) {
      return res.json({
        valid: true,
        user: {
          id: admin._id,
          email: admin.email,
          name: admin.name,
          role: admin.role || 'admin',
          canApproveOnBehalf: !!admin.canApproveOnBehalf
        }
      });
    }

    // Try user
    let user = await User.findById(decoded.id);
    if (user) {
      if (user.status === 'disabled') {
        return res.status(401).json({ error: 'Account disabled' });
      }
      return res.json({
        valid: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          balance: user.balance,
          role: 'user'
        }
      });
    }

    return res.status(401).json({ error: 'User not found' });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;