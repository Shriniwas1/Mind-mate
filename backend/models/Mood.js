const mongoose = require('mongoose');

const moodSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  textScore: {
    type: Number,
    default: null,
  },
  selfieScore: {
    type: Number,
    default: null,
  },
  videoScore: {
    type: Number,
    default: null,
  },
  quizScore: {
    type: Number,
    default: null,
  },
  finalMoodScore: {
    type: Number,
    required: true,
  },
  dominantEmotion: {
    type: String,
    default: 'neutral',
  },
  type: {
    type: String,
    enum: ['text', 'selfie', 'video', 'quiz', 'combined'],
    default: 'combined',
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

// Index for faster queries
moodSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Mood', moodSchema);
