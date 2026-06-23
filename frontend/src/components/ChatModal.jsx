import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, ArrowLeft, XCircle, Users, MessageSquare } from 'lucide-react';
import axios from 'axios';
import MessageBubble from './MessageBubble';
import { useChat } from '../hooks/useChat';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

const ChatModal = ({ isOpen, onClose, token, userId, contactName }) => {
  console.log('🟢 [ChatModal] Render — token:', !!token, 'userId:', userId, 'contactName:', contactName);

  const [sessions, setSessions] = useState({ partnerChat: null, friendChats: [] });
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [activeContactName, setActiveContactName] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // useChat generic hook
  const {
    chat, messages, isLoading, isConnected, typingUsers,
    sendMessage, showTyping, stopTyping, setMessages
  } = useChat(token, userId, selectedChatId);

  // Fetch sessions on open
  useEffect(() => {
    if (isOpen && token) {
      fetchSessions();
    } else {
      setSelectedChatId(null);
      setActiveContactName('');
    }
  }, [isOpen, token]);

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API}/chat/sessions`, { headers });
      if (res.data.success) {
        const partnerChat = res.data.partnerChat;
        const friendChats = res.data.friendChats || [];
        setSessions({ partnerChat, friendChats });

        // Auto-select if contactName was passed
        if (contactName) {
          if (partnerChat && partnerChat.contactName.toLowerCase() === contactName.toLowerCase()) {
            setSelectedChatId(partnerChat._id);
            setActiveContactName(partnerChat.contactName);
          } else {
            const matchedFriend = friendChats.find(
              c => (c.userId?.name || c.contactName).toLowerCase() === contactName.toLowerCase()
            );
            if (matchedFriend) {
              setSelectedChatId(matchedFriend._id);
              setActiveContactName(matchedFriend.userId?.name || matchedFriend.contactName);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);
  useEffect(() => { if (selectedChatId && inputRef.current) inputRef.current.focus(); }, [selectedChatId]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || isSending || !selectedChatId) return;
    setIsSending(true);
    sendMessage(messageInput, userId, replyingTo);
    setMessageInput('');
    setReplyingTo(null);
    stopTyping(userId);
    setIsSending(false);
  };

  const handleInputChange = (e) => {
    setMessageInput(e.target.value);
    if (e.target.value.length === 1 && selectedChatId) showTyping(userId);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  const handleInputBlur = () => {
    if (selectedChatId) stopTyping(userId);
  };

  const handleReply = (message) => {
    const senderName = typeof message.senderId === 'object' ? message.senderId.name : 'You';
    setReplyingTo({ _id: message._id, content: message.content, senderName });
    inputRef.current?.focus();
  };

  const handleEditMessage = async (messageId, newContent) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.put(`${API}/chat/${selectedChatId}/message/${messageId}`, { content: newContent }, { headers });
      if (res.data.success) setMessages((prev) => prev.map((m) => m._id === messageId ? res.data.message : m));
    } catch (err) { console.error('❌ Edit failed:', err); }
  };

  const handleReactMessage = async (messageId, emoji) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API}/chat/${selectedChatId}/message/${messageId}/react`, { emoji }, { headers });
      if (res.data.success) setMessages((prev) => prev.map((m) => m._id === messageId ? res.data.message : m));
    } catch (err) { console.error('❌ React failed:', err); }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API}/chat/${selectedChatId}/message/${messageId}`, { headers });
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    } catch (err) { console.error('❌ Delete failed:', err); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="w-full max-w-2xl h-full sm:h-[600px] bg-white rounded-none sm:rounded-2xl flex flex-col overflow-hidden"
            style={{ boxShadow: 'var(--shadow-xl)' }}
            onClick={(e) => e.stopPropagation()}>

            {/* CHANNEL LIST SELECTION SCREEN */}
            {!selectedChatId && (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white">
                  <div>
                    <h2 className="text-lg font-bold text-slate-805">Support Chat Channels</h2>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">Select a connection to start messaging</p>
                  </div>
                  <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full transition w-8 h-8 flex items-center justify-center">
                    <X size={16} className="text-slate-400" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/60 space-y-6">
                  {loadingSessions ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="animate-spin text-indigo-500" size={32} />
                    </div>
                  ) : !sessions.partnerChat && sessions.friendChats.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center">
                      <div className="bg-white rounded-2xl px-6 py-8 shadow-sm border border-slate-100 max-w-sm">
                        <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-650 text-sm font-bold">No Active Channels</p>
                        <p className="text-slate-400 text-xs mt-2 leading-relaxed font-semibold">
                          Add an emergency contact in Safety Settings or wait for a friend to add you to start communicating.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Section 1: My Emergency Contact */}
                      {sessions.partnerChat && (
                        <div className="space-y-2.5">
                          <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest">My Emergency Contact</h3>
                          <div 
                            onClick={() => {
                              setSelectedChatId(sessions.partnerChat._id);
                              setActiveContactName(sessions.partnerChat.contactName);
                            }}
                            className="p-4 bg-white hover:bg-slate-50/50 border border-slate-100 hover:border-slate-200/80 rounded-xl cursor-pointer transition-all flex items-center justify-between shadow-2xs group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-650 flex items-center justify-center font-bold text-base border border-indigo-100/30">
                                {sessions.partnerChat.contactName[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-750">{sessions.partnerChat.contactName}</p>
                                <p className="text-xs text-slate-400 mt-1 font-semibold truncate">{sessions.partnerChat.contactEmail}</p>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50/50 px-3.5 py-2 rounded-lg border border-indigo-100/30 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">Connect</span>
                          </div>
                        </div>
                      )}

                      {/* Section 2: Users Who Listed Me */}
                      {sessions.friendChats.length > 0 && (
                        <div className="space-y-2.5">
                          <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest">Users Who Listed Me</h3>
                          <div className="space-y-2">
                            {sessions.friendChats.map((c) => {
                              const displayName = c.userId?.name || c.contactName;
                              const displayEmail = c.userId?.email || c.contactEmail;
                              return (
                                <div 
                                  key={c._id}
                                  onClick={() => {
                                    setSelectedChatId(c._id);
                                    setActiveContactName(displayName);
                                  }}
                                  className="p-4 bg-white hover:bg-slate-50/50 border border-slate-100 hover:border-slate-200/80 rounded-xl cursor-pointer transition-all flex items-center justify-between shadow-2xs group"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-650 flex items-center justify-center font-bold text-base border border-emerald-100/30">
                                      {displayName[0].toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-bold text-slate-750">{displayName}</p>
                                      <p className="text-xs text-slate-400 mt-1 font-semibold truncate">{displayEmail}</p>
                                    </div>
                                  </div>
                                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50/50 px-3.5 py-2 rounded-lg border border-emerald-100/30 group-hover:bg-emerald-650 group-hover:text-white group-hover:border-emerald-650 transition-all">Connect</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ACTIVE CONVERSATION SCREEN */}
            {selectedChatId && (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-white">
                  <button onClick={() => setSelectedChatId(null)} className="p-1.5 hover:bg-slate-100 rounded-full transition w-8 h-8 flex items-center justify-center" title="Back to Channels">
                    <ArrowLeft size={16} className="text-slate-500" />
                  </button>
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-700">
                    {(activeContactName || 'C')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-semibold text-slate-800 truncate">{activeContactName || 'Contact'}</h2>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                      {typingUsers.size > 0 ? <span className="italic text-indigo-500 font-semibold">typing…</span>
                        : isConnected ? <><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />Online</>
                        : <><span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />Offline</>}
                    </p>
                  </div>
                  <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full transition w-8 h-8 flex items-center justify-center">
                    <X size={16} className="text-slate-400" />
                  </button>
                </div>

                {/* Messages list */}
                <div className="flex-1 overflow-y-auto px-4 py-3 bg-slate-50/60">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center">
                      <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-sm border border-slate-100">
                        <p className="text-slate-600 text-sm font-medium">No messages yet</p>
                        <p className="text-slate-400 text-xs mt-1 font-semibold font-mono">Say hi to {activeContactName} 👋</p>
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
                          <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm border border-slate-100 flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
                        <div className="flex-1 border-l-4 border-indigo-600 pl-3 py-1">
                          <p className="text-xs font-semibold text-indigo-600">{replyingTo.senderName}</p>
                          <p className="text-xs text-slate-500 truncate">{replyingTo.content}</p>
                        </div>
                        <button onClick={() => setReplyingTo(null)} className="p-1 text-slate-400 hover:text-slate-600 transition">
                          <XCircle size={18} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Input block */}
                <div className="px-3 py-3 border-t border-slate-100 bg-white">
                  <div className="flex gap-2 items-end">
                    <textarea ref={inputRef} value={messageInput} onChange={handleInputChange}
                      onKeyDown={handleInputKeyDown} onBlur={handleInputBlur} placeholder="Type a message…" rows={1}
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none text-sm shadow-sm"
                      style={{ maxHeight: '100px' }} />
                    <button onClick={handleSendMessage} disabled={!messageInput.trim() || isSending}
                      className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex-shrink-0">
                      {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatModal;
