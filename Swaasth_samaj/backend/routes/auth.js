const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const { Users, Notifications } = require('../db/store');

// Multer — credential uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/credentials/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only JPG, PNG, PDF files are allowed'));
  }
});

const generateToken = (user) =>
  jwt.sign(
    { id: user._id, name: user.name, email: user.email, role: user.role, verified: user.verified },
    process.env.JWT_SECRET || 'swasth_secret_2024',
    { expiresIn: '7d' }
  );

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', upload.single('credential'), async (req, res) => {
  try {
    let { name, email, password, role, specialty, institution, experience,
          licenseNumber, studentId, college, yearOfStudy } = req.body;
    email = (email || '').toLowerCase().trim();

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check duplicate email
    if (Users.findOne({ email })) {
      return res.status(400).json({ message: 'Email already registered. Please login.' });
    }

    // Doctors must provide license number
    if (role === 'doctor' && !licenseNumber) {
      return res.status(400).json({ message: 'MBBS/Government Registration Number is required for doctors' });
    }

    // Students must provide student ID
    if (role === 'student' && !studentId) {
      return res.status(400).json({ message: 'College Student ID is required for medical students' });
    }

    // Doctors/students need credential upload
    if (['doctor', 'student'].includes(role) && !req.file) {
      return res.status(400).json({ message: 'Credential document is required for doctors/students' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = Users.create({
      name, email, password: hashedPassword, role: role || 'user',
      specialty: specialty || '', institution: institution || '',
      experience: experience || '',
      licenseNumber: licenseNumber || '',
      studentId: studentId || '',
      college: college || '', yearOfStudy: yearOfStudy || '',
      credentialUrl: req.file ? `/uploads/credentials/${req.file.filename}` : null,
    });

    // Remove password from response
    const { password: _, ...userOut } = user;

    res.status(201).json({
      ...userOut,
      token: generateToken(user)
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: err.message || 'Registration failed' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
// Doctor: requires email + password + licenseNumber
// Student: requires email + password + studentId
// Patient/Admin: requires email + password only
router.post('/login', async (req, res) => {
  try {
    let { email, password, role, licenseNumber, studentId } = req.body;
    email = (email || '').toLowerCase().trim();

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = Users.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // ── Role-specific secondary verification ────────────────────────────────
    if (role === 'doctor' || user.role === 'doctor') {
      if (user.role !== 'doctor') {
        return res.status(403).json({ message: 'This account is not registered as a doctor.' });
      }
      if (!licenseNumber) {
        return res.status(400).json({ message: 'License / Government Registration ID is required for doctor login.' });
      }
      if (user.licenseNumber.toLowerCase() !== licenseNumber.toLowerCase().trim()) {
        return res.status(401).json({ message: 'License/Gov ID does not match records. Access denied.' });
      }
      if (!user.verified) {
        return res.status(403).json({ message: 'Your doctor account is pending admin verification. You will be notified once approved.' });
      }
    }

    if (role === 'student' || user.role === 'student') {
      if (user.role !== 'student') {
        return res.status(403).json({ message: 'This account is not registered as a student.' });
      }
      if (!studentId) {
        return res.status(400).json({ message: 'College Student ID is required for student login.' });
      }
      if (user.studentId.toLowerCase() !== studentId.toLowerCase().trim()) {
        return res.status(401).json({ message: 'Student ID does not match records. Access denied.' });
      }
      if (!user.verified) {
        return res.status(403).json({ message: 'Your student account is pending admin verification. You will be notified once approved.' });
      }
    }

    const { password: _, ...userOut } = user;
    Notifications.create({
      userId: user._id,
      text: `Welcome back, ${user.name}! You are successfully logged in.`,
    });

    res.json({
      ...userOut,
      token: generateToken(user)
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: err.message || 'Login failed' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
const { protect } = require('../middleware/auth');
router.get('/me', protect, (req, res) => {
  const { password: _, ...userOut } = req.user;
  res.json(userOut);
});

// ── PATCH /api/auth/profile ──────────────────────────────────────────────
router.patch('/profile', protect, (req, res) => {
  try {
    const { name, bio, gender, age, bloodGroup, phone,
            specialty, institution, experience, consultationFee, responseTime } = req.body;
    const updates = {};
    if (name          !== undefined) updates.name          = name;
    if (bio           !== undefined) updates.bio           = bio;
    if (gender        !== undefined) updates.gender        = gender;
    if (age           !== undefined) updates.age           = age;
    if (bloodGroup    !== undefined) updates.bloodGroup    = bloodGroup;
    if (phone         !== undefined) updates.phone         = phone;
    // Professional fields (doctor/student only)
    if (specialty     !== undefined) updates.specialty     = specialty;
    if (institution   !== undefined) updates.institution   = institution;
    if (experience    !== undefined) updates.experience    = experience;
    if (consultationFee !== undefined) updates.consultationFee = parseFloat(consultationFee) || 0;
    if (responseTime  !== undefined) updates.responseTime  = responseTime;

    const updated = Users.findByIdAndUpdate(req.user._id, updates);
    const { password: _, ...userOut } = updated;
    res.json(userOut);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Update failed' });
  }
});

// ── GET /api/auth/doctor-stats ──────────────────────────────────────────
router.get('/doctor-stats', protect, (req, res) => {
  try {
    const { Answers, Questions, Consultations, LoungePosts, ChatRequests, Ratings } = require('../db/store');
    const uid = req.user._id;

    const myAnswers       = Answers.find({ doctorId: uid });
    const myConsultations = Consultations.find({ doctorId: uid });
    const myPosts         = LoungePosts.find({ authorId: uid });
    const chatRequests    = ChatRequests.find({ doctorId: uid });
    const ratings         = Ratings.getForDoctor(uid);

    const pending   = myAnswers.filter(a => a.status === 'pending').length;
    const approved  = myAnswers.filter(a => a.status === 'approved').length;
    const rejected  = myAnswers.filter(a => a.status === 'rejected').length;

    const consultPending   = myConsultations.filter(c => c.status === 'payment_done').length;
    const consultActive    = myConsultations.filter(c => c.status === 'accepted').length;
    const consultCompleted = myConsultations.filter(c => c.status === 'completed').length;

    res.json({
      answers: { total: myAnswers.length, pending, approved, rejected },
      consultations: { total: myConsultations.length, pending: consultPending, active: consultActive, completed: consultCompleted },
      loungePosts: myPosts.length,
      chatRequests: chatRequests.length,
      rating: req.user.rating || 0,
      reviewCount: req.user.reviewCount || 0,
      patientCount: req.user.patientCount || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
