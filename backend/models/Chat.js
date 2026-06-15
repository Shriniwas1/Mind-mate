const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  contactEmail: {
    type: String,
    required: true,
  },
  contactPhone: {
    type: String,
    required: true,
  },
  contactName: {
    type: String,
    required: true,
  },
  hasAppAccess: {
    type: Boolean,
    default: false,
  },
  lastMessage: String,
  lastMessageAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update updatedAt before saving
ChatSchema.pre('save', async function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Chat', ChatSchema);
