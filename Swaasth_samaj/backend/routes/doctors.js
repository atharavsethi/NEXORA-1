const express = require('express');
const router = express.Router();
const { Users, Ratings } = require('../db/store');
const { protect } = require('../middleware/auth');

// GET /api/doctors — all verified doctors, sorted by rating
router.get('/', (req, res) => {
  try {
    const { specialty, minRating, search } = req.query;
    let doctors = Users.find({ role: 'doctor', verified: true });

    if (specialty) doctors = doctors.filter(d => d.specialty.toLowerCase().includes(specialty.toLowerCase()));
    if (minRating) doctors = doctors.filter(d => (d.rating || 0) >= parseFloat(minRating));
    if (search) {
      const rx = new RegExp(search, 'i');
      doctors = doctors.filter(d => rx.test(d.name) || rx.test(d.specialty) || rx.test(d.institution));
    }

    // Sort by rating desc
    doctors.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    const sanitized = doctors.map(({ password: _, ...d }) => d);
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/doctors/:id — doctor profile
router.get('/:id', (req, res) => {
  try {
    const doc = Users.findById(req.params.id);
    if (!doc || doc.role !== 'doctor') return res.status(404).json({ message: 'Doctor not found' });
    const { password: _, ...docOut } = doc;
    const reviews = Ratings.getForDoctor(req.params.id);
    res.json({ ...docOut, reviews });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/doctors/:id/ratings — alias for reviews (used by Profile page)
router.get('/:id/ratings', (req, res) => {
  try {
    const reviews = Ratings.getForDoctor(req.params.id);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/doctors/:id/rate — rate a doctor (logged-in users)
router.post('/:id/rate', protect, (req, res) => {
  try {
    const { stars, comment } = req.body;
    if (!stars || stars < 1 || stars > 5) return res.status(400).json({ message: 'Rating must be 1-5' });
    const doc = Users.findById(req.params.id);
    if (!doc || doc.role !== 'doctor') return res.status(404).json({ message: 'Doctor not found' });
    Ratings.add(req.params.id, req.user._id, parseInt(stars), comment || '');
    const updated = Users.findById(req.params.id);
    res.json({ rating: updated.rating, reviewCount: updated.reviewCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
