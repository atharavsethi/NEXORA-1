const express = require('express');
const router = express.Router();
const { Notifications } = require('../db/store');
const { protect } = require('../middleware/auth');

// GET /api/notifications ── Get all notifications for logged-in user
router.get('/', protect, (req, res) => {
  try {
    const list = Notifications.find({ userId: req.user._id });
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/notifications/read-all ── Mark all as read
router.patch('/read-all', protect, (req, res) => {
  try {
    Notifications.markAllRead(req.user._id);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/notifications/:id/read ── Mark single as read
router.patch('/:id/read', protect, (req, res) => {
  try {
    const notif = Notifications.findByIdAndUpdate(req.params.id, { read: true });
    if (!notif) return res.status(404).json({ message: 'Not found' });
    if (notif.userId !== req.user._id) return res.status(403).json({ message: 'Access denied' });
    res.json(notif);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
