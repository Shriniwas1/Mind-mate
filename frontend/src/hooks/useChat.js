import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  emitMessage,
  emitJoin,
  emitTyping,
  emitStopTyping,
  getSocket,
  waitForSocket,
} from '../utils/socket';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;


/**
 * Helper: extract senderId string from a message
 * (handles both populated object and plain string/ObjectId)
 */
export function getSenderId(message) {
  if (!message) return null;
  const s = message.senderId;
  if (!s) return null;
  return typeof s === 'object' ? String(s._id) : String(s);
}

export const useChat = (token, userId, selectedChatId) => {
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [error, setError] = useState(null);

  // Refs to hold the latest setMessages so socket handlers always see current state
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // ── Initialize: load chat → load history → connect socket → attach listeners ──
  useEffect(() => {
    console.log('🔍 [Chat] useChat effect running — token:', !!token, 'userId:', userId, 'selectedChatId:', selectedChatId);
    if (!token || !userId || !selectedChatId) {
      console.warn('⚠️ [Chat] Skipping init — token, userId, or selectedChatId missing');
      setChat(null);
      setMessages([]);
      setIsConnected(false);
      return;
    }

    let cancelled = false;
    let cleanupFns = [];

    const initialize = async () => {
      try {
        setIsLoading(true);

        // 1. Load chat details
        console.log('💬 [Chat] Loading selected chat details…');
        const headers = { Authorization: `Bearer ${token}` };
        const chatRes = await axios.get(`${API}/chat/${selectedChatId}`, { headers });

        if (cancelled) return;

        if (!chatRes.data.success || !chatRes.data.chat?._id) {
          setError('No chat available');
          console.error('❌ [Chat] Chat details retrieval failed');
          return;
        }

        const activeChat = chatRes.data.chat;
        setChat(activeChat);
        console.log('✅ [Chat] Chat loaded:', activeChat._id);

        // 2. Load message history
        const historyRes = await axios.get(`${API}/chat/history/${activeChat._id}`, { headers });
        if (cancelled) return;

        if (historyRes.data.success) {
          setMessages(historyRes.data.messages);
          console.log('✅ [Chat] History loaded:', historyRes.data.messages.length, 'messages');
        }

        // 3. Wait for socket
        console.log('⏳ [Chat] Waiting for socket…');
        const socket = await waitForSocket();
        if (cancelled || !socket) {
          console.error('❌ [Chat] Socket not available');
          return;
        }

        // 4. Join chat room
        emitJoin(activeChat._id, userId);
        setIsConnected(true);
        console.log('✅ [Chat] Joined room, userId:', userId);

        // 5. Attach all socket listeners NOW (socket is guaranteed ready)
        // -- Received message from OTHERS (sender excluded by server)
        const onMessage = ({ message }) => {
          console.log('💬 [Chat] Received message:', message.content?.substring(0, 30));
          setMessages((prev) => [...prev, message]);
        };

        // -- Acknowledgement of OUR sent message (replaces temp)
        const onAck = ({ message }) => {
          console.log('✅ [Chat] Message acknowledged:', message._id);
          setMessages((prev) => {
            const tempIdx = prev.findIndex(
              (m) => m._id?.startsWith?.('temp-') && m.content === message.content
            );
            if (tempIdx >= 0) {
              const updated = [...prev];
              updated[tempIdx] = message;
              return updated;
            }
            return [...prev, message];
          });
        };

        // -- History refresh after join
        const onHistory = ({ messages: historyMessages }) => {
          console.log('📚 [Chat] History refresh:', historyMessages.length, 'messages');
          setMessages(historyMessages);
        };

        // -- Typing
        const onTyping = ({ userId: tid }) => {
          setTypingUsers((prev) => new Set(prev).add(tid));
        };
        const onStopTyping = ({ userId: tid }) => {
          setTypingUsers((prev) => {
            const s = new Set(prev);
            s.delete(tid);
            return s;
          });
        };

        // -- Edits / reactions / deletions
        const onUpdated = ({ message }) => {
          setMessages((prev) => prev.map((m) => (m._id === message._id ? message : m)));
        };
        const onReacted = ({ message }) => {
          setMessages((prev) => prev.map((m) => (m._id === message._id ? message : m)));
        };
        const onDeleted = ({ messageId }) => {
          setMessages((prev) => prev.filter((m) => m._id !== messageId));
        };

        socket.on('chat:message', onMessage);
        socket.on('chat:message-ack', onAck);
        socket.on('chat:history', onHistory);
        socket.on('chat:user-typing', onTyping);
        socket.on('chat:user-stop-typing', onStopTyping);
        socket.on('chat:message-updated', onUpdated);
        socket.on('chat:message-reacted', onReacted);
        socket.on('chat:message-deleted', onDeleted);

        console.log('📋 [Chat] All listeners attached');

        // Store cleanup functions
        cleanupFns.push(() => {
          socket.off('chat:message', onMessage);
          socket.off('chat:message-ack', onAck);
          socket.off('chat:history', onHistory);
          socket.off('chat:user-typing', onTyping);
          socket.off('chat:user-stop-typing', onStopTyping);
          socket.off('chat:message-updated', onUpdated);
          socket.off('chat:message-reacted', onReacted);
          socket.off('chat:message-deleted', onDeleted);
          console.log('📋 [Chat] Listeners cleaned up');
        });

      } catch (err) {
        if (!cancelled) {
          setError('Failed to load chat');
          console.error('❌ [Chat] Init error:', err);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    initialize();

    return () => {
      cancelled = true;
      cleanupFns.forEach((fn) => fn());
    };
  }, [token, userId, selectedChatId]);

  // ── Send message (with optional reply) ──────────────────
  const sendMessage = useCallback(
    (content, senderUserId, replyTo = null) => {
      if (!chat || !content.trim()) return;

      const tempMessage = {
        _id: `temp-${Date.now()}`,
        roomId: chat._id,
        senderId: { _id: senderUserId, name: 'You' },
        content,
        delivered: true,
        reactions: [],
        replyTo: replyTo?._id || null,
        replyToContent: replyTo?.content?.substring(0, 100) || null,
        replyToSenderName: replyTo?.senderName || null,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, tempMessage]);
      emitMessage(chat._id, content, senderUserId, replyTo?._id || null);
    },
    [chat]
  );

  // ── Typing ──────────────────────────────────────────────
  const showTypingFn = useCallback((tid) => {
    if (!chat) return;
    emitTyping(chat._id, tid);
  }, [chat]);

  const stopTypingFn = useCallback((tid) => {
    if (!chat) return;
    emitStopTyping(chat._id, tid);
  }, [chat]);

  return {
    chat,
    messages,
    setMessages,
    isLoading,
    isConnected,
    typingUsers,
    error,
    sendMessage,
    showTyping: showTypingFn,
    stopTyping: stopTypingFn,
    getSenderId,
  };
};
