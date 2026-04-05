const express = require('express');
const router = express.Router();
const { Answers, Questions, Users, Notifications } = require('../db/store');
const { protect, requireRole, requireVerified } = require('../middleware/auth');

// GET /api/answers/my — all answers by the logged-in doctor/student
router.get('/my', protect, (req, res) => {
  try {
    const myAnswers = Answers.find({ doctorId: req.user._id });
    const populated = myAnswers.map(a => {
      const question = Questions.findById(a.questionId);
      return {
        ...a,
        question: question ? { _id: question._id, title: question.title, category: question.category, status: question.status } : null
      };
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/answers/question/:questionId  — approved answers for a question
router.get('/question/:questionId', (req, res) => {
  try {
    const answers = Answers.find({ questionId: req.params.questionId, status: 'approved' });
    const populated = answers.map(a => {
      const doc = Users.findById(a.doctorId);
      return {
        ...a,
        doctor: doc ? { _id: doc._id, name: doc.name, role: doc.role, verified: doc.verified, specialty: doc.specialty, institution: doc.institution, avatar: doc.avatar, rating: doc.rating } : null
      };
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/answers — ONLY verified doctors or verified medical students can answer
router.post('/', protect, (req, res) => {
  try {
    // Strict role check: must be doctor or student
    if (!['doctor', 'student'].includes(req.user.role) && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Only verified doctors and medical students can post answers in the forum.'
      });
    }
    // Must be verified by admin
    if (!req.user.verified) {
      return res.status(403).json({
        message: 'Your credentials are still under review. You can post answers once an admin approves your account.'
      });
    }

    const { questionId, text } = req.body;
    if (!questionId || !text) return res.status(400).json({ message: 'questionId and text required' });
    const question = Questions.findById(questionId);
    if (!question) return res.status(404).json({ message: 'Question not found' });

    const answer = Answers.create({ questionId, doctorId: req.user._id, text });
    // bump question answers count
    Questions.findByIdAndUpdate(questionId, { answersCount: (question.answersCount || 0) + 1 });
    
    // Notify the question author
    if (question.userId !== req.user._id) {
      Notifications.create({
        userId: question.userId,
        text: `A verified professional (${req.user.name}) responded to your query: "${question.title}"`,
        link: `/forum/${questionId}`
      });
    }

    res.status(201).json(answer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/answers/:id/upvote
router.put('/:id/upvote', protect, (req, res) => {
  try {
    const a = Answers.findById(req.params.id);
    if (!a || a.status !== 'approved') return res.status(404).json({ message: 'Not found' });
    const upvotes = a.upvotes || [];
    const idx = upvotes.indexOf(req.user._id);
    if (idx === -1) upvotes.push(req.user._id);
    else upvotes.splice(idx, 1);
    Answers.findByIdAndUpdate(req.params.id, { upvotes });
    res.json({ upvotes: upvotes.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
