import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export const getLeagueConfig = (streak) => {
  const s = Number(streak) || 0;
  if (s >= 50) {
    return {
      name: 'Legend League',
      nextName: 'Max League Reached',
      minDays: 50,
      nextDays: null,
      color: '#D4AF37',
      badgeColor: 'from-amber-400 via-purple-600 to-yellow-500',
      textColor: 'text-amber-500 bg-amber-50 border-amber-100',
      description: 'You are a legend in consistency!',
    };
  } else if (s >= 30) {
    return {
      name: 'Titan League',
      nextName: 'Legend League',
      minDays: 30,
      nextDays: 50,
      color: '#1E90FF',
      badgeColor: 'from-blue-600 via-indigo-700 to-cyan-400',
      textColor: 'text-blue-500 bg-blue-50 border-blue-100',
      description: 'Stellar titan-level dedication.',
    };
  } else if (s >= 21) {
    return {
      name: 'Champion League',
      nextName: 'Titan League',
      minDays: 21,
      nextDays: 30,
      color: '#FF007F',
      badgeColor: 'from-rose-600 via-red-700 to-amber-500',
      textColor: 'text-red-500 bg-red-50 border-red-100',
      description: 'Leading with champion focus.',
    };
  } else if (s >= 15) {
    return {
      name: 'Master League',
      nextName: 'Champion League',
      minDays: 15,
      nextDays: 21,
      color: '#8A2BE2',
      badgeColor: 'from-slate-600 via-zinc-700 to-slate-800',
      textColor: 'text-slate-600 bg-slate-150 border-slate-300',
      description: 'Master of daily self-care.',
    };
  } else if (s >= 10) {
    return {
      name: 'Crystal League',
      nextName: 'Master League',
      minDays: 10,
      nextDays: 15,
      color: '#D500F9',
      badgeColor: 'from-purple-500 via-fuchsia-600 to-indigo-400',
      textColor: 'text-purple-600 bg-purple-50 border-purple-100',
      description: 'Crystal-clear consistency.',
    };
  } else if (s >= 6) {
    return {
      name: 'Gold League',
      nextName: 'Crystal League',
      minDays: 6,
      nextDays: 10,
      color: '#FFD700',
      badgeColor: 'from-amber-400 via-yellow-500 to-amber-600',
      textColor: 'text-amber-600 bg-amber-50 border-amber-100',
      description: 'Superb golden dedication.',
    };
  } else if (s >= 3) {
    return {
      name: 'Silver League',
      nextName: 'Gold League',
      minDays: 3,
      nextDays: 6,
      color: '#C0C0C0',
      badgeColor: 'from-slate-300 via-slate-400 to-slate-500',
      textColor: 'text-slate-600 bg-slate-50 border-slate-100',
      description: 'Solid silver progress.',
    };
  } else {
    return {
      name: 'Bronze League',
      nextName: 'Silver League',
      minDays: 0,
      nextDays: 3,
      color: '#CD7F32',
      badgeColor: 'from-orange-700 via-amber-800 to-yellow-900',
      textColor: 'text-amber-800 bg-amber-50/70 border-amber-100/60',
      description: 'Great start to your journey!',
    };
  }
};

const LeagueBadge = ({ streak, size = 80 }) => {
  const config = getLeagueConfig(streak);
  const s = Number(streak) || 0;

  // Custom shield SVG path
  const shieldPath = "M 40 4 Q 65 4 70 20 Q 75 55 40 76 Q 5 55 10 20 Q 15 4 40 4 Z";
  
  // Render specific Clash of Clans styled emblems
  const renderEmblem = () => {
    if (s >= 50) {
      // 8. LEGEND LEAGUE - Gold Crown & Wings
      return (
        <g stroke="#FFF" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* Wings */}
          <path d="M 16 38 C 6 30 10 12 22 20" stroke="#FFD700" strokeWidth="3" />
          <path d="M 64 38 C 74 30 70 12 58 20" stroke="#FFD700" strokeWidth="3" />
          {/* Gold Crown */}
          <path d="M 28 48 L 32 33 L 40 41 L 48 33 L 52 48 Z" fill="#FFEA00" stroke="#E6B800" strokeWidth="1.5" />
          <circle cx="32" cy="31" r="1.5" fill="#D500F9" stroke="none" />
          <circle cx="40" cy="39" r="1.5" fill="#D500F9" stroke="none" />
          <circle cx="48" cy="31" r="1.5" fill="#D500F9" stroke="none" />
          {/* Glowing central star */}
          <polygon points="40,16 43,23 51,23 45,28 47,35 40,31 33,35 35,28 29,23 37,23" fill="#FFF" stroke="none" />
        </g>
      );
    } else if (s >= 30) {
      // 7. TITAN LEAGUE - Electric Blue Wings & Crystal Core
      return (
        <g stroke="#FFF" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* Left Wing */}
          <path d="M 12 24 L 6 42 L 26 38 Z" fill="#01579B" stroke="#00E5FF" strokeWidth="1.5" />
          {/* Right Wing */}
          <path d="M 68 24 L 74 42 L 54 38 Z" fill="#01579B" stroke="#00E5FF" strokeWidth="1.5" />
          {/* Central Energy Core */}
          <polygon points="40,18 49,36 40,54 31,36" fill="#00E5FF" stroke="#00B0FF" strokeWidth="1.5" />
          <polygon points="40,24 45,36 40,48 35,36" fill="#FFF" stroke="none" />
        </g>
      );
    } else if (s >= 21) {
      // 6. CHAMPION LEAGUE - Demon face with wings
      return (
        <g stroke="#FFF" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* Red wings */}
          <path d="M 12 28 L 6 18 L 22 22 Z" fill="#C62828" stroke="#FF5252" strokeWidth="1.5" />
          <path d="M 68 28 L 74 18 L 58 22 Z" fill="#C62828" stroke="#FF5252" strokeWidth="1.5" />
          {/* Face structure */}
          <circle cx="40" cy="38" r="13" fill="#E53935" stroke="#B71C1C" strokeWidth="1.5" />
          {/* Eyes slits */}
          <polygon points="31,33 36,36 34,38 29,35" fill="#FFEB3B" stroke="none" />
          <polygon points="49,33 44,36 46,38 51,35" fill="#FFEB3B" stroke="none" />
          {/* Fire mouth (Orange core) */}
          <path d="M 33 43 C 33 52 47 52 47 43 Z" fill="#FF9100" stroke="#FF3D00" strokeWidth="1" />
          <path d="M 36 44 C 36 48 44 48 44 44 Z" fill="#FFEA00" stroke="none" />
          {/* Fangs */}
          <polygon points="35,43 37,46 39,43" fill="#FFF" stroke="none" />
          <polygon points="45,43 43,46 41,43" fill="#FFF" stroke="none" />
        </g>
      );
    } else if (s >= 15) {
      // 5. MASTER LEAGUE - Horned Helmet
      return (
        <g stroke="#FFF" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* Left Horn */}
          <path d="M 28 35 C 20 31 15 20 17 13 C 19 17 24 25 30 28" fill="#ECEFF1" stroke="#CFD8DC" strokeWidth="1.5" />
          {/* Right Horn */}
          <path d="M 52 35 C 60 31 65 20 63 13 C 61 17 56 25 50 28" fill="#ECEFF1" stroke="#CFD8DC" strokeWidth="1.5" />
          {/* Helmet Dome */}
          <path d="M 30 32 L 40 21 L 50 32 Z" fill="#546E7A" stroke="#37474F" strokeWidth="1.5" />
          {/* Helmet Faceplate */}
          <rect x="30" y="32" width="20" height="20" rx="3" fill="#263238" stroke="#37474F" strokeWidth="1.5" />
          {/* Red eye slit */}
          <line x1="33" y1="38" x2="47" y2="38" stroke="#FF5252" strokeWidth="2.5" />
          {/* Vertical nose bridge guard */}
          <line x1="40" y1="21" x2="40" y2="52" stroke="#B0BEC5" strokeWidth="1.5" />
        </g>
      );
    } else if (s >= 10) {
      // 4. CRYSTAL LEAGUE - Purple Shield with diamond crystal
      return (
        <g stroke="#FFF" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* Crystal wings */}
          <path d="M 12 28 Q 6 36 12 48 Q 26 44 26 34" fill="#6A1B9A" stroke="#E1BEE7" strokeWidth="1.5" />
          <path d="M 68 28 Q 74 36 68 48 Q 54 44 54 34" fill="#6A1B9A" stroke="#E1BEE7" strokeWidth="1.5" />
          {/* Central Diamond Crystal */}
          <polygon points="40,21 54,38 40,55 26,38" fill="#D500F9" stroke="#FFF" strokeWidth="2" />
          <polygon points="40,21 40,55 54,38" fill="#E040FB" fillOpacity="0.5" stroke="none" />
          <line x1="26" y1="38" x2="54" y2="38" stroke="#FFF" strokeWidth="1" strokeOpacity="0.7" />
        </g>
      );
    } else if (s >= 6) {
      // 3. GOLD LEAGUE - Crossed Gold Swords with central star
      return (
        <g stroke="#FFF" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* Sword 1 */}
          <path d="M 23 23 L 57 57" stroke="#FFD700" strokeWidth="3.5" />
          <path d="M 26 51 L 49 28" stroke="#FFF" strokeWidth="1.5" />
          <path d="M 53 53 L 60 60" stroke="#B8860B" strokeWidth="2.5" />
          {/* Sword 2 */}
          <path d="M 57 23 L 23 57" stroke="#FFD700" strokeWidth="3.5" />
          <path d="M 54 51 L 31 28" stroke="#FFF" strokeWidth="1.5" />
          <path d="M 27 53 L 20 60" stroke="#B8860B" strokeWidth="2.5" />
          {/* Golden Star center */}
          <polygon points="40,28 43,35 50,35 45,40 47,47 40,42 33,47 35,40 30,35 37,35" fill="#FFE082" stroke="#FFB300" strokeWidth="1" />
        </g>
      );
    } else if (s >= 3) {
      // 2. SILVER LEAGUE - Crossed Silver Swords
      return (
        <g stroke="#FFF" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* Sword 1 (top-left to bottom-right) */}
          <path d="M 24 24 L 56 56" stroke="#ECEFF1" strokeWidth="3" />
          <path d="M 28 48 L 48 28" stroke="#B0BEC5" strokeWidth="1.5" />
          <path d="M 52 52 L 58 58" stroke="#455A64" strokeWidth="2" />
          {/* Sword 2 (top-right to bottom-left) */}
          <path d="M 56 24 L 24 56" stroke="#ECEFF1" strokeWidth="3" />
          <path d="M 52 48 L 32 28" stroke="#B0BEC5" strokeWidth="1.5" />
          <path d="M 28 52 L 22 58" stroke="#455A64" strokeWidth="2" />
        </g>
      );
    } else {
      // 1. BRONZE LEAGUE - Copper shield, single vertical sword
      return (
        <g stroke="#FFF" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* Sword blade */}
          <path d="M 40 21 L 40 50" stroke="#E59866" strokeWidth="3.5" />
          <path d="M 40 21 L 40 50" stroke="#FFF" strokeWidth="1.2" strokeOpacity="0.8" />
          {/* Hilt / Guard */}
          <path d="M 31 45 L 49 45" stroke="#D35400" strokeWidth="2" />
          {/* Grip */}
          <path d="M 40 45 L 40 55" stroke="#5E2700" strokeWidth="2.5" />
          <circle cx="40" cy="55" r="1.5" fill="#FFF" stroke="none" />
        </g>
      );
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.08, rotate: [0, -3, 3, 0] }}
      transition={{ duration: 0.3 }}
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      {/* Outer Glow Ring */}
      <div 
        className={`absolute inset-0 rounded-full blur-md opacity-45 bg-gradient-to-tr ${config.badgeColor} animate-pulse`}
        style={{ transform: 'scale(1.15)' }}
      />
      
      {/* Shield Vector Representation */}
      <svg 
        viewBox="0 0 80 80" 
        className="w-full h-full drop-shadow-md relative z-10"
      >
        <defs>
          <linearGradient id={`shieldGrad-${streak}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: config.color }} />
            <stop offset="50%" style={{ stopColor: '#ffffff', stopOpacity: 0.25 }} />
            <stop offset="100%" style={{ stopColor: '#1e293b' }} />
          </linearGradient>
          <linearGradient id={`goldGlow-${streak}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#fff', stopOpacity: 0.4 }} />
            <stop offset="100%" style={{ stopColor: '#000', stopOpacity: 0.2 }} />
          </linearGradient>
        </defs>

        {/* Outer Shield Backing */}
        <path 
          d={shieldPath}
          className={`fill-gradient bg-gradient-to-tr ${config.badgeColor}`}
          stroke="#1e293b"
          strokeWidth="3.5"
        />

        {/* Inner Colored Border Shield */}
        <path 
          d="M 40 8 Q 61 8 65 22 Q 69 51 40 70 Q 11 51 15 22 Q 19 8 40 8 Z"
          fill={`url(#shieldGrad-${streak})`}
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeOpacity="0.4"
        />

        {/* Inner Emblem Core (Holds emblem contents) */}
        <path 
          d="M 40 13 Q 57 13 60 25 Q 64 47 40 64 Q 16 47 20 25 Q 23 13 40 13 Z"
          fill="#1e293b"
          fillOpacity="0.9"
          stroke="#475569"
          strokeWidth="0.8"
        />

        {/* Dynamically Rendered Clash of Clans Emblems */}
        {renderEmblem()}
      </svg>
      
      {/* Floating Sparkle on High Leagues */}
      {s >= 6 && (
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 z-20 flex items-center justify-center"
        >
          <Sparkles className="w-4 h-4 text-white/85 absolute -top-1 -right-1" />
          <Sparkles className="w-3.5 h-3.5 text-white/70 absolute -bottom-1 -left-1" />
        </motion.div>
      )}
    </motion.div>
  );
};

export default LeagueBadge;
