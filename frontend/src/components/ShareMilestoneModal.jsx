import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, MessageSquare, Instagram, Share2, Clipboard, 
  CheckCircle, Loader2, Sparkles, Send, ShieldCheck
} from 'lucide-react';
import LeagueBadge, { getLeagueConfig } from './LeagueBadge';
import { toast } from 'sonner';
import axios from 'axios';
import { API } from '../context/AuthContext';

const ShareMilestoneModal = ({ isOpen, onClose, streak, token, userName }) => {
  const [sharingInApp, setSharingInApp] = useState(false);
  const [copied, setCopied] = useState(false);
  const config = getLeagueConfig(streak);

  if (!isOpen) return null;

  const title = `Unlocked: ${config.name}!`;
  const shareText = `🎉 Wellness Milestone: I have reached the *${config.name}* in MindMate by maintaining a *${streak}-day consistency streak*! 💛 Dedicated to daily self-care.`;
  const plainText = `🎉 Wellness Milestone: Unlocked the ${config.name} in MindMate with a ${streak}-day consistency streak! 💛 Daily routines support our mental space. #MindMate #SelfCare`;

  // WhatsApp Share
  const shareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
    toast.success('Opening WhatsApp...');
  };

  // Copy for Instagram / Clipboard
  const copyClipboard = () => {
    navigator.clipboard.writeText(plainText);
    setCopied(true);
    toast.success('Caption copied! Open Instagram to share your milestone.');
    setTimeout(() => setCopied(false), 2500);
  };

  // In-App Share to emergency contact
  const shareInApp = async () => {
    setSharingInApp(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(
        `${API}/friend/share-streak`, 
        { leagueName: config.name, streakDays: streak }, 
        { headers }
      );
      if (res.data.success) {
        toast.success('Milestone shared with your trusted contact!');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to share milestone in-app.');
    } finally {
      setSharingInApp(false);
    }
  };

  // Web System Share API
  const shareSystem = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MindMate Wellness Milestone',
          text: plainText,
          url: window.location.origin
        });
        toast.success('Shared successfully!');
      } catch (err) {
        console.warn('System share dismissed or failed', err);
      }
    } else {
      copyClipboard();
    }
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
            <h2 className="text-base font-bold text-slate-800">Share Achievement</h2>
          </div>
          <button onClick={onClose} className="rounded-full w-8 h-8 hover:bg-slate-50 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Body Card Area */}
        <div className="p-6 space-y-6">
          
          {/* Visual Poster Frame */}
          <div className={`p-6 rounded-2xl text-center relative overflow-hidden bg-gradient-to-br ${config.badgeColor} text-white shadow-inner`}>
            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-white/5 opacity-15 rotate-12 scale-150" />
            
            <div className="relative z-10 flex flex-col items-center gap-4">
              <LeagueBadge streak={streak} size={90} />
              
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/70">
                  MindMate Milestone
                </span>
                <h3 className="text-xl font-bold mt-1 tracking-tight">{config.name}</h3>
                <p className="text-xs text-white/80 mt-1 leading-normal max-w-[240px] mx-auto">
                  {config.description}
                </p>
              </div>
              
              <div className="bg-white/12 border border-white/15 rounded-xl px-4 py-2 mt-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/90 leading-none">
                  {streak} Day Streak
                </p>
              </div>
            </div>
          </div>

          {/* Social share options grid */}
          <div className="grid grid-cols-2 gap-3">
            
            {/* WhatsApp */}
            <button 
              onClick={shareWhatsApp}
              className="flex items-center gap-2.5 justify-center py-3.5 px-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-green-50 hover:border-green-200 hover:text-green-600 transition-all text-xs font-bold text-slate-600"
            >
              <MessageSquare className="w-4 h-4 text-green-500 shrink-0" />
              <span>WhatsApp</span>
            </button>

            {/* Instagram */}
            <button 
              onClick={copyClipboard}
              className="flex items-center gap-2.5 justify-center py-3.5 px-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-pink-50 hover:border-pink-200 hover:text-pink-600 transition-all text-xs font-bold text-slate-600"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-pink-500 shrink-0" />
              ) : (
                <Instagram className="w-4 h-4 text-pink-500 shrink-0" />
              )}
              <span>{copied ? 'Copied!' : 'Instagram'}</span>
            </button>

            {/* In-App Share to Friend */}
            <button 
              onClick={shareInApp}
              disabled={sharingInApp}
              className="flex items-center gap-2.5 justify-center py-3.5 px-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-teal-50 hover:border-teal-200 hover:text-teal-600 transition-all text-xs font-bold text-slate-600 disabled:opacity-50"
            >
              {sharingInApp ? (
                <Loader2 className="w-4 h-4 text-teal-500 shrink-0 animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-teal-500 shrink-0" />
              )}
              <span>Share In-App</span>
            </button>

            {/* Native / System Share */}
            <button 
              onClick={shareSystem}
              className="flex items-center gap-2.5 justify-center py-3.5 px-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all text-xs font-bold text-slate-600"
            >
              <Share2 className="w-4 h-4 text-blue-500 shrink-0" />
              <span>More Options</span>
            </button>

          </div>

        </div>
      </motion.div>
    </div>
  );
};

export default ShareMilestoneModal;
