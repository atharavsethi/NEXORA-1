const express = require('express');
const router = express.Router();
const { ChatRequests, ChatMessages, Users, Notifications } = require('../db/store');
const { protect, requireRole, requireVerified } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

// ── Helper ────────────────────────────────────────────────────────────────────
function enrichRequest(r) {
  const doctor  = Users.findById(r.doctorId);
  const patient = Users.findById(r.patientId);
  return {
    ...r,
    doctor:  doctor  ? { _id: doctor._id,  name: doctor.name,  specialty: doctor.specialty, avatar: doctor.avatar, rating: doctor.rating } : null,
    patient: patient ? { _id: patient._id, name: patient.name, email: patient.email } : null,
  };
}

// ── POST /api/chats/request ── Patient requests a private chat with a doctor ──
router.post('/request', protect, (req, res) => {
  try {
    const { doctorId, concern, preferredDay, preferredTime } = req.body;
    if (!doctorId || !concern) {
      return res.status(400).json({ message: 'doctorId and concern are required' });
    }
    const doctor = Users.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const chatReq = ChatRequests.create({
      patientId: req.user._id,
      doctorId,
      concern,
      preferredDay:  preferredDay  || '',
      preferredTime: preferredTime || '',
    });

    res.status(201).json(enrichRequest(chatReq));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/chats/my ── Patient views all their chat requests ─────────────────
router.get('/my', protect, (req, res) => {
  const list = ChatRequests.find({ patientId: req.user._id });
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list.map(enrichRequest));
});

// ── GET /api/chats/doctor ── Doctor views incoming chat requests ───────────────
router.get('/doctor', protect, requireRole('doctor'), requireVerified, (req, res) => {
  const list = ChatRequests.find({ doctorId: req.user._id });
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list.map(enrichRequest));
});

// Alias used by the Doctor Portal dashboard
router.get('/doctor-requests', protect, requireRole('doctor'), requireVerified, (req, res) => {
  const list = ChatRequests.find({ doctorId: req.user._id });
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list.map(enrichRequest));
});

// ── GET /api/chats/medical ── Works for BOTH doctors AND students ─────────────
router.get('/medical', protect, requireVerified, (req, res) => {
  if (!['doctor', 'student'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Only medical professionals can access this endpoint.' });
  }
  const list = ChatRequests.find({ doctorId: req.user._id });
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list.map(enrichRequest));
});

// ── PATCH /api/chats/:id/propose ── Doctor/student proposes a chat slot & fee ─
router.patch('/:id/propose', protect, requireVerified, (req, res) => {
  try {
    if (!['doctor', 'student'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only medical professionals can propose slots.' });
    }
    const r = ChatRequests.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Chat request not found' });
    if (r.doctorId !== req.user._id) return res.status(403).json({ message: 'Not your request' });
    if (r.status !== 'pending') return res.status(400).json({ message: 'Can only propose on pending requests' });

    const { proposedDay, proposedTime, fee, duration, doctorNote } = req.body;
    if (!proposedDay || !proposedTime || fee == null) {
      return res.status(400).json({ message: 'proposedDay, proposedTime and fee are required' });
    }

    const updated = ChatRequests.findByIdAndUpdate(req.params.id, {
      status: 'slot_proposed',
      proposedDay,
      proposedTime,
      fee: parseFloat(fee),
      duration: parseInt(duration) || 30,
      doctorNote: doctorNote || '',
    });

    Notifications.create({
      userId: r.patientId,
      text: `Dr. ${req.user.name} proposed a private chat slot: ${proposedDay} at ${proposedTime}`,
      link: `/private-chats`
    });

    res.json(enrichRequest(updated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/chats/:id/reject ── Doctor or student rejects the chat request ─
router.patch('/:id/reject', protect, requireVerified, (req, res) => {
  try {
    if (!['doctor', 'student'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only medical professionals can reject requests.' });
    }
    const r = ChatRequests.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Chat request not found' });
    if (r.doctorId !== req.user._id) return res.status(403).json({ message: 'Not your request' });

    const updated = ChatRequests.findByIdAndUpdate(req.params.id, {
      status: 'rejected',
      doctorNote: req.body.doctorNote || 'I am unable to accept this chat request at the moment.',
    });

    res.json(enrichRequest(updated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/chats/:id/pay ── Patient simulates payment to confirm chat slot ──
router.post('/:id/pay', protect, (req, res) => {
  try {
    const r = ChatRequests.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Chat request not found' });
    if (r.patientId !== req.user._id) return res.status(403).json({ message: 'Not your request' });
    if (r.status !== 'slot_proposed') {
      return res.status(400).json({ message: 'Payment is only allowed after doctor proposes a slot' });
    }

    const paymentId = `CHAT-PAY-${uuid().split('-')[0].toUpperCase()}`;
    const updated = ChatRequests.findByIdAndUpdate(req.params.id, {
      status: 'payment_done',
      paymentId,
    });

    res.json({ message: '✅ Payment confirmed! Your private chat room is being prepared.', request: enrichRequest(updated), paymentId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/chats/:id/open ── Doctor/student opens the chat room ─────────
router.patch('/:id/open', protect, requireVerified, (req, res) => {
  try {
    if (!['doctor', 'student'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only medical professionals can open chats.' });
    }
    const r = ChatRequests.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Chat request not found' });
    if (r.doctorId !== req.user._id) return res.status(403).json({ message: 'Not your request' });
    if (r.status !== 'payment_done') {
      return res.status(400).json({ message: 'Chat can only be opened after payment is confirmed' });
    }

    const updated = ChatRequests.findByIdAndUpdate(req.params.id, { status: 'active' });
    
    Notifications.create({
      userId: r.patientId,
      text: `Dr. ${req.user.name} has entered your private chat room! You can now send messages.`,
      link: `/private-chats`
    });

    res.json({ message: '✅ Chat room is now open', request: enrichRequest(updated) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/chats/:id/close ── Doctor/student closes / completes the chat ─
router.patch('/:id/close', protect, requireVerified, (req, res) => {
  try {
    if (!['doctor', 'student'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only medical professionals can close chats.' });
    }
    const r = ChatRequests.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Chat request not found' });
    if (r.doctorId !== req.user._id) return res.status(403).json({ message: 'Not your request' });
    if (r.status !== 'active') {
      return res.status(400).json({ message: 'Only active chats can be closed' });
    }

    const updated = ChatRequests.findByIdAndUpdate(req.params.id, {
      status: 'completed',
      closedAt: new Date().toISOString(),
    });

    Users.findByIdAndUpdate(req.user._id, { $inc: { patientCount: 1 } });
    res.json({ message: '✅ Chat session marked as completed', request: enrichRequest(updated) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/chats/:id ── Get a single chat request with messages ─────────────
router.get('/:id', protect, (req, res) => {
  const r = ChatRequests.findById(req.params.id);
  if (!r) return res.status(404).json({ message: 'Chat request not found' });
  if (r.patientId !== req.user._id && r.doctorId !== req.user._id && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  const msgs = ChatMessages.find({ chatId: req.params.id });
  msgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  res.json({ ...enrichRequest(r), messages: msgs });
});

// ── POST /api/chats/:id/messages ── Send a message inside an active chat ──────
router.post('/:id/messages', protect, (req, res) => {
  try {
    const r = ChatRequests.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Chat not found' });
    if (r.patientId !== req.user._id && r.doctorId !== req.user._id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (r.status !== 'active') {
      return res.status(400).json({ message: 'Chat is not active. Messages cannot be sent.' });
    }

    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Message text is required' });

    const msg = ChatMessages.create({
      chatId: req.params.id,
      senderId: req.user._id,
      senderName: req.user.name,
      senderRole: req.user.role,
      text: text.trim(),
    });

    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/chats/:id/messages ── Poll messages for an active chat ────────────
router.get('/:id/messages', protect, (req, res) => {
  const r = ChatRequests.findById(req.params.id);
  if (!r) return res.status(404).json({ message: 'Chat not found' });
  if (r.patientId !== req.user._id && r.doctorId !== req.user._id) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const msgs = ChatMessages.find({ chatId: req.params.id });
  msgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  res.json(msgs);
});

module.exports = router;
