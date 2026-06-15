import React from 'react';
import { motion } from 'framer-motion';
import { X, Lock, CheckCircle2, Trophy, Flame } from 'lucide-react';
import LeagueBadge, { getLeagueConfig } from './LeagueBadge';

const LEAGUES_LIST = [
  { minStreak: 0, name: 'Bronze League', days: '0 - 2 Days' },
  { minStreak: 3, name: 'Silver League', days: '3 - 5 Days' },
  { minStreak: 6, name: 'Gold League', days: '6 - 9 Days' },
  { minStreak: 10, name: 'Crystal League', days: '10 - 14 Days' },
  { minStreak: 15, name: 'Master League', days: '15 - 20 Days' },
  { minStreak: 21, name: 'Champion League', days: '21 - 29 Days' },
  { minStreak: 30, name: 'Titan League', days: '30 - 49 Days' },
  { minStreak: 50, name: 'Legend League', days: '50+ Days' },
];

const LeagueStructureModal = ({ isOpen, onClose, currentStreak }) => {
  if (!isOpen) return null;

  const currentLeague = getLeagueConfig(currentStreak);

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-base font-bold text-slate-800 leading-none">Streak Leagues</h2>
              <p className="text-xs text-slate-400 mt-1">Unlock superior badges by maintaining consistency</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full w-8 h-8 hover:bg-slate-100 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Current streak banner info */}
          <div className="bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/5 border border-teal-100 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600">
                <Flame className="w-5 h-5 fill-current" />
              </div>
              <div>
                <p className="text-xs text-slate-400 leading-none">Your Consistency Streak</p>
                <h4 className="text-base font-bold text-slate-800 mt-1">{currentStreak} Active Days</h4>
              </div>
            </div>
            <div className="text-xs font-semibold px-3 py-1 bg-white border border-teal-200 rounded-full text-teal-700 shadow-2xs">
              {currentLeague.name}
            </div>
          </div>

          {/* Horizontal Leagues Row */}
          <div className="relative">
            {/* Scroll Container */}
            <div className="flex overflow-x-auto gap-4 py-4 px-2 scrollbar-thin scrollbar-thumb-slate-200/80 scrollbar-track-transparent snap-x snap-mandatory pb-6">
              {LEAGUES_LIST.map((league) => {
                const isCurrent = currentLeague.name === league.name;
                const isUnlocked = currentStreak >= league.minStreak;

                return (
                  <div 
                    key={league.name}
                    className={`flex-shrink-0 w-[142px] p-5 rounded-2xl border flex flex-col items-center justify-between text-center transition-all duration-200 snap-center ${
                      isCurrent 
                        ? 'bg-gradient-to-b from-slate-50 to-slate-100/50 border-teal-500 shadow-md ring-1 ring-teal-500/20 scale-102 z-10' 
                        : isUnlocked 
                          ? 'bg-slate-50/40 border-slate-100/70 opacity-90 hover:bg-slate-50' 
                          : 'bg-slate-50/10 border-slate-100/20 opacity-50'
                    }`}
                  >
                    {/* Badge Icon */}
                    <div className="flex items-center justify-center w-20 h-20 mb-3">
                      <LeagueBadge streak={league.minStreak} size={70} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 flex flex-col justify-center mb-4 min-h-[44px]">
                      <h4 className={`text-xs font-bold leading-tight ${isCurrent ? 'text-teal-950 font-extrabold' : 'text-slate-700'}`}>
                        {league.name.replace(' League', '')}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-1.5 leading-none">{league.days}</p>
                    </div>

                    {/* Status Indicator */}
                    <div className="w-full pt-3 border-t border-slate-100/80 flex items-center justify-center">
                      {isCurrent ? (
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-teal-700 bg-teal-100 border border-teal-200/50 px-2.5 py-0.5 rounded-full leading-none">
                          Current
                        </span>
                      ) : isUnlocked ? (
                        <div className="flex items-center gap-0.5 text-[9px] text-emerald-600 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 leading-none">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Unlocked</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-0.5 text-[9px] text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 leading-none">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Locked</span>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
};

export default LeagueStructureModal;
