const mongoose = require('mongoose');

const journalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  textSentiment: {
    label: String,          // Raw model label: 'Anxiety', 'Depression', etc.
    score: Number,          // Raw model confidence score
    confidence: Number,     // Alias for score (frontend compat)
    primary: String,        // Normalized human-readable emotion: 'Anxious', 'Sad', etc.
    summary: String,        // Groq-generated 1-2 sentence summary
    suggestedTasks: [String], // Groq-generated array of 3 actionable tasks
  },
  videoEmotions: [{
    emotion: String,
    confidence: Number,
    moodScore: Number,
    timestamp: Date,
  }],
  averageVideoScore: {
    type: Number,
    default: 0,
  },
  combinedMoodScore: {
    type: Number,
    required: true,
  },
  week: { type: Number, required: true },
  year: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

journalSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Journal', journalSchema);