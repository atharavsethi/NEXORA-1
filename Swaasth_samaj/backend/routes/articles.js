const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');
const { Users } = require('../db/store');
const { protect, requireRole, requireVerified } = require('../middleware/auth');

// In-memory articles store
const articles = new Map();

// Seed a couple of awareness articles
const seedArticles = () => {
  const sampleArticles = [
    { title: 'Heart Health in the Modern Age', content: 'Regular exercise, a balanced diet, and routine checkups are key pillars of heart health...', category: 'Cardiology', tags: ['heart', 'exercise', 'diet'] },
    { title: 'Mental Wellness Tips for Everyday Life', content: 'Simple practices like mindfulness, adequate sleep, and social connection can drastically improve mental health...', category: 'Mental Health', tags: ['mindfulness', 'wellness', 'stress'] },
    { title: 'Understanding Childhood Nutrition', content: 'Children require a balanced intake of macronutrients and micronutrients for proper growth and development...', category: 'Pediatrics', tags: ['nutrition', 'children', 'diet'] },
  ];
  sampleArticles.forEach(a => {
    const id = uuid();
    articles.set(id, { _id: id, ...a, authorId: 'system', authorName: 'Swasth Samaj Team', status: 'published', createdAt: new Date().toISOString() });
  });
};
setTimeout(seedArticles, 100);

// GET /api/articles
router.get('/', (req, res) => {
  try {
    const { category } = req.query;
    let result = [...articles.values()].filter(a => a.status === 'published');
    if (category) result = result.filter(a => a.category === category);
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Populate author info
    result = result.map(a => {
      const author = Users.findById(a.authorId);
      return { ...a, author: author ? { name: author.name, specialty: author.specialty, verified: author.verified } : { name: a.authorName || 'Swasth Team' } };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/articles — verified professionals
router.post('/', protect, requireRole('doctor', 'student', 'admin'), requireVerified, (req, res) => {
  try {
    const { title, content, category, tags } = req.body;
    if (!title || !content) return res.status(400).json({ message: 'Title and content required' });
    const id = uuid();
    const article = {
      _id: id, title, content, category: category || 'General',
      tags: tags || [], authorId: req.user._id,
      status: req.user.role === 'admin' ? 'published' : 'pending',
      createdAt: new Date().toISOString()
    };
    articles.set(id, article);
    res.status(201).json(article);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/articles/:id/approve
router.put('/:id/approve', protect, requireRole('admin'), (req, res) => {
  try {
    const { status } = req.body;
    const article = articles.get(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });
    article.status = status;
    articles.set(req.params.id, article);
    res.json(article);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
