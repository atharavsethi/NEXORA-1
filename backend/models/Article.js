const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  category: {
    type: String,
    enum: [
      'General Medicine', 'Nutrition & Diet', 'Mental Health', 'Pediatrics',
      'Cardiology', 'Dermatology', "Women's Health", 'Emergency & First Aid',
      'Dental', 'Other'
    ],
    default: 'General Medicine'
  },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'published', 'rejected'], default: 'pending' },
  tags: [String],
  views: { type: Number, default: 0 },
  coverImage: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Article', articleSchema);
