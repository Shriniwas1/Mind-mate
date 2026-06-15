const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['breathing', 'meditation', 'exercise', 'social', 'rest', 'creativity'],
    required: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  assignedEmotion: {
    type: String,
    default: 'neutral',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

taskSchema.index({ userId: 1, completed: 1 });

module.exports = mongoose.model('Task', taskSchema);
