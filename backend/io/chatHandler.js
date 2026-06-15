const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');

// Store active user connections: Map<userId, socket>
const userSockets = new Map();

module.exports = function setupChatHandlers(io) {
  const chatNamespace = io.of('/chat');

  chatNamespace.on('connection', (socket) => {
    console.log(`📱 User connected to chat: ${socket.id}`);

    /* ─── User Join ───────────────────────────────────── */
    socket.on('chat:join', async ({ chatId, userId }) => {
      try {
        // Store socket connection
        userSockets.set(userId, socket);
        socket.userId = userId; // Tag socket for later reference
        socket.join(chatId);

        console.log(`✅ User ${userId} joined chat ${chatId}`);

        // Fetch recent messages (use roomId — aligns with Message schema)
        const messages = await Message.find({ roomId: chatId })
          .sort({ createdAt: 1 })
          .limit(50)
          .populate('senderId', 'name email')
          .lean();

        socket.emit('chat:history', { messages });

        // Notify other participants
        socket.broadcast.to(chatId).emit('chat:user-joined', { userId });
      } catch (error) {
        console.error('❌ Chat join error:', error);
        socket.emit('chat:error', { message: 'Failed to join chat' });
      }
    });

    /* ─── Send Message ───────────────────────────────── */
    socket.on('chat:message', async ({ chatId, content, userId, replyTo }) => {
      try {
        // Get user info
        const user = await User.findById(userId);
        if (!user) {
          socket.emit('chat:error', { message: 'User not found' });
          return;
        }

        // Get chat info
        const chat = await Chat.findById(chatId);
        if (!chat) {
          socket.emit('chat:error', { message: 'Chat not found' });
          return;
        }

        // Determine receiver: if sender is initiator → contact, else → initiator
        let receiverId = null;
        if (String(chat.userId) === String(userId)) {
          // Sender is the chat initiator → receiver is the contact
          const contact = await User.findOne({ email: chat.contactEmail });
          receiverId = contact?._id || null;
        } else {
          // Sender is the contact → receiver is the initiator
          receiverId = chat.userId;
        }

        // Build reply data if replying
        let replyData = {};
        if (replyTo) {
          const repliedMsg = await Message.findById(replyTo).populate('senderId', 'name');
          if (repliedMsg) {
            replyData = {
              replyTo: repliedMsg._id,
              replyToContent: repliedMsg.content.substring(0, 100),
              replyToSenderName: repliedMsg.senderId?.name || 'Unknown',
            };
          }
        }

        // Create message (using correct schema fields)
        const message = await Message.create({
          roomId: chatId,
          senderId: userId,
          receiverId,
          content,
          delivered: true,
          reactions: [],
          ...replyData,
        });

        // Populate sender info for the response
        const populatedMessage = await Message.findById(message._id)
          .populate('senderId', 'name email')
          .lean();

        // Update chat lastMessage
        await Chat.updateOne(
          { _id: chatId },
          {
            lastMessage: content,
            lastMessageAt: new Date(),
          }
        );

        console.log(`✅ Message saved: ${message._id} (sender: ${userId})`);

        // Emit to sender: acknowledgement (replaces temp message)
        socket.emit('chat:message-ack', { message: populatedMessage });

        // Emit to others in room (excluding sender → prevents duplicates)
        socket.to(chatId).emit('chat:message', { message: populatedMessage });

      } catch (error) {
        console.error('❌ Chat message error:', error);
        socket.emit('chat:error', { message: 'Failed to send message' });
      }
    });

    /* ─── Edit Message ────────────────────────────────── */
    socket.on('chat:edit-message', async ({ chatId, messageId, content }) => {
      try {
        const message = await Message.findByIdAndUpdate(
          messageId,
          {
            content,
            editedAt: new Date(),
          },
          { new: true }
        ).populate('senderId', 'name email').lean();

        console.log(`✏️ Message edited: ${messageId}`);

        // Broadcast to all participants
        chatNamespace.to(chatId).emit('chat:message-updated', { message });
      } catch (error) {
        console.error('❌ Edit message error:', error);
        socket.emit('chat:error', { message: 'Failed to edit message' });
      }
    });

    /* ─── React to Message ────────────────────────────── */
    socket.on('chat:react-message', async ({ chatId, messageId, emoji, userId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        const existingReaction = message.reactions.findIndex(
          (r) => String(r.userId) === String(userId) && r.emoji === emoji
        );

        if (existingReaction !== -1) {
          message.reactions.splice(existingReaction, 1);
        } else {
          message.reactions.push({ userId, emoji });
        }

        await message.save();
        const updatedMessage = await Message.findById(messageId)
          .populate('senderId', 'name email')
          .lean();

        console.log(`😊 Reaction ${existingReaction !== -1 ? 'removed' : 'added'}: ${emoji} on ${messageId}`);

        // Broadcast to all participants
        chatNamespace.to(chatId).emit('chat:message-reacted', { message: updatedMessage });
      } catch (error) {
        console.error('❌ React to message error:', error);
        socket.emit('chat:error', { message: 'Failed to add reaction' });
      }
    });

    /* ─── Delete Message ──────────────────────────────── */
    socket.on('chat:delete-message', async ({ chatId, messageId }) => {
      try {
        await Message.deleteOne({ _id: messageId });
        console.log(`🗑️ Message deleted: ${messageId}`);
        chatNamespace.to(chatId).emit('chat:message-deleted', { messageId });
      } catch (error) {
        console.error('❌ Delete message error:', error);
        socket.emit('chat:error', { message: 'Failed to delete message' });
      }
    });

    /* ─── Typing Indicator ─────────────────────────────── */
    socket.on('chat:typing', ({ chatId, userId }) => {
      try {
        socket.broadcast.to(chatId).emit('chat:user-typing', { userId });
      } catch (error) {
        console.error('❌ Typing indicator error:', error);
      }
    });

    /* ─── Stop Typing ────────────────────────────────────── */
    socket.on('chat:stop-typing', ({ chatId, userId }) => {
      try {
        socket.broadcast.to(chatId).emit('chat:user-stop-typing', { userId });
      } catch (error) {
        console.error('❌ Stop typing error:', error);
      }
    });

    /* ─── Disconnect ──────────────────────────────────── */
    socket.on('disconnect', () => {
      for (const [userId, userSocket] of userSockets.entries()) {
        if (userSocket.id === socket.id) {
          userSockets.delete(userId);
          console.log(`👋 User ${userId} disconnected`);
          break;
        }
      }
    });
  });

  return userSockets;
};
