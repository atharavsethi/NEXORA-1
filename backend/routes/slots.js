const express = require('express');
const router = express.Router();
const { Slots } = require('../db/store');
const { protect, requireRole, requireVerified } = require('../middleware/auth');

// ── POST /api/slots — Doctor creates an availability slot ─────────────────────
router.post('/', protect, requireRole('doctor'), requireVerified, (req, res) => {
  try {
    const { day, startTime, endTime, fee, duration } = req.body;
    if (!day || !startTime || !endTime || fee == null) {
      return res.status(400).json({ message: 'day, startTime, endTime and fee are required' });
    }
    const slot = Slots.create({
      doctorId: req.user._id,
      day, startTime, endTime,
      fee: parseFloat(fee),
      duration: parseInt(duration) || 30,
    });
    res.status(201).json(slot);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/slots/my — Doctor views own slots ─────────────────────────────────
router.get('/my', protect, requireRole('doctor'), (req, res) => {
  const mySlots = Slots.find({ doctorId: req.user._id });
  res.json(mySlots);
});

// ── GET /api/slots/doctor/:id — Public: patient views a doctor's available slots
router.get('/doctor/:id', (req, res) => {
  const doctorSlots = Slots.find({ doctorId: req.params.id, isBooked: false });
  res.json(doctorSlots);
});

// ── PATCH /api/slots/:id — Doctor updates fee/time ───────────────────────────
router.patch('/:id', protect, requireRole('doctor'), requireVerified, (req, res) => {
  try {
    const slot = Slots.findById(req.params.id);
    if (!slot) return res.status(404).json({ message: 'Slot not found' });
    if (slot.doctorId !== req.user._id) return res.status(403).json({ message: 'Not your slot' });

    const { day, startTime, endTime, fee, duration } = req.body;
    const updated = Slots.findByIdAndUpdate(req.params.id, {
      ...(day && { day }),
      ...(startTime && { startTime }),
      ...(endTime && { endTime }),
      ...(fee != null && { fee: parseFloat(fee) }),
      ...(duration && { duration: parseInt(duration) }),
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/slots/:id — Doctor removes a slot ─────────────────────────────
router.delete('/:id', protect, requireRole('doctor'), requireVerified, (req, res) => {
  try {
    const slot = Slots.findById(req.params.id);
    if (!slot) return res.status(404).json({ message: 'Slot not found' });
    if (slot.doctorId !== req.user._id) return res.status(403).json({ message: 'Not your slot' });
    if (slot.isBooked) return res.status(400).json({ message: 'Cannot delete a booked slot' });
    Slots.deleteOne(req.params.id);
    res.json({ message: 'Slot deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
