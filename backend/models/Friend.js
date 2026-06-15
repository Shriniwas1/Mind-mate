const mongoose = require('mongoose');

const FriendSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'blocked'],
      default: 'pending'
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate friend requests (one per direction pair)
FriendSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// Ensure requester and recipient are different
FriendSchema.pre('save', function (next) {
  if (this.requester.equals(this.recipient)) {
    throw new Error('Cannot send friend request to yourself');
  }
  next();
});

module.exports = mongoose.model('Friend', FriendSchema);
