import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCheck, MoreVertical, Smile, Edit2, Trash2, Reply } from 'lucide-react';

const MessageBubble = ({ message, isOwnMessage, onEdit, onReact, onDelete, onReply, currentUserId }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);

  const emojis = ['👍', '❤️', '😂', '😍', '🔥', '😢'];
  const isTemp = message._id?.startsWith?.('temp-');

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleReact = (emoji) => {
    if (isTemp) return;
    onReact?.(message._id, emoji);
    setShowEmojiPicker(false);
  };

  const handleEditSubmit = () => {
    if (editedContent.trim() && onEdit) {
      onEdit(message._id, editedContent);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    onDelete?.(message._id);
    setShowMenu(false);
  };

  const handleReply = () => {
    onReply?.(message);
    setShowMenu(false);
  };

  // Group reactions by emoji
  const reactionGroups = message.reactions?.reduce((acc, reaction) => {
    const emoji = reaction.emoji;
    acc[emoji] = (acc[emoji] || 0) + 1;
    return acc;
  }, {}) || {};

  const hasReactions = Object.keys(reactionGroups).length > 0;

  // Sender name for received messages
  const senderName = typeof message.senderId === 'object'
    ? message.senderId?.name
    : message.senderName;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-1 group`}
    >
      <div className={`relative max-w-[75%] ${isOwnMessage ? 'mr-1' : 'ml-1'}`}>
        {/* ── Bubble ── */}
        <div
          className={`relative px-3 py-1.5 shadow-sm ${
            isOwnMessage
              ? 'bg-indigo-100 text-slate-900 rounded-lg rounded-tr-sm'
              : 'bg-white text-slate-900 rounded-lg rounded-tl-sm border border-slate-100'
          }`}
        >
          {/* Sender name for received messages */}
          {!isOwnMessage && senderName && (
            <p className="text-xs font-semibold text-indigo-600 mb-0.5">{senderName}</p>
          )}

          {/* ── Reply quote ── */}
          {message.replyToContent && (
            <div className={`mb-1.5 rounded-md px-2.5 py-1.5 border-l-3 ${
              isOwnMessage
                ? 'bg-indigo-200/50 border-l-indigo-600'
                : 'bg-slate-100 border-l-indigo-600'
            }`}
            style={{ borderLeftWidth: '3px' }}
            >
              <p className="text-[10px] font-semibold text-indigo-600">
                {message.replyToSenderName}
              </p>
              <p className="text-[11px] text-slate-500 line-clamp-2">
                {message.replyToContent}
              </p>
            </div>
          )}

          {/* ── Message content (or edit input) ── */}
          {isEditing ? (
            <div className="flex gap-1.5 items-center">
              <input
                type="text"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEditSubmit()}
                className="flex-1 px-2 py-1 rounded bg-white text-slate-900 text-sm border border-slate-200"
                autoFocus
              />
              <button onClick={handleEditSubmit} className="text-indigo-600 text-xs font-bold px-1">✓</button>
              <button onClick={() => setIsEditing(false)} className="text-red-400 text-xs font-bold px-1">✕</button>
            </div>
          ) : (
            <div className="flex items-end gap-3">
              <p className="text-[13.5px] leading-snug break-words whitespace-pre-wrap flex-1">
                {message.content}
              </p>
              <span className={`text-[10px] whitespace-nowrap flex items-center gap-0.5 -mb-0.5 flex-shrink-0 ${
                isOwnMessage ? 'text-indigo-400' : 'text-slate-400'
              }`}>
                {message.editedAt && <span className="italic mr-0.5">edited</span>}
                {formatTime(message.createdAt)}
                {isOwnMessage && (
                  <span className="ml-0.5">
                    {isTemp ? (
                      <span className="text-[9px]">⏳</span>
                    ) : message.seen ? (
                      <CheckCheck size={13} className="text-indigo-500" />
                    ) : (
                      <CheckCheck size={13} className="text-slate-400" />
                    )}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* ── Reactions (inline below bubble) ── */}
        {hasReactions && (
          <div className={`flex gap-0.5 mt-0.5 flex-wrap ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(reactionGroups).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="flex items-center gap-0.5 bg-white px-1.5 py-0.5 rounded-full text-xs shadow-sm hover:shadow transition border border-slate-100"
              >
                <span className="text-sm">{emoji}</span>
                {count > 1 && <span className="text-[10px] text-slate-500">{count}</span>}
              </button>
            ))}
          </div>
        )}

        {/* ── Hover action buttons ── */}
        <div
          className={`absolute top-0 ${isOwnMessage ? '-left-20' : '-right-20'} flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity`}
        >
          {/* Reply */}
          <button
            onClick={handleReply}
            className="p-1.5 hover:bg-white/80 rounded-full transition"
            title="Reply"
          >
            <Reply size={14} className="text-slate-500" />
          </button>

          {/* React */}
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={isTemp}
            className="p-1.5 hover:bg-white/80 rounded-full transition disabled:opacity-40"
            title="React"
          >
            <Smile size={14} className="text-slate-500" />
          </button>

          {/* More (own messages only) */}
          {isOwnMessage && !isTemp && (
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 hover:bg-white/80 rounded-full transition"
              title="More"
            >
              <MoreVertical size={14} className="text-slate-500" />
            </button>
          )}
        </div>

        {/* ── Context menu (edit/delete) ── */}
        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className={`absolute z-20 ${isOwnMessage ? 'right-0' : 'left-0'} top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden min-w-[120px]`}>
              <button
                onClick={() => { setIsEditing(true); setShowMenu(false); }}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 w-full transition"
              >
                <Edit2 size={13} /> Edit
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full transition"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </>
        )}

        {/* ── Emoji picker ── */}
        {showEmojiPicker && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowEmojiPicker(false)} />
            <div className={`absolute z-20 ${isOwnMessage ? 'right-0' : 'left-0'} bottom-full mb-1 bg-white rounded-2xl shadow-lg border border-gray-100 p-1.5 flex gap-0.5`}>
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition text-lg leading-none"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default MessageBubble;
