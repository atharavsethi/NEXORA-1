const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['user', 'doctor', 'student', 'admin'], default: 'user' },
  verified: { type: Boolean, default: false },
  credentialUrl: { type: String, default: null },
  specialty: { type: String, default: '' },
  institution: { type: String, default: '' },
  bio: { type: String, default: '' },
  avatar: { type: String, default: null },
  questionsCount: { type: Number, default: 0 },
  answersCount: { type: Number, default: 0 },
}, { timestamps: true });

// Auto-verify regular users and admins
userSchema.pre('save', async function (next) {
  if (this.role === 'user' || this.role === 'admin') {
    this.verified = true;
  }
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
