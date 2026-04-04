const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: {
    type: String,
    required: true,
    enum: [
      'General Medicine', 'Nutrition & Diet', 'Mental Health', 'Pediatrics',
      'Cardiology', 'Dermatology', "Women's Health", 'Emergency & First Aid',
      'Dental', 'Other'
    ]
  },
  imageUrl: { type: String, default: null },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'answered', 'closed'], default: 'pending' },
  views: { type: Number, default: 0 },
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  answersCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
