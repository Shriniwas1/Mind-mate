import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, RefreshCw } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;


const AIChatModal = ({ isOpen, onClose, token, userName }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatMessage = (text) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    return lines.map((line, idx) => {
      const cleaned = line.replace(/\*\*(.*?)\*\*/g, '$1');
      const isPoint = /^\d+\./.test(cleaned.trim());
      return (
        <p key={idx} className={isPoint ? 'mb-2' : 'mb-1'}>
          {cleaned}
        </p>
      );
    });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setError('');

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMessage, timestamp: new Date() },
    ]);

    setIsLoading(true);

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(
        `${API}/ai/chat`,
        { message: userMessage },
        { headers }
      );

      if (response.data.success) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: response.data.response, timestamp: new Date() },
        ]);
      }
    } catch (err) {
      console.error('❌ AI chat error:', err);
      setError('Failed to get response. Please try again.');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setError('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative w-full max-w-2xl h-[600px] bg-white rounded-2xl overflow-hidden flex flex-col"
        style={{ boxShadow: 'var(--shadow-xl)' }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-lg leading-none">
              🤖
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 leading-none">MindMate AI Assistant</h2>
              <p className="text-xs text-slate-400 mt-0.5">Here to support your wellness journey</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
                title="Clear chat"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/40">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-3xl">🤖</div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-1">Hi{userName ? `, ${userName.split(' ')[0]}` : ''}! 👋</h3>
                <p className="text-sm text-slate-400 max-w-xs">
                  Ask me anything about mental wellness, coping strategies, or just talk about how you're feeling.
                </p>
              </div>
              {/* Suggested starters */}
              <div className="grid grid-cols-1 gap-2 w-full max-w-xs mt-2">
                {["How can I reduce stress?", "I'm feeling overwhelmed today", "Give me a breathing exercise"].map(s => (
                  <button
                    key={s}
                    onClick={() => { setInputValue(s); }}
                    className="text-xs text-left px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-xl bg-indigo-100 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">
                      🤖
                    </div>
                  )}
                  <div
                    className={`max-w-sm px-4 py-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'text-white rounded-br-sm'
                        : 'bg-white border border-slate-100 text-slate-700 rounded-bl-sm shadow-xs'
                    }`}
                    style={msg.role === 'user' ? { background: '#4f46e5' } : {}}
                  >
                    <div className="text-sm leading-relaxed">
                      {msg.role === 'assistant' ? formatMessage(msg.content) : msg.content}
                    </div>
                    <span className={`text-[10px] mt-1.5 block ${msg.role === 'user' ? 'text-white/50' : 'text-slate-400'}`}>
                      {msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="w-7 h-7 rounded-xl bg-indigo-100 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">
                    🤖
                  </div>
                  <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-bl-sm shadow-xs flex items-center gap-2">
                    <span className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 150}ms` }}
                        />
                      ))}
                    </span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="px-5 py-2.5 mx-4 mb-2 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input area */}
        <div className="px-4 py-4 border-t border-slate-100 bg-white flex gap-2.5 items-end">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 disabled:bg-slate-50 disabled:text-slate-400 bg-slate-50/60 placeholder:text-slate-400 transition-all"
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="w-10 h-10 rounded-xl text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            style={{ background: '#4f46e5' }}
          >
            {isLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AIChatModal;