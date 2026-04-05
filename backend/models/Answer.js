const mongoose = require('mongoose');

const FLAG_KEYWORDS = [
  'cure', 'guaranteed', 'miracle', 'instant', 'definitely diagnose',
  'prescription', 'no need for doctor', 'home remedy only'
];

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  flagged: { type: Boolean, default: false },
  flagReason: { type: String, default: null },
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  adminNote: { type: String, default: null },
}, { timestamps: true });

// Auto-flag answers containing sensitive keywords
answerSchema.pre('save', function (next) {
  if (this.isModified('text')) {
    const lowerText = this.text.toLowerCase();
    const matched = FLAG_KEYWORDS.find(kw => lowerText.includes(kw));
    if (matched) {
      this.flagged = true;
      this.flagReason = `Contains flagged keyword: "${matched}"`;
    }
  }
  next();
});

module.exports = mongoose.model('Answer', answerSchema);
