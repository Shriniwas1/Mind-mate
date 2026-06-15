import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, ArrowLeft, XCircle } from 'lucide-react';
import axios from 'axios';
import MessageBubble from './MessageBubble';
import { useChat } from '../hooks/useChat';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

const ChatModal = ({ isOpen, onClose, token, userId, contactName }) => {
  // Log props on every render
  console.log('🟢 [ChatModal] Render — token:', !!token, 'userId:', userId, 'contactName:', contactName);

  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // useChat: loads chat session, history, connects socket, handles send/receive
  const {
    chat, messages, isLoading, isConnected, typingUsers,
    sendMessage, showTyping, stopTyping, setMessages
  } = useChat(token, userId);

  // Log chat state
  console.log('🟢 [ChatModal] State — chatId:', chat?._id, 'msgs:', messages.length, 'connected:', isConnected);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);
  useEffect(() => { if (isOpen && inputRef.current) inputRef.current.focus(); }, [isOpen]);

  // Send message handler
  const handleSendMessage = () => {
    console.log('📤 [ChatModal] Send clicked — input:', messageInput);
    if (!messageInput.trim() || isSending) return;
    setIsSending(true);
    sendMessage(messageInput, userId, replyingTo);
    setMessageInput('');
    setReplyingTo(null);
    stopTyping(userId);
    setIsSending(false);
  };

  const handleInputChange = (e) => {
    setMessageInput(e.target.value);
    if (e.target.value.length === 1) showTyping(userId);
  };
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };
  const handleInputBlur = () => stopTyping(userId);

  // Reply to a message
  const handleReply = (message) => {
    const senderName = typeof message.senderId === 'object' ? message.senderId.name : 'You';
    console.log('↩️ [ChatModal] Reply to:', message._id);
    setReplyingTo({ _id: message._id, content: message.content, senderName });
    inputRef.current?.focus();
  };

  // Edit message via REST
  const handleEditMessage = async (messageId, newContent) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.put(`${API}/chat/${chat._id}/message/${messageId}`, { content: newContent }, { headers });
      if (res.data.success) setMessages((prev) => prev.map((m) => m._id === messageId ? res.data.message : m));
    } catch (err) { console.error('❌ Edit failed:', err); }
  };

  // React to message via REST
  const handleReactMessage = async (messageId, emoji) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API}/chat/${chat._id}/message/${messageId}/react`, { emoji }, { headers });
      if (res.data.success) setMessages((prev) => prev.map((m) => m._id === messageId ? res.data.message : m));
    } catch (err) { console.error('❌ React failed:', err); }
  };

  // Delete message via REST
  const handleDeleteMessage = async (messageId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API}/chat/${chat._id}/message/${messageId}`, { headers });
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    } catch (err) { console.error('❌ Delete failed:', err); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="w-full max-w-2xl h-[600px] bg-white rounded-2xl flex flex-col overflow-hidden"
            style={{ boxShadow: 'var(--shadow-xl)' }}
            onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10" style={{ background: '#2d5549' }}>
              <button onClick={onClose} className="p-1.5 hover:bg-white/15 rounded-full transition w-8 h-8 flex items-center justify-center">
                <ArrowLeft size={16} className="text-white" />
              </button>
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-lg font-bold text-white">
                {(contactName || 'C')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-white truncate">{contactName || 'Contact'}</h2>
                <p className="text-xs text-emerald-200/80 flex items-center gap-1.5 mt-0.5">
                  {typingUsers.size > 0 ? <span className="italic">typing…</span>
                    : isConnected ? <><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />Online</>
                    : <><span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />Offline</>}
                </p>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-white/15 rounded-full transition w-8 h-8 flex items-center justify-center">
                <X size={16} className="text-white/70" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3" style={{ backgroundColor: '#ECE5DD',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8c3b8' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}>
              {isLoading ? (
                <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-[#3A6B5E]" size={32} /></div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-sm">
                    <p className="text-gray-600 text-sm font-medium">No messages yet</p>
                    <p className="text-gray-400 text-xs mt-1">Say hi to {contactName} 👋</p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => {
                    const senderId = typeof message.senderId === 'object' ? message.senderId?._id : message.senderId;
                    const isOwn = String(senderId) === String(userId);
                    return (
                      <MessageBubble key={message._id} message={message} isOwnMessage={isOwn}
                        currentUserId={userId} onEdit={handleEditMessage} onReact={handleReactMessage}
                        onDelete={handleDeleteMessage} onReply={handleReply} />
                    );
                  })}
                  {typingUsers.size > 0 && (
                    <div className="flex justify-start mb-2">
                      <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Reply bar */}
            <AnimatePresence>
              {replyingTo && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="border-t bg-gray-50 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2">
                    <div className="flex-1 border-l-4 border-[#3A6B5E] pl-3 py-1">
                      <p className="text-xs font-semibold text-[#3A6B5E]">{replyingTo.senderName}</p>
                      <p className="text-xs text-gray-500 truncate">{replyingTo.content}</p>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="p-1 text-gray-400 hover:text-gray-600 transition">
                      <XCircle size={18} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <div className="px-3 py-3 border-t bg-[#F0F0F0]">
              <div className="flex gap-2 items-end">
                <textarea ref={inputRef} value={messageInput} onChange={handleInputChange}
                  onKeyDown={handleInputKeyDown} onBlur={handleInputBlur} placeholder="Type a message…" rows={1}
                  className="flex-1 px-4 py-2.5 bg-white border-none rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#3A6B5E]/30 resize-none text-sm shadow-sm"
                  style={{ maxHeight: '100px' }} />
                <button onClick={handleSendMessage} disabled={!messageInput.trim() || isSending}
                  className="w-10 h-10 rounded-full bg-[#3A6B5E] hover:bg-[#2d5549] text-white flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex-shrink-0">
                  {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatModal;
