const express = require('express');
const Notification = require('../models/Notification');
const { verifyAny } = require('../middleware/auth');

const router = express.Router();

router.use(verifyAny);

router.get('/', async (req, res) => {
  try {
    const recipientType = req.admin ? 'admin' : 'user';
    const recipientId = req.admin ? req.admin._id : req.user._id;
    const unreadOnly = String(req.query.unread || '') === 'true';
    const filter = { recipientType, recipientId };
    if (unreadOnly) filter.read = false;

    const items = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ recipientType, recipientId, read: false });
    res.json({ notifications: items, unreadCount });
  } catch (error) {
    console.error('List notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/read-all', async (req, res) => {
  try {
    const recipientType = req.admin ? 'admin' : 'user';
    const recipientId = req.admin ? req.admin._id : req.user._id;
    await Notification.updateMany({ recipientType, recipientId, read: false }, { $set: { read: true } });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Read all notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    const recipientType = req.admin ? 'admin' : 'user';
    const recipientId = req.admin ? req.admin._id : req.user._id;
    const item = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientType, recipientId },
      { $set: { read: true } },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: 'Notification not found' });
    res.json({ notification: item });
  } catch (error) {
    console.error('Read notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
