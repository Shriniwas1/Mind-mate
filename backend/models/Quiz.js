const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  answers: {
    type: Map,
    of: Number,
    required: true,
  },
  quizScore: {
    type: Number,
    required: true,
  },
  week: {
    type: Number,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

quizSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Quiz', quizSchema);
