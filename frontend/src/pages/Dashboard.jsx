import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, API } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Smile, TrendingUp, Award, ClipboardList,
  Camera, BookOpen, LogOut, ShieldCheck, X,
  BrainCircuit, Lightbulb, CheckCircle2, Maximize2, Minimize2,
  AlertTriangle, CheckCircle, Loader2, MessageCircle, Sparkles,
  Trophy, Flame

} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import PageLayout from '../components/PageLayout';
import EmergencyContactBanner from '../components/ui/EmergencyContactBanner';
import ChatModal from '../components/ChatModal';
import AIChatModal from '../components/AIChatModal';
import FriendHealthCard from '../components/FriendHealthCard';
import LeagueBadge, { getLeagueConfig } from '../components/LeagueBadge';
import ShareMilestoneModal from '../components/ShareMilestoneModal';
import LeagueStructureModal from '../components/LeagueStructureModal';
import { Share2 } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// SOSModal is now globally handled by PageLayout.jsx

/* ─── STAT CARD COMPONENT ─────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, iconBg, iconColor, valueColor }) => (
  <Card className="p-6 rounded-2xl border border-slate-100 bg-white" style={{ boxShadow: 'var(--shadow-sm)' }}>
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
        <p className={`text-2xl font-bold tracking-tight ${valueColor || 'text-slate-800'}`}>{value}</p>
      </div>
    </div>
  </Card>
);

/* ─── ACTION CARD COMPONENT ───────────────────────────────────── */
const ActionCard = ({ icon: Icon, title, subtitle, iconBg, iconColor, accentColor, onClick }) => (
  <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
    <Card
      onClick={onClick}
      className={`p-5 rounded-2xl border border-slate-100 bg-white cursor-pointer transition-all duration-200 hover:border-slate-200 flex items-center gap-4`}
      style={{ boxShadow: 'var(--shadow-xs)', borderLeft: `3px solid ${accentColor}` }}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <h3 className="font-bold text-slate-800 text-base leading-none mb-1.5">{title}</h3>
        <p className="text-sm text-slate-450">{subtitle}</p>
      </div>
    </Card>
  </motion.div>
);

const THOUGHTS_OF_THE_DAY = [
  "Every day is a fresh start. Breathe in hope, breathe out doubt. You are doing great.",
  "It's okay to slow down and rest. Healing is not a race, it's a personal journey.",
  "Be gentle with yourself today. You are doing the best you can, and that is more than enough.",
  "Small progress is still progress. Celebrate every step you take towards wellness.",
  "You are stronger than the worries that try to pull you down. Take it one breath at a time.",
  "Self-care is never selfish. It's how you reclaim your peace and recharge your spirit.",
  "In the middle of difficulty lies opportunity. Keep moving forward with a calm heart.",
  "You don't have to carry the weight of tomorrow today. Focus on this present moment.",
  "Your feelings are valid, but they do not define your worth. You are valued.",
  "A beautiful day begins with a beautiful mindset. Find one small thing to be grateful for.",
  "Believe in yourself and all that you are. There is something inside you that is greater than any obstacle.",
  "Quiet your mind, free your heart, and let go of what you cannot control today.",
  "You are capable of amazing things. Trust the process and keep moving forward.",
  "Every moment is a new beginning. Choose peace, love, and kindness for yourself today."
];

/* ─── MAIN DASHBOARD ─────────────────────────────────────────── */
const Dashboard = () => {
  const { user, token, logout } = useAuth();
  const thoughtOfTheDay = useMemo(() => {
    const day = new Date().getDate();
    return THOUGHTS_OF_THE_DAY[day % THOUGHTS_OF_THE_DAY.length];
  }, []);
  const navigate = useNavigate();
  const [trends, setTrends]               = useState([]);
  const [avgScore, setAvgScore]           = useState(0);
  const [totalEntries, setTotalEntries]   = useState(0);
  const [summary, setSummary]             = useState('');
  const [tasks, setTasks]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showSOSModal, setShowSOSModal]   = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showAIChatModal, setShowAIChatModal] = useState(false);
  const [isChartExpanded, setIsChartExpanded] = useState(false);
  const [friendReport, setFriendReport] = useState(null);
  const [chatContactName, setChatContactName] = useState(user?.emergencyContact?.name || 'Contact');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showLeagueStructureModal, setShowLeagueStructureModal] = useState(false);

  // Synchronize contact name on user load
  useEffect(() => {
    if (user?.emergencyContact?.name) {
      setChatContactName(user.emergencyContact.name);
    }
  }, [user]);

  // Fetch on mount AND whenever user navigates back to this page
  useEffect(() => {
    if (token) fetchDashboardData();

    // Re-fetch when tab regains focus (covers navigating back from Selfie/Journal/Quiz)
    const handleFocus = () => { if (token) fetchDashboardData(); };
    const handleVisibility = () => {
      if (!document.hidden && token) fetchDashboardData();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [token]);

  // Helper: format a Date to local YYYY-MM-DD (avoids UTC timezone mismatch)
  const toLocalDateStr = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };

  // Helper: normalize any score (which may be -1 to +1 or 0 to 1) into 0–100
  const normalizeTo100 = (score) => {
    // Scores from quiz are -0.8 to +0.8, from journal are 0.05 to 0.8
    // Normalize from [-1, 1] range to [0, 100]
    const normalized = ((score + 1) / 2) * 100;
    return Math.max(0, Math.min(100, Math.round(normalized)));
  };

  const computedStreak = useMemo(() => {
    if (!trends || trends.length === 0) return 0;
    const activeDates = new Set(trends.map(t => toLocalDateStr(t.date)));
    let streak = 0;
    let curr = new Date();
    // Check today first, then go backwards
    while (activeDates.has(toLocalDateStr(curr))) {
      streak++;
      curr.setDate(curr.getDate() - 1);
    }
    // If today has no entry yet, start checking from yesterday
    if (streak === 0) {
      curr = new Date();
      curr.setDate(curr.getDate() - 1);
      while (activeDates.has(toLocalDateStr(curr))) {
        streak++;
        curr.setDate(curr.getDate() - 1);
      }
    }
    return streak;
  }, [trends]);

  const leagueConfig = useMemo(() => getLeagueConfig(computedStreak), [computedStreak]);

  const fetchDashboardData = async () => {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [trendsRes, journalRes, historyRes] = await Promise.all([
        axios.get(`${API}/mood/trends?days=30&t=${Date.now()}`, { headers }),
        axios.get(`${API}/journal?t=${Date.now()}`, { headers }),
        axios.get(`${API}/mood/history?days=365&t=${Date.now()}`, { headers }),
      ]);

      const rawTrends = trendsRes.data.trends || [];
      setTrends(rawTrends);

      // Normalize average score from [-1,1] range to [0,100]
      const rawAvg = trendsRes.data.averageScore || 0;
      const normalizedAvg = normalizeTo100(rawAvg);
      setAvgScore(normalizedAvg);

      const totalEntriesCount = historyRes.data.moods?.length || rawTrends.length;
      setTotalEntries(totalEntriesCount);

      // Low score auto-alert trigger (<= 20)
      if (normalizedAvg <= 20 && totalEntriesCount > 0) {
        const sessionStorageKey = `lowScoreAlertTriggered_${user?._id || user?.id}`;
        if (!sessionStorage.getItem(sessionStorageKey)) {
          try {
            await axios.post(`${API}/friend/low-score-alert`, {}, { headers });
            sessionStorage.setItem(sessionStorageKey, 'true');
            console.log("🔔 [Low Score Auto-Alert] Successfully triggered alert for emergency contact");
          } catch (alertErr) {
            console.warn("⚠️ Failed to auto-trigger low score alert:", alertErr);
          }
        }
      }

      // Fetch friend report if current user has friend who listed them
      try {
        const friendRes = await axios.get(`${API}/friend/report?t=${Date.now()}`, { headers });
        if (friendRes.data.hasFriendInNeed) {
          setFriendReport(friendRes.data);
        } else {
          setFriendReport(null);
        }
      } catch (friendErr) {
        console.warn("Failed to fetch friend report:", friendErr);
      }

      const latestJournal = journalRes.data.journals?.[0];
      if (latestJournal) {
        setSummary(latestJournal.textSentiment?.summary || 'No recent summary available.');
        setTasks(latestJournal.textSentiment?.suggestedTasks || []);
      } else {
        setSummary('Start tracking your mood to see insights');
      }
    } catch (error) {
      console.error('Failed to fetch dashboard content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  const displayTrends = isChartExpanded ? trends : trends.slice(-7);
  const chartData = {
    labels: displayTrends.map(t => new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Wellness Score',
      data: displayTrends.map(t => normalizeTo100(t.score)),
      borderColor: '#3A6B5E',
      backgroundColor: 'rgba(58, 107, 94, 0.06)',
      fill: true, tension: 0.45, pointRadius: isChartExpanded ? 2 : 4,
      pointBackgroundColor: '#3A6B5E',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
    }],
  };

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    scales: {
      y: {
        min: 0, max: 100,
        ticks: { stepSize: 25, callback: (v) => `${v}%`, font: { size: 11 }, color: '#94a3b8' },
        grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 }, color: '#94a3b8' },
        border: { display: false },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#94a3b8',
        bodyColor: '#f8fafc',
        borderColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 10,
        callbacks: {
          label: (ctx) => `Wellness: ${ctx.parsed.y}%`,
        },
      },
    },
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-page">
      <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin mb-4" />
      <p className="text-sm text-muted-foreground animate-pulse tracking-wide">Loading wellness data…</p>
    </div>
  );

  return (
    <PageLayout activeTab="dashboard">

        {/* Friend Health alert section (if applicable) */}
        {friendReport && friendReport.hasFriendInNeed && (
          <FriendHealthCard
            friendData={friendReport.friend}
            onOpenChat={() => {
              setChatContactName(friendReport.friend.name);
              setShowChatModal(true);
            }}
          />
        )}

        {/* Welcome Profile Hero Card banner */}
        <section className="relative rounded-3xl bg-gradient-to-r from-indigo-50 via-slate-50 to-indigo-50/30 border border-indigo-100/40 p-4 sm:p-6 overflow-hidden flex flex-col items-center justify-between gap-4 sm:gap-6 md:flex-row shadow-xs shrink-0 min-h-0 md:min-h-[160px]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/15 via-transparent to-transparent opacity-70 pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-center gap-6 relative z-10 flex-1">
            {/* Circular Progress Ring for score */}
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 88 88">
                <circle
                  cx="44"
                  cy="44"
                  r="34"
                  className="text-slate-100"
                  strokeWidth="5"
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="44"
                  cy="44"
                  r="34"
                  className="text-indigo-600 transition-all duration-700"
                  strokeWidth="5"
                  strokeDasharray={2 * Math.PI * 34}
                  strokeDashoffset={(2 * Math.PI * 34) - (avgScore / 100) * (2 * Math.PI * 34)}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl sm:text-4xl font-black text-slate-800 leading-none">{avgScore}</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 leading-none">Score</span>
              </div>
            </div>

            {/* Welcome Greeting details */}
            <div className="text-center md:text-left space-y-1">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest leading-none">MindMate Dashboard</span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-800 mt-1.5">
                Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]} 👋
              </h2>
              <p className="text-base text-slate-500 font-semibold mt-1.5">You've completed {totalEntries} self-care checks in MindMate.</p>
              
              <div className="flex items-center justify-center md:justify-start gap-3 sm:gap-4 mt-4 flex-wrap">
                <div className="flex items-center gap-2.5 text-sm text-slate-700 font-bold bg-white/70 border border-slate-200/55 rounded-xl px-4 py-2.5 shadow-2xs">
                  <Flame className="w-4 h-4 text-amber-500 fill-current animate-pulse" />
                  <span>{computedStreak} Day Streak</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-slate-700 font-bold bg-white/70 border border-slate-200/55 rounded-xl px-4 py-2.5 shadow-2xs">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  <span>{totalEntries} Journal Entries</span>
                </div>
              </div>
            </div>
          </div>

          {/* Thought of the Day Bubble on the right */}
          <div 
            onClick={() => setShowAIChatModal(true)}
            className="bg-white/95 border border-indigo-100 hover:border-indigo-200/80 p-4 sm:p-5 rounded-2xl w-full md:max-w-sm shadow-xs relative z-10 cursor-pointer transition-all hover:scale-101 shrink-0 flex items-start gap-3.5"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0 border border-amber-100">
              <Lightbulb className="w-4 h-4 fill-current animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 uppercase tracking-widest">
                <span>Thought of the Day</span>
              </div>
              <p className="text-sm text-slate-700 font-semibold leading-relaxed mt-1.5 italic line-clamp-4">
                "{thoughtOfTheDay}"
              </p>
            </div>
          </div>
        </section>

        {/* Main Columns Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
          
          {/* Timeline and Journal grid (2 columns wide) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Mood Timeline Line Chart Card */}
            <Card
              onClick={() => setIsChartExpanded(!isChartExpanded)}
              className="p-6 rounded-3xl border border-slate-100 bg-white cursor-pointer transition-all duration-200 hover:border-slate-200"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="font-extrabold text-slate-805 text-lg">Mood Timeline</h3>
                  <p className="text-base text-slate-500 mt-0.5">{isChartExpanded ? 'Last 30 days' : 'Last 7 days'}</p>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl">
                  <span className="text-sm font-extrabold text-indigo-650 bg-white px-3 py-1.5 rounded-lg shadow-2xs border border-indigo-100/10">7 Days</span>
                  <span className="text-sm font-bold text-slate-400 px-3 py-1.5">30 Days</span>
                </div>
              </div>
              <div style={{ height: '220px' }}>
                {trends.length > 0
                  ? <Line data={chartData} options={chartOptions} />
                  : (
                    <div className="h-full flex flex-col items-center justify-center gap-2">
                      <TrendingUp className="w-8 h-8 text-slate-200" />
                      <p className="text-sm text-slate-450">No wellness history found. Write a journal entry!</p>
                    </div>
                  )
                }
              </div>
            </Card>

            {/* Weekly Journal Preview and suggestions */}
            <Card className="p-6 rounded-3xl border border-slate-100 bg-white space-y-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold text-slate-805 text-lg">Weekly Journal Preview</h3>
                </div>
                <button onClick={() => navigate('/journal')} className="text-base text-indigo-600 font-bold hover:underline">View All</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Journal Text Preview block */}
                <div className="bg-slate-50 rounded-xl p-4.5 border border-slate-100 flex flex-col justify-between">
                  <div>
                    <p className="text-sm font-extrabold text-slate-450 uppercase tracking-widest mb-2.5">Latest Entry Summary</p>
                    <p className="text-base text-slate-700 leading-relaxed italic line-clamp-4">
                      "{summary}"
                    </p>
                  </div>
                  <Button 
                    onClick={() => navigate('/journal')}
                    className="w-full mt-4 bg-white hover:bg-slate-50 text-indigo-600 border border-slate-200/80 rounded-xl py-3 px-4 text-sm font-bold shadow-none"
                  >
                    Continue Writing
                  </Button>
                </div>

                {/* AI Suggestions block */}
                <div className="space-y-3">
                  <p className="text-sm font-extrabold text-slate-455 uppercase tracking-widest">Recommended Actions</p>
                  <div className="space-y-2">
                    {tasks.slice(0, 3).map((t, idx) => (
                      <div key={idx} className="bg-slate-50/70 p-3 rounded-xl border border-slate-100/50 flex gap-2.5 items-start hover:bg-slate-100/50 transition-colors">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                        <p className="text-base text-slate-700 font-semibold leading-relaxed">{t}</p>
                      </div>
                    ))}
                    {tasks.length === 0 && (
                      <div className="p-3 text-center text-sm text-slate-455 italic bg-slate-50/50 rounded-xl">
                        Log a journal entry or selfie to unlock personalized tasks.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

          </div>

          {/* Right sidebar column (1 column wide) */}
          <div className="space-y-6">
            
            {/* Custom Streak League progression card */}
            <Card 
              className="p-6 rounded-3xl border border-slate-100 bg-white relative overflow-hidden flex flex-col justify-between min-h-[170px]"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="cursor-pointer transition-transform hover:scale-105 shrink-0"
                  onClick={() => setShowLeagueStructureModal(true)}
                  title="View All Streak Leagues"
                >
                  <LeagueBadge streak={computedStreak} size={54} />
                </div>
                
                <div 
                  className="min-w-0 flex-1 cursor-pointer"
                  onClick={() => setShowLeagueStructureModal(true)}
                  title="View All Streak Leagues"
                >
                  <p className="text-sm font-bold text-slate-405 uppercase tracking-widest leading-none mb-2">Consistency League</p>
                  <h3 className="font-black text-slate-805 text-lg md:text-xl leading-none mb-1 hover:text-indigo-600 transition-colors">{leagueConfig.name}</h3>
                  <p className="text-base text-slate-500 font-bold mt-1.5">{computedStreak} Day Streak</p>
                </div>

                <button 
                  onClick={() => setShowShareModal(true)}
                  className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors group border border-slate-100 shrink-0 shadow-2xs"
                  title="Share League Milestone"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
                </button>
              </div>

              {leagueConfig.nextDays ? (
                <div className="mt-4 pt-1">
                  <div className="flex justify-between items-center text-sm text-slate-400 font-bold mb-1.5">
                    <span>Next: {leagueConfig.nextName}</span>
                    <span>{computedStreak} / {leagueConfig.nextDays} days</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, (computedStreak / leagueConfig.nextDays) * 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-4 pt-1 flex items-center gap-1.5 text-xs text-amber-500 font-bold uppercase tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Max League Reached!</span>
                </div>
              )}
            </Card>

            {/* Emergency Safety Checklist */}
            <Card className="p-6 rounded-3xl border border-slate-100 bg-white flex flex-col justify-between" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100/30">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-855 text-lg">Emergency Safety</h3>
                    <p className="text-sm text-slate-450 mt-1">We're here if you need us</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {[
                    { label: 'Emergency Contact', note: user?.emergencyContact?.name ? `${user.emergencyContact.name}` : 'No contact set', checked: !!user?.emergencyContact?.name },
                    { label: 'Safety Settings', note: 'Configured safety plan', checked: true },
                    { label: 'Crisis Support Access', note: '24/7 priority line ready', checked: true },
                  ].map((row, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setShowSafetyModal(true)}
                      className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-100/50 transition-colors"
                    >
                      <div>
                        <p className="text-base font-extrabold text-slate-705 leading-none">{row.label}</p>
                        <p className="text-sm text-slate-450 font-semibold mt-2 leading-none">{row.note}</p>
                      </div>
                      <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        row.checked ? 'bg-emerald-50 text-emerald-650 border border-emerald-250' : 'bg-amber-50 text-amber-650 border border-amber-250'
                      }`}>✓</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100/60 text-center">
                <p className="text-sm font-bold text-slate-450 uppercase tracking-widest">You matter. Reach out anytime. ❤️</p>
              </div>
            </Card>

          </div>

        </div>

      {/* ── Modals and Dialog overlay structures ── */}
      <AnimatePresence>
        {showSafetyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative w-full max-w-lg bg-white rounded-2xl overflow-hidden"
              style={{ boxShadow: 'var(--shadow-xl)' }}
            >
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">Safety Settings</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowSafetyModal(false)} className="rounded-full w-8 h-8">
                  <X className="w-4 h-4 text-slate-400" />
                </Button>
              </div>
              <div className="p-6">
                <EmergencyContactBanner forceShow={true} onComplete={() => setShowSafetyModal(false)} />
              </div>
            </motion.div>
          </div>
        )}

        {showAIChatModal && (
          <AIChatModal
            isOpen={showAIChatModal}
            onClose={() => setShowAIChatModal(false)}
            token={token}
            userName={user?.name}
          />
        )}

        {showChatModal && (
          <ChatModal
            isOpen={showChatModal}
            onClose={() => setShowChatModal(false)}
            token={token}
            userId={user?._id || user?.id}
            contactName={chatContactName}
          />
        )}

        {showShareModal && (
          <ShareMilestoneModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            streak={computedStreak}
            token={token}
            userName={user?.name}
          />
        )}

        {showLeagueStructureModal && (
          <LeagueStructureModal
            isOpen={showLeagueStructureModal}
            onClose={() => setShowLeagueStructureModal(false)}
            currentStreak={computedStreak}
          />
        )}
      </AnimatePresence>
    </PageLayout>
  );
};

export default Dashboard;