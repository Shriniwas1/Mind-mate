const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');

/* ══════════════════════════════════════════════════════════════
   1. START CHAT - Get or create chat session
   POST /api/chat/start
══════════════════════════════════════════════════════════════ */
router.post('/start', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const contact = user.emergencyContact;
    if (!contact) return res.status(404).json({ error: 'No emergency contact found' });

    // Find existing chat or create new one
    let chat = await Chat.findOne({
      userId: req.userId,
      contactEmail: contact.email,
    });

    if (!chat) {
      chat = await Chat.create({
        userId: req.userId,
        contactEmail: contact.email,
        contactPhone: contact.phone,
        contactName: contact.name,
        hasAppAccess: contact.hasApp || false,
      });
      console.log(`✅ Chat session created: ${chat._id}`);
    }

    res.status(200).json({ success: true, chat });
  } catch (error) {
    console.error('❌ Chat start error:', error);
    res.status(500).json({ error: 'Failed to start chat', details: error.message });
  }
});

/* ══════════════════════════════════════════════════════════════
   2. GET CHAT HISTORY
   GET /api/chat/history/:chatId
══════════════════════════════════════════════════════════════ */
router.get('/history/:chatId', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const user = await User.findById(req.userId);

    // Verify user is involved in this chat (either initiator or receiver)
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    // Compare as strings
    const isInitiator = String(chat.userId) === String(req.userId);
    const isReceiver = chat.contactEmail === user.email;

    if (!isInitiator && !isReceiver) {
      console.log(`❌ Unauthorized: userId=${req.userId}, chat.userId=${chat.userId}, user.email=${user.email}, chat.contactEmail=${chat.contactEmail}`);
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Fetch message history using roomId (matches Message schema)
    const messages = await Message.find({ roomId: chatId })
      .sort({ createdAt: 1 })
      .limit(50)
      .populate('senderId', 'name email');

    res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error('❌ Chat history error:', error);
    res.status(500).json({ error: 'Failed to fetch history', details: error.message });
  }
});

/* ══════════════════════════════════════════════════════════════
   3. GET ACTIVE CHAT
   GET /api/chat/active
══════════════════════════════════════════════════════════════ */
router.get('/active', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const contact = user.emergencyContact;
    if (!contact) return res.status(404).json({ error: 'No emergency contact found' });

    console.log(`🔍 Looking for chat - Current user: ${user.email}, Contact: ${contact.email}`);

    // Find ANY chat involving both emails (direction-agnostic)
    let chat = await Chat.findOne({
      $or: [
        { userId: req.userId, contactEmail: contact.email },
        { contactEmail: user.email }, // User is the contact in someone else's chat
      ],
    });

    if (chat) {
      console.log(`✅ Found existing chat: ${chat._id}`);
      return res.status(200).json({ success: true, chat });
    }

    // Create new chat if none exists
    console.log(`📝 Creating new chat for ${user.email}`);
    chat = await Chat.create({
      userId: req.userId,
      contactEmail: contact.email,
      contactPhone: contact.phone,
      contactName: contact.name,
      hasAppAccess: contact.hasApp || false,
    });

    console.log(`✅ New chat created: ${chat._id}`);
    res.status(200).json({ success: true, chat });
  } catch (error) {
    console.error('❌ Get active chat error:', error);
    res.status(500).json({ error: 'Failed to get chat', details: error.message });
  }
});

/* ══════════════════════════════════════════════════════════════
   4. MARK MESSAGES AS READ
   PATCH /api/chat/:chatId/mark-read
══════════════════════════════════════════════════════════════ */
router.patch('/:chatId/mark-read', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;

    // Verify user owns this chat
    const chat = await Chat.findOne({ _id: chatId, userId: req.userId });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    // Mark all unread messages NOT from this user as read
    await Message.updateMany(
      { roomId: chatId, senderId: { $ne: req.userId }, seen: false },
      { seen: true, seenAt: new Date() }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark as read', details: error.message });
  }
});

/* ══════════════════════════════════════════════════════════════
   5. EDIT MESSAGE
   PUT /api/chat/:chatId/message/:messageId
══════════════════════════════════════════════════════════════ */
router.put('/:chatId/message/:messageId', authenticate, async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content required' });
    }

    // Verify user is in this chat
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    const user = await User.findById(req.userId);
    const isInitiator = String(chat.userId) === String(req.userId);
    const isReceiver = chat.contactEmail === user.email;

    if (!isInitiator && !isReceiver) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Find message and verify ownership (using senderId)
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    if (String(message.senderId) !== String(req.userId)) {
      return res.status(403).json({ error: 'Can only edit your own messages' });
    }

    // Update message
    message.content = content;
    message.editedAt = new Date();
    await message.save();

    const updatedMessage = await Message.findById(messageId)
      .populate('senderId', 'name email');

    // Emit socket event
    const io = req.app.locals.io;
    if (io) {
      io.of('/chat').to(chatId).emit('chat:message-updated', {
        message: updatedMessage,
      });
    }

    res.status(200).json({ success: true, message: updatedMessage });
  } catch (error) {
    console.error('❌ Edit message error:', error);
    res.status(500).json({ error: 'Failed to edit message', details: error.message });
  }
});

/* ══════════════════════════════════════════════════════════════
   6. ADD REACTION TO MESSAGE
   POST /api/chat/:chatId/message/:messageId/react
══════════════════════════════════════════════════════════════ */
router.post('/:chatId/message/:messageId/react', authenticate, async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ error: 'Emoji required' });
    }

    // Verify user is in this chat
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    const user = await User.findById(req.userId);
    const isInitiator = String(chat.userId) === String(req.userId);
    const isReceiver = chat.contactEmail === user.email;

    if (!isInitiator && !isReceiver) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Find message
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    // Check if user already reacted with same emoji
    const existingReaction = message.reactions.findIndex(
      (r) => String(r.userId) === String(req.userId) && r.emoji === emoji
    );

    if (existingReaction !== -1) {
      message.reactions.splice(existingReaction, 1);
    } else {
      message.reactions.push({ userId: req.userId, emoji });
    }

    await message.save();
    const updatedMessage = await Message.findById(messageId)
      .populate('senderId', 'name email');

    console.log(`😊 Reaction toggled: ${emoji} on ${messageId}`);

    // Emit socket event
    const io = req.app.locals.io;
    if (io) {
      io.of('/chat').to(chatId).emit('chat:message-reacted', {
        message: updatedMessage,
      });
    }

    res.status(200).json({ success: true, message: updatedMessage });
  } catch (error) {
    console.error('❌ React to message error:', error);
    res.status(500).json({ error: 'Failed to add reaction', details: error.message });
  }
});

/* ══════════════════════════════════════════════════════════════
   7. DELETE MESSAGE
   DELETE /api/chat/:chatId/message/:messageId
══════════════════════════════════════════════════════════════ */
router.delete('/:chatId/message/:messageId', authenticate, async (req, res) => {
  try {
    const { chatId, messageId } = req.params;

    // Verify user is in this chat
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    const user = await User.findById(req.userId);
    const isInitiator = String(chat.userId) === String(req.userId);
    const isReceiver = chat.contactEmail === user.email;

    if (!isInitiator && !isReceiver) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Find message and verify ownership (using senderId)
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    if (String(message.senderId) !== String(req.userId)) {
      return res.status(403).json({ error: 'Can only delete your own messages' });
    }

    await Message.deleteOne({ _id: messageId });
    console.log(`🗑️ Message deleted: ${messageId}`);

    // Emit socket event
    const io = req.app.locals.io;
    if (io) {
      io.of('/chat').to(chatId).emit('chat:message-deleted', { messageId });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message', details: error.message });
  }
});

module.exports = router;
