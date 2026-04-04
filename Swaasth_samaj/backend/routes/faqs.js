const express = require('express');
const router = express.Router();
const { Faqs } = require('../db/store');
const { protect, requireRole } = require('../middleware/auth');

// GET /api/faqs
router.get('/', (req, res) => {
  const allFaqs = Faqs.find();
  res.json(allFaqs);
});

// POST /api/faqs (admin only for MVP)
router.post('/', protect, requireRole('admin'), (req, res) => {
  try {
    const doc = Faqs.create(req.body);
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
