const mongoose = require('mongoose');

const ChatRoomSchema = new mongoose.Schema(
  {
    participants: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      required: true,
      validate: {
        validator: function (v) {
          return v.length === 2;
        },
        message: 'A chat room must have exactly 2 participants'
      }
    },
    participantEmails: {
      type: [String],
      required: true
    },
    lastMessage: {
      type: String,
      default: ''
    },
    lastMessageTime: {
      type: Date,
      default: null
    },
    lastMessageSenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    unreadCounts: {
      type: Map,
      of: Number,
      default: new Map()
    },
    isArchived: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Ensure participants are unique (prevent duplicate rooms)
ChatRoomSchema.index(
  { participants: 1 },
  {
    unique: true,
    sparse: true,
    name: 'unique_participants',
    collation: { locale: 'en' }
  }
);

// Indexes for efficient queries
ChatRoomSchema.index({ participants: 1, createdAt: -1 });
ChatRoomSchema.index({ 'participants.0': 1, lastMessageTime: -1 });
ChatRoomSchema.index({ 'participants.1': 1, lastMessageTime: -1 });

// Populate participants with lean documents before saving
ChatRoomSchema.pre('save', async function (next) {
  if (this.isModified('participants')) {
    try {
      const User = mongoose.model('User');
      const users = await User.find(
        { _id: { $in: this.participants } },
        'email'
      ).lean();

      if (users.length !== 2) {
        throw new Error('Both participants must be valid users');
      }

      this.participantEmails = users.map(u => u.email);
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model('ChatRoom', ChatRoomSchema);
