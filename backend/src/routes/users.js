const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { verifyAdmin, verifyUser } = require('../middleware/auth');

const router = express.Router();

// Current user profile
router.get('/me', verifyUser, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      status: user.status,
      balance: user.balance,
      totalDeposited: user.totalDeposited
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create User (Admin only)
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email: email.toLowerCase(),
      passwordHash
    });

    await user.save();

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        balance: user.balance
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get All Users (Admin only)
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Single User (Admin only)
router.get('/:id', verifyAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update User (Admin only)
router.patch('/:id', verifyAdmin, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (email) {
      const exists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
      if (exists) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      user.email = email.toLowerCase().trim();
    }
    if (password) {
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    await user.save();
    res.json({
      message: 'User updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        balance: user.balance
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update User Status (Admin only)
router.patch('/:id/status', verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['active', 'disabled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: `User ${status === 'active' ? 'activated' : 'disabled'} successfully`,
      user
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete User (Admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;