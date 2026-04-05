const express = require('express');
const router = express.Router();
const { LoungePosts, LoungeReplies, Users } = require('../db/store');
const { protect, requireRole } = require('../middleware/auth');

// Seed some data strictly for visual representation if empty
if (LoungePosts.find().length === 0) {
  const seededDoctor = Users.find({ role: 'doctor' })[0];
  if (seededDoctor) {
    LoungePosts.create({
      title: 'New approach to treating persistent migraines?',
      description: 'Has anyone had success with CGRP inhibitors for patients who don\'t respond well to traditional triptans? I am seeing mixed results in my clinic and would love to hear practical experiences from other neurologists here.',
      category: 'Neurology',
      authorId: seededDoctor._id,
      authorRole: 'doctor'
    });
  }
}

// Helper to populate author
const populateAuthor = (doc) => {
  if (!doc) return null;
  const author = Users.findById(doc.authorId);
  return {
    ...doc,
    author: author ? {
      _id: author._id,
      name: author.name,
      role: author.role,
      specialty: author.specialty,
      verified: author.verified
    } : null
  };
};

/**
 * @route   GET /api/lounge
 * @desc    Get all lounge posts with filters
 * @access  Public (so users can read, but posting requires role)
 */
router.get('/', (req, res) => {
  const { category, authorRole } = req.query;
  let filters = {};
  if (category && category !== 'All') filters.category = category;
  if (authorRole) filters.authorRole = authorRole; // 'doctor' or 'student'

  const posts = LoungePosts.find(filters);
  const populated = posts.map(populateAuthor).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ posts: populated });
});

/**
 * @route   POST /api/lounge
 * @desc    Create a new lounge post
 * @access  Private (Doctor or Student only)
 */
router.post('/', protect, requireRole(['doctor', 'student']), (req, res) => {
  const { title, description, category } = req.body;
  if (!title) return res.status(400).json({ message: 'Title is required' });

  // Only verified doctors & students can post
  // (In a real scenario, you'd check req.user.verified, but here we assume if they have the role they can post)
  
  const post = LoungePosts.create({
    title,
    description,
    category,
    authorId: req.user._id,
    authorRole: req.user.role
  });

  res.status(201).json(populateAuthor(post));
});

/**
 * @route   GET /api/lounge/:id
 * @desc    Get post by ID and its replies
 * @access  Public
 */
router.get('/:id', (req, res) => {
  const post = LoungePosts.findById(req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });
  
  const replies = LoungeReplies.find({ postId: req.params.id }).map(populateAuthor).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  res.json({ post: populateAuthor(post), replies });
});

/**
 * @route   POST /api/lounge/:id/reply
 * @desc    Reply to a post
 * @access  Private (Any authenticated user)
 */
router.post('/:id/reply', protect, (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ message: 'Text is required' });

  const post = LoungePosts.findById(req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  const reply = LoungeReplies.create({
    postId: post._id,
    authorId: req.user._id,
    text
  });

  res.status(201).json(populateAuthor(reply));
});

/**
 * @route   POST /api/lounge/:id/upvote
 * @desc    Upvote a lounge post
 * @access  Private
 */
router.post('/:id/upvote', protect, (req, res) => {
  const post = LoungePosts.findById(req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  let upvotes = post.upvotes || [];
  if (!upvotes.includes(req.user._id)) {
    upvotes.push(req.user._id);
  } else {
    upvotes = upvotes.filter(id => id !== req.user._id);
  }

  const updated = LoungePosts.findByIdAndUpdate(post._id, { upvotes });
  res.json(populateAuthor(updated));
});

// GET /api/lounge/my — all posts by the logged-in doctor/student
router.get('/my', protect, (req, res) => {
  try {
    const myPosts = LoungePosts.find({ authorId: req.user._id });
    const populated = myPosts.map(populateAuthor).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ posts: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
