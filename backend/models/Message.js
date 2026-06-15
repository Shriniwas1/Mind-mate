const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatRoom',
      required: true,
      index: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    content: {
      type: String,
      required: true
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'voice-note'],
      default: 'text'
    },
    attachments: [
      {
        url: String,
        type: String,
        size: Number,
        name: String
      }
    ],
    delivered: {
      type: Boolean,
      default: false,
      index: true
    },
    seen: {
      type: Boolean,
      default: false,
      index: true
    },
    seenAt: {
      type: Date,
      default: null
    },
    deletedFor: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: []
    },
    editedAt: {
      type: Date,
      default: null
    },
    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: String,
      }
    ],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null
    },
    replyToContent: {
      type: String,
      default: null
    },
    replyToSenderName: {
      type: String,
      default: null
    },
    forwardedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: { updatedAt: false }
  }
);

// Compound indexes for efficient queries
MessageSchema.index({ roomId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });
MessageSchema.index({ roomId: 1, content: 'text' });

// Ensure sender and receiver are different (only when both are set)
MessageSchema.pre('save', function () {
  if (this.senderId && this.receiverId && this.senderId.equals(this.receiverId)) {
    throw new Error('Cannot send message to yourself');
  }
});

module.exports = mongoose.model('Message', MessageSchema);
