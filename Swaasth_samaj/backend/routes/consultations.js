const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');
const { Consultations, Slots, Users } = require('../db/store');
const { protect, requireRole, requireVerified } = require('../middleware/auth');

// helper: build enriched consultation with doctor + patient info
function enrichConsultation(c) {
  const doctor  = Users.findById(c.doctorId);
  const patient = Users.findById(c.patientId);
  return {
    ...c,
    doctor:  doctor  ? { _id: doctor._id,  name: doctor.name,  specialty: doctor.specialty, avatar: doctor.avatar } : null,
    patient: patient ? { _id: patient._id, name: patient.name, email: patient.email } : null,
  };
}

// ── POST /api/consultations — Patient requests a consultation ─────────────────
router.post('/', protect, (req, res) => {
  try {
    if (!['user', 'patient'].includes(req.user.role) && req.user.role !== 'user') {
      // allow any logged-in user to book
    }
    const { doctorId, slotId, symptoms } = req.body;
    if (!doctorId || !slotId) {
      return res.status(400).json({ message: 'doctorId and slotId are required' });
    }

    const slot = Slots.findById(slotId);
    if (!slot) return res.status(404).json({ message: 'Slot not found' });
    if (slot.isBooked) return res.status(400).json({ message: 'This slot is already booked. Please choose another.' });
    if (slot.doctorId !== doctorId) return res.status(400).json({ message: 'Slot does not belong to this doctor' });

    const consultation = Consultations.create({
      patientId: req.user._id,
      doctorId,
      slotId,
      slotDay: slot.day,
      slotTime: `${slot.startTime} - ${slot.endTime}`,
      fee: slot.fee,
      symptoms: symptoms || '',
    });

    // Mark slot as tentatively held (will confirm on payment)
    Slots.findByIdAndUpdate(slotId, { isBooked: true });

    res.status(201).json(enrichConsultation(consultation));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/consultations/:id/pay — Simulate payment ───────────────────────
router.post('/:id/pay', protect, (req, res) => {
  try {
    const c = Consultations.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Consultation not found' });
    if (c.patientId !== req.user._id) return res.status(403).json({ message: 'Not your consultation' });
    if (c.status !== 'pending_payment') {
      return res.status(400).json({ message: `Cannot pay for a consultation in status: ${c.status}` });
    }

    // Simulate payment: generate a fake payment reference
    const paymentId = `PAY-${uuid().split('-')[0].toUpperCase()}`;
    const updated = Consultations.findByIdAndUpdate(req.params.id, {
      status: 'payment_done',
      paymentId,
    });

    res.json({ message: '✅ Payment successful! Awaiting doctor confirmation.', consultation: enrichConsultation(updated), paymentId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/consultations/my — Patient sees their bookings ──────────────────
router.get('/my', protect, (req, res) => {
  const list = Consultations.find({ patientId: req.user._id });
  // Sort newest first
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list.map(enrichConsultation));
});

// ── GET /api/consultations/doctor — Doctor sees incoming requests ─────────────
router.get('/doctor', protect, requireRole('doctor'), requireVerified, (req, res) => {
  const list = Consultations.find({ doctorId: req.user._id });
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list.map(enrichConsultation));
});

// ── PATCH /api/consultations/:id/accept — Doctor accepts ─────────────────────
router.patch('/:id/accept', protect, requireRole('doctor'), requireVerified, (req, res) => {
  try {
    const c = Consultations.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Consultation not found' });
    if (c.doctorId !== req.user._id) return res.status(403).json({ message: 'Not your consultation' });
    if (c.status !== 'payment_done') {
      return res.status(400).json({ message: 'Can only accept consultations where payment is confirmed' });
    }

    const { doctorMessage, meetLink } = req.body;
    const updated = Consultations.findByIdAndUpdate(req.params.id, {
      status: 'accepted',
      doctorMessage: doctorMessage || 'Your appointment is confirmed. I will see you at the scheduled time.',
      meetLink: meetLink || '',
    });

    res.json({ message: '✅ Consultation accepted', consultation: enrichConsultation(updated) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/consultations/:id/reject — Doctor rejects ─────────────────────
router.patch('/:id/reject', protect, requireRole('doctor'), requireVerified, (req, res) => {
  try {
    const c = Consultations.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Consultation not found' });
    if (c.doctorId !== req.user._id) return res.status(403).json({ message: 'Not your consultation' });
    if (!['payment_done', 'pending_payment'].includes(c.status)) {
      return res.status(400).json({ message: 'Cannot reject consultation in current status' });
    }

    const { doctorMessage } = req.body;
    const updated = Consultations.findByIdAndUpdate(req.params.id, {
      status: 'rejected',
      doctorMessage: doctorMessage || 'Sorry, I am unable to take this appointment. Please try a different slot.',
    });

    // Free the slot back
    if (c.slotId) {
      Slots.findByIdAndUpdate(c.slotId, { isBooked: false });
    }

    res.json({ message: 'Consultation rejected. Slot freed.', consultation: enrichConsultation(updated) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/consultations/:id/complete — Doctor marks complete ─────────────
router.patch('/:id/complete', protect, requireRole('doctor'), requireVerified, (req, res) => {
  try {
    const c = Consultations.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Consultation not found' });
    if (c.doctorId !== req.user._id) return res.status(403).json({ message: 'Not your consultation' });
    if (c.status !== 'accepted') {
      return res.status(400).json({ message: 'Can only complete accepted consultations' });
    }

    const updated = Consultations.findByIdAndUpdate(req.params.id, { status: 'completed' });
    // Update doctor's patient count
    Users.findByIdAndUpdate(req.user._id, { $inc: { patientCount: 1 } });

    res.json({ message: '✅ Consultation marked as completed', consultation: enrichConsultation(updated) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/consultations/:id — get single consultation ─────────────────────
router.get('/:id', protect, (req, res) => {
  const c = Consultations.findById(req.params.id);
  if (!c) return res.status(404).json({ message: 'Consultation not found' });
  if (c.patientId !== req.user._id && c.doctorId !== req.user._id && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  res.json(enrichConsultation(c));
});

module.exports = router;
