const express = require('express');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const { verifyAdmin } = require('../middleware/auth');

const router = express.Router();

// Create default admin if none exists (safe, only works when zero admins)
router.post('/create-default', async (req, res) => {
  try {
    const count = await Admin.countDocuments();
    if (count > 0) {
      return res.status(400).json({ error: 'Admin(s) already exist' });
    }

    const email = process.env.ADMIN_EMAIL || req.body.email;
    const password = process.env.ADMIN_PASSWORD || req.body.password;

    if (!email || !password) {
      return res.status(400).json({ error: 'ADMIN_EMAIL and ADMIN_PASSWORD required' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = new Admin({ email: email.toLowerCase(), passwordHash, name: 'Super Admin' });
    await admin.save();

    res.status(201).json({ message: 'Default admin created', admin: { id: admin._id, email: admin.email, name: admin.name } });
  } catch (error) {
    console.error('Create default admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List admins (admin only)
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const admins = await Admin.find().select('email name createdAt updatedAt');
    res.json(admins);
  } catch (error) {
    console.error('List admins error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create admin (admin only)
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const exists = await Admin.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ error: 'Admin already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = new Admin({ email: email.toLowerCase(), passwordHash, name: name || 'Admin' });
    await admin.save();

    res.status(201).json({ message: 'Admin created', admin: { id: admin._id, email: admin.email, name: admin.name } });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update admin (admin only)
router.patch('/:id', verifyAdmin, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    if (name) admin.name = name;
    if (email) admin.email = email.toLowerCase();
    if (password) admin.passwordHash = await bcrypt.hash(password, 10);

    await admin.save();
    res.json({ message: 'Admin updated', admin: { id: admin._id, email: admin.email, name: admin.name } });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete admin (admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    await Admin.findByIdAndDelete(req.params.id);
    res.json({ message: 'Admin deleted' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
