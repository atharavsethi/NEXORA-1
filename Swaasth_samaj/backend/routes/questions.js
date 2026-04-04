const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Questions } = require('../db/store');
const { protect } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/questions/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/questions
router.get('/', (req, res) => {
  try {
    const { category, status, search, page = 1, limit = 20 } = req.query;
    const { Users } = require('../db/store');

    let filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;

    let results = Questions.find(filter);

    // Search filter
    if (search) {
      const rx = new RegExp(search, 'i');
      results = results.filter(q => rx.test(q.title) || rx.test(q.description));
    }

    // Sort newest first
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Populate user info
    results = results.map(q => {
      const user = Users.findById(q.userId);
      return {
        ...q,
        user: user ? { _id: user._id, name: user.name, role: user.role, verified: user.verified } : null
      };
    });

    const total = results.length;
    const pageNum = parseInt(page);
    const pageSize = parseInt(limit);
    const paginated = results.slice((pageNum - 1) * pageSize, pageNum * pageSize);

    res.json({ questions: paginated, total, page: pageNum, pages: Math.ceil(total / pageSize) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/questions/my — all questions asked by the logged-in user
router.get('/my', protect, (req, res) => {
  try {
    const myQuestions = Questions.find({ userId: req.user._id });
    myQuestions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(myQuestions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/questions/:id
router.get('/:id', (req, res) => {
  try {
    const { Users } = require('../db/store');
    const q = Questions.findById(req.params.id);
    if (!q) return res.status(404).json({ message: 'Question not found' });
    // Increment views
    Questions.findByIdAndUpdate(req.params.id, { views: (q.views || 0) + 1 });
    const user = Users.findById(q.userId);
    res.json({
      ...q,
      user: user ? { _id: user._id, name: user.name, role: user.role, verified: user.verified, avatar: user.avatar } : null
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/questions
router.post('/', protect, upload.single('image'), (req, res) => {
  try {
    const { title, description, category } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });
    const question = Questions.create({
      title, description, category: category || 'General',
      userId: req.user._id,
      imageUrl: req.file ? `/uploads/questions/${req.file.filename}` : null
    });
    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/questions/:id/upvote
router.put('/:id/upvote', protect, (req, res) => {
  try {
    const q = Questions.findById(req.params.id);
    if (!q) return res.status(404).json({ message: 'Not found' });
    const upvotes = q.upvotes || [];
    const idx = upvotes.indexOf(req.user._id);
    if (idx === -1) upvotes.push(req.user._id);
    else upvotes.splice(idx, 1);
    Questions.findByIdAndUpdate(req.params.id, { upvotes });
    res.json({ upvotes: upvotes.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/questions/:id
router.delete('/:id', protect, (req, res) => {
  try {
    const q = Questions.findById(req.params.id);
    if (!q) return res.status(404).json({ message: 'Not found' });
    if (q.userId !== req.user._id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Not authorized' });
    Questions.deleteOne(req.params.id);
    res.json({ message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
