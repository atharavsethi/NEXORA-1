const express = require('express');
const router = express.Router();
const { Users, Answers, Questions, SupportTickets } = require('../db/store');
const { protect, requireRole } = require('../middleware/auth');

const adminOnly = [protect, requireRole('admin')];

// GET /api/admin/stats
router.get('/stats', ...adminOnly, (req, res) => {
  try {
    const totalUsers           = Users.countDocuments({ role: 'user' });
    const verifiedDoctors      = Users.find({ role: 'doctor', verified: true }).length;
    const verifiedStudents     = Users.find({ role: 'student', verified: true }).length;
    const totalDoctors         = verifiedDoctors + verifiedStudents;
    const pendingVerifications = Users.find({ verified: false }).filter(u => ['doctor','student'].includes(u.role)).length;
    const totalQuestions       = Questions.countDocuments({});
    const pendingAnswers       = Answers.countDocuments({ status: 'pending' });
    const totalAnswers         = Answers.countDocuments({ status: 'approved' });
    const openTickets          = SupportTickets.find({}).filter(t => t.status !== 'resolved').length;
    res.json({ totalUsers, totalDoctors, verifiedDoctors, verifiedStudents, pendingVerifications, totalQuestions, pendingAnswers, totalAnswers, openTickets });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/pending-verifications
router.get('/pending-verifications', ...adminOnly, (req, res) => {
  try {
    const pending = Users.find({}).filter(u => ['doctor','student'].includes(u.role) && !u.verified);
    const sanitized = pending.map(({ password: _, ...u }) => u).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/verify/:userId
router.put('/verify/:userId', ...adminOnly, (req, res) => {
  try {
    const { approved } = req.body;
    const user = Users.findByIdAndUpdate(req.params.userId, { verified: !!approved });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { password: _, ...userOut } = user;
    res.json({ message: approved ? 'User verified' : 'User rejected', user: userOut });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/pending-answers
router.get('/pending-answers', ...adminOnly, (req, res) => {
  try {
    const pending = Answers.find({ status: 'pending' });
    const populated = pending.map(a => {
      const doctor = Users.findById(a.doctorId);
      const question = Questions.findById(a.questionId);
      return { ...a, doctor: doctor ? { name: doctor.name, specialty: doctor.specialty, verified: doctor.verified } : null, question: question ? { title: question.title, category: question.category } : null };
    }).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/answers/:id  — approve/reject
router.put('/answers/:id', ...adminOnly, (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const answer = Answers.findById(req.params.id);
    if (!answer) return res.status(404).json({ message: 'Answer not found' });

    Answers.findByIdAndUpdate(req.params.id, { status, adminNote: adminNote || '' });
    if (status === 'approved') {
      const q = Questions.findById(answer.questionId);
      if (q) Questions.findByIdAndUpdate(answer.questionId, { status: 'answered' });
    }
    res.json({ message: `Answer ${status}`, answer: Answers.findById(req.params.id) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/all-users
router.get('/all-users', ...adminOnly, (req, res) => {
  try {
    const all = Users.find({}).map(({ password: _, ...u }) => u).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(all);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/support-tickets
router.get('/support-tickets', ...adminOnly, (req, res) => {
  try {
    const tickets = SupportTickets.find({}).map(t => {
      const user = Users.findById(t.userId);
      return { ...t, userName: user?.name || 'Unknown', userEmail: user?.email || '' };
    }).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/admin/support-tickets/:id
router.patch('/support-tickets/:id', ...adminOnly, (req, res) => {
  try {
    const { status, response } = req.body;
    const ticket = SupportTickets.findByIdAndUpdate(req.params.id, { status, response: response || '' });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/login  — standalone admin login (no JWT session for regular users)
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const ADMIN_EMAIL = 'mk1222846@gmail.com';
  const ADMIN_PASS  = 'admin123';
  if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
    const jwt = require('jsonwebtoken');
    const admin = Users.findOne({ role: 'admin' });
    if (!admin) return res.status(500).json({ message: 'Admin account not seeded' });
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET || 'swasth_secret_2024', { expiresIn: '8h' });
    const { password: _, ...adminOut } = admin;
    return res.json({ ...adminOut, token });
  }
  res.status(401).json({ message: 'Invalid admin credentials' });
});

module.exports = router;

