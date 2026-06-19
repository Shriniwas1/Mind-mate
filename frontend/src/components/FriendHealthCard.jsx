import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { 
  MessageCircle, Heart, RefreshCw, AlertTriangle, 
  TrendingDown, TrendingUp, Minus, Sparkles, Info
} from 'lucide-react';

const SUPPORT_TASKS = [
  "Send them a voice note right now — hearing your voice can mean everything.",
  "Text them: 'No pressure, just checking in. I'm here whenever you need.'",
  "Schedule a video call with them today, even just 10 minutes.",
  "Share a funny memory or inside joke you both have.",
  "Drop by with their favorite snack or comfort food.",
  "Send them a playlist of songs that remind you of good times together.",
  "Ask them if they'd like to go for a walk — movement helps mood.",
  "Remind them of a time they overcame something really difficult.",
  "Watch a movie or show together remotely (sync up on Netflix).",
  "Write them a short letter about why they matter to you.",
  "Send a care package with their favorite things.",
  "Play an online game together — distraction can be healing.",
  "Ask them 'What's one thing that would make tomorrow slightly better?'",
  "Share an article or video that made you think of them positively.",
  "Simply say: 'You don't have to explain anything. I'm just here.'",
  "Set a daily check-in reminder for the next 3 days.",
  "Send them a photo from a happy shared memory.",
  "Ask if they've eaten today — basic care matters.",
  "Tell them one specific thing you admire about them.",
  "Offer to help with something practical: errands, calls, tasks."
];

const FriendHealthCard = ({ friendData, onOpenChat }) => {
  const { name, avgScore, trend, dominantEmotion, journalSummary } = friendData;
  const [currentTask, setCurrentTask] = useState('');
  const [usedTasks, setUsedTasks] = useState([]);
  const [isRotating, setIsRotating] = useState(false);

  // Initialize first task suggestion
  useEffect(() => {
    if (SUPPORT_TASKS.length > 0) {
      const idx = Math.floor(Math.random() * SUPPORT_TASKS.length);
      const firstTask = SUPPORT_TASKS[idx];
      setCurrentTask(firstTask);
      setUsedTasks([firstTask]);
    }
  }, []);

  const getNewTask = () => {
    setIsRotating(true);
    setTimeout(() => {
      const available = SUPPORT_TASKS.filter(t => !usedTasks.includes(t));
      if (available.length === 0) {
        // Reset pool if all used
        const next = SUPPORT_TASKS[Math.floor(Math.random() * SUPPORT_TASKS.length)];
        setCurrentTask(next);
        setUsedTasks([next]);
      } else {
        const next = available[Math.floor(Math.random() * available.length)];
        setCurrentTask(next);
        setUsedTasks(prev => [...prev, next]);
      }
      setIsRotating(false);
    }, 400);
  };

  // Determine colors based on average score
  const isCritical = avgScore <= 20;
  const isConcern = avgScore <= 40;

  const scoreColorClass = isCritical 
    ? 'text-red-600 bg-red-50 border-red-100' 
    : isConcern 
      ? 'text-amber-600 bg-amber-50 border-amber-100' 
      : 'text-emerald-600 bg-emerald-50 border-emerald-100';

  const trendIcon = isCritical 
    ? <TrendingDown className="w-4 h-4 text-red-600 animate-pulse" />
    : trend === 'declining' 
      ? <TrendingDown className="w-4 h-4 text-red-500" />
      : trend === 'improving'
        ? <TrendingUp className="w-4 h-4 text-emerald-500" />
        : <Minus className="w-4 h-4 text-slate-400" />;

  const trendLabel = isCritical
    ? 'Critical Wellness Level'
    : trend === 'declining'
      ? 'Wellness score is declining'
      : trend === 'improving'
        ? 'Wellness score is improving'
        : 'Wellness score is stable';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card 
        className={`rounded-2xl border overflow-hidden bg-white shadow-sm ${
          isCritical ? 'border-red-200' : 'border-slate-100'
        }`}
      >
        {/* Banner Indicator */}
        <div className={`px-6 py-4 flex items-center justify-between border-b ${
          isCritical ? 'bg-red-50/70 border-red-100' : 'bg-amber-50/40 border-amber-100/40'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isCritical ? 'bg-red-100 text-red-600 animate-bounce' : 'bg-amber-100 text-amber-600'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-900 leading-none">
                🚨 Action Recommended: Your friend {name} needs support right now
              </h3>
              <p className="text-xs text-red-600 font-medium mt-1">
                MindMate detected a severe drop in their wellness score. They could really use a friendly check-in.
              </p>
            </div>
          </div>

          
          <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${scoreColorClass}`}>
            <span>Wellness: {avgScore}%</span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Left Column: Health Metrics & Sentiment context */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full text-xs text-slate-500">
                {trendIcon}
                <span>{trendLabel}</span>
              </div>
              
              <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full text-xs text-slate-500">
                Dominant Emotion: <span className="font-semibold text-slate-700 capitalize">{dominantEmotion}</span>
              </div>
            </div>

            {journalSummary && !isCritical ? (
              <div className="bg-slate-50 rounded-xl p-4.5 border border-slate-100/60 relative">
                <span className="absolute top-3 right-3 text-slate-300">
                  <Info className="w-4 h-4" />
                </span>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Context Summary</p>
                <p className="text-sm text-slate-600 leading-relaxed italic">
                  "{journalSummary}"
                </p>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl p-5 border border-red-100 bg-red-50/20 text-center">
                <p className="text-sm font-semibold text-red-700">
                  Your friend needs you right now. Please get in touch to connect with them.
                </p>
              </div>
            )}

            <Button
              onClick={onOpenChat}
              className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold py-4 flex items-center justify-center gap-2 border-0 shadow-none text-sm mt-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Connect with {name} now</span>
            </Button>
          </div>

          {/* Right Column: Dynamic Support Suggestion Box */}
          <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-600 uppercase tracking-widest">
                  <Heart className="w-3.5 h-3.5 fill-teal-600/10 text-teal-600" />
                  <span>Ways you can help</span>
                </div>
                
                <button 
                  onClick={getNewTask} 
                  disabled={isRotating}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isRotating ? 'animate-spin' : ''}`} />
                  <span>Suggest another</span>
                </button>
              </div>

              <div className="min-h-[90px] flex items-center justify-center bg-white p-4.5 rounded-xl border border-slate-100/80 shadow-xs relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500/20 via-teal-500 to-teal-500/20" />
                
                <AnimatePresence mode="wait">
                  <motion.p 
                    key={currentTask}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm text-slate-700 font-medium text-center leading-relaxed"
                  >
                    {currentTask}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>


          </div>

        </div>
      </Card>
    </motion.div>
  );
};

export default FriendHealthCard;
