const express = require('express');
const router = express.Router();
const { SupportTickets } = require('../db/store');
const { protect } = require('../middleware/auth');

// GET /api/support/my
router.get('/my', protect, (req, res) => {
  const t = SupportTickets.find({ userId: req.user._id });
  t.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(t);
});

// POST /api/support
router.post('/', protect, (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required' });
    }
    const doc = SupportTickets.create({
      userId: req.user._id,
      subject,
      message,
    });
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
