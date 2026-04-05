require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { Users } = require('./db/store');

const app = express();

// Ensure upload directories exist
['uploads/credentials', 'uploads/questions'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/questions',     require('./routes/questions'));
app.use('/api/answers',       require('./routes/answers'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/articles',      require('./routes/articles'));
app.use('/api/doctors',       require('./routes/doctors'));
app.use('/api/hospitals',     require('./routes/hospitals'));
app.use('/api/slots',         require('./routes/slots'));
app.use('/api/consultations', require('./routes/consultations'));
app.use('/api/chats',         require('./routes/chats'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/faqs',          require('./routes/faqs'));
app.use('/api/support',       require('./routes/support'));
app.use('/api/lounge',        require('./routes/lounge'));
app.use('/api/blood',         require('./routes/blood'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', db: 'in-memory', platform: 'Swasth Samaj' }));

// ── Seed Data ──────────────────────────────────────────────────────────────────
const seedData = async () => {
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  Users.create({ name: 'Admin', email: 'admin@swasthsamaj.in', password: adminPassword, role: 'admin', verified: true });

  // Seed mock verified doctors
  const doctors = [
    { name: 'Dr. Priya Ramesh', specialty: 'Cardiologist', institution: 'AIIMS Delhi', experience: '12 years', rating: 4.8, reviewCount: 124, patientCount: 320, responseTime: '< 30 min', bio: 'Senior Cardiologist with expertise in interventional cardiology and heart failure management.' },
    { name: 'Dr. Arjun Mehta', specialty: 'Dermatologist', institution: 'Fortis Mumbai', experience: '8 years', rating: 4.6, reviewCount: 87, patientCount: 210, responseTime: '< 1 hr', bio: 'Specialist in skin disorders, cosmetic procedures and laser treatments.' },
    { name: 'Dr. Sunita Gupta', specialty: 'Pediatrician', institution: 'Apollo Hyderabad', experience: '15 years', rating: 4.9, reviewCount: 203, patientCount: 540, responseTime: '< 20 min', bio: 'Award-winning pediatrician with special focus on neonatal care and childhood nutrition.' },
    { name: 'Dr. Rakesh Sharma', specialty: 'Orthopedician', institution: 'Max Delhi', experience: '10 years', rating: 4.5, reviewCount: 65, patientCount: 180, responseTime: '< 2 hrs', bio: 'Joint replacement specialist with advanced training from Germany.' },
    { name: 'Dr. Kavitha Nair', specialty: 'Neurologist', institution: 'Manipal Bangalore', experience: '11 years', rating: 4.7, reviewCount: 91, patientCount: 270, responseTime: '< 1 hr', bio: 'Expert in stroke management, epilepsy and neurodegenerative disorders.' },
    { name: 'Dr. Rohan Joshi', specialty: 'Psychiatrist', institution: 'Nimhans Bangalore', experience: '9 years', rating: 4.4, reviewCount: 54, patientCount: 145, responseTime: '< 3 hrs', bio: 'Specialist in depression, anxiety, PTSD and addiction medicine.' },
  ];

  for (const d of doctors) {
    const pass = await bcrypt.hash('Doctor@123', 10);
    Users.create({
      name: d.name, email: d.name.toLowerCase().replace(/\s+/g, '.') + '@swasthsamaj.in',
      password: pass, role: 'doctor', verified: true,
      specialty: d.specialty, institution: d.institution,
      experience: d.experience, bio: d.bio,
      rating: d.rating, reviewCount: d.reviewCount,
      patientCount: d.patientCount, responseTime: d.responseTime,
      online: Math.random() > 0.5,
    });
  }

  // Seed FAQs
  const { Faqs } = require('./db/store');
  const faqData = [
    { question: 'How do I book a private consultation?', answer: 'Navigate to the Forum and select "Private Chat". Pick a doctor and click "Request Chat". Once the doctor proposes a slot, you can pay to confirm.', category: 'Consultations', order: 1 },
    { question: 'Are the doctors on Swasth Samaj verified?', answer: 'Yes! All doctors must provide their MBBS or Government Registration Number and are manually verified by our admin team before they can accept consultations or answer public questions.', category: 'General', order: 2 },
    { question: 'What happens if a doctor rejects my chat request?', answer: 'If a doctor is busy or unavailable, they may reject your request. You will not be charged, and you can submit a new request to another doctor.', category: 'Consultations', order: 3 },
    { question: 'Who can see my community Q&A posts?', answer: 'Community questions are public, but you can choose to remain anonymous if you prefer. Only verified medical professionals can reply to ensure accurate information.', category: 'Community', order: 4 },
  ];
  faqData.forEach(f => Faqs.create(f));

  console.log('🌱 Seeded: 1 admin + 6 verified doctors');
  console.log('   Admin login: admin@swasthsamaj.in / Admin@123');
};

seedData();

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Swasth Samaj backend running on http://localhost:${PORT}`);
  console.log('📦 Using in-memory store (no MongoDB needed)');
});
