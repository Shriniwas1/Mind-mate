import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, API } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import { Button } from './ui/button';
import {
  Smile, TrendingUp, ClipboardList, Camera, BookOpen, LogOut, ShieldCheck, X,
  AlertTriangle, CheckCircle, Loader2, MessageCircle, Sparkles, Flame, Lightbulb,
  Menu
} from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from './ui/sheet';

import ChatModal from './ChatModal';
import AIChatModal from './AIChatModal';
import EmergencyContactBanner from './ui/EmergencyContactBanner';

/* ─── SOS MODAL COMPONENT ─────────────────────────────────────── */
const SOSModal = ({ onClose, token }) => {
  const [step, setStep] = useState('confirm'); // confirm | sending | done | error
  const [results, setResults] = useState([]);
  const [customMessage, setCustomMessage] = useState('');

  const sendSOS = async () => {
    setStep('sending');
    const headers = { Authorization: `Bearer ${token}` };
    const message = customMessage.trim() || "I'm not doing well right now and could use some support. Please check in on me.";
    const channelResults = [];

    try {
      await axios.post(`${API}/alert/sos/in-app`, { message }, { headers });
      channelResults.push({ channel: 'In-App Message', success: true });
    } catch {
      channelResults.push({ channel: 'In-App Message', success: false });
    }

    try {
      await axios.post(`${API}/alert/sos/email`, { message }, { headers });
      channelResults.push({ channel: 'Email', success: true });
    } catch {
      channelResults.push({ channel: 'Email', success: false });
    }

    const freeChannelWorked = channelResults.some(r => r.success);
    if (!freeChannelWorked) {
      try {
        await axios.post(`${API}/alert/sos/sms`, { message }, { headers });
        channelResults.push({ channel: 'SMS (Twilio)', success: true });
      } catch {
        channelResults.push({ channel: 'SMS (Twilio)', success: false });
      }
    } else {
      channelResults.push({ channel: 'SMS (Twilio)', success: null, skipped: true });
    }

    setResults(channelResults);
    const anySuccess = channelResults.some(r => r.success);
    setStep(anySuccess ? 'done' : 'error');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative w-full max-w-md bg-white rounded-2xl overflow-hidden text-left"
        style={{ boxShadow: 'var(--shadow-xl)' }}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-red-50 border-b border-red-100/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-100 border border-red-200 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-900 leading-none">SOS Alert</h2>
              <p className="text-sm text-red-500 mt-1">Notify your emergency contact</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-red-100 w-8 h-8">
            <X className="w-4 h-4 text-red-400" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          {/* CONFIRM */}
          {step === 'confirm' && (
            <>
              <p className="text-base text-slate-650 leading-relaxed">
                Your emergency contact will be notified immediately. We'll try every available channel — starting with free options first.
              </p>

              <div>
                <label className="text-sm font-semibold text-slate-505 uppercase tracking-wide mb-1.5 block">
                  Message (optional)
                </label>
                <textarea
                  rows={3}
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  placeholder="I'm not doing well right now and could use some support..."
                  className="w-full text-base border border-slate-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-red-200 bg-slate-50 placeholder:text-slate-400"
                />
              </div>

              {/* Priority chain preview */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-100">
                <p className="text-sm font-semibold text-slate-405 uppercase tracking-wide mb-2">Notification priority</p>
                {[
                  { label: '1st — In-App Message', note: 'free, instant' },
                  { label: '2nd — Email',           note: 'free' },
                  { label: '3rd — SMS via Twilio',  note: 'paid, only if above fail' },
                ].map(({ label, note }) => (
                  <div key={label} className="flex items-center gap-2 text-base">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-300 flex-shrink-0" />
                    <span className="font-medium text-slate-755">{label}</span>
                    <span className="text-slate-450 text-xs">({note})</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl border-slate-200 text-slate-650 text-base font-bold py-2.5">Cancel</Button>
                <Button onClick={sendSOS} className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-base py-2.5">
                  Send SOS Now
                </Button>
              </div>
            </>
          )}

          {/* SENDING */}
          {step === 'sending' && (
            <div className="flex flex-col items-center py-10 gap-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
              </div>
              <p className="text-slate-650 font-bold text-base">Contacting your support network…</p>
            </div>
          )}

          {/* DONE / ERROR */}
          {(step === 'done' || step === 'error') && (
            <>
              <div className="flex flex-col items-center pb-2 gap-3 text-center">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${step === 'done' ? 'bg-green-50' : 'bg-red-50'}`}>
                  {step === 'done'
                    ? <CheckCircle className="w-7 h-7 text-green-500" />
                    : <AlertTriangle className="w-7 h-7 text-red-500" />
                  }
                </div>
                <div>
                  <p className="font-bold text-xl text-slate-805">
                    {step === 'done' ? 'Alert Sent!' : 'All channels failed'}
                  </p>
                  <p className="text-base text-slate-500 mt-1.5">
                    {step === 'done'
                      ? 'Your contact has been notified. You are not alone.'
                      : 'Please call your contact or a crisis line (988) directly.'}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {results.map(r => (
                  <div key={r.channel} className={`flex items-center gap-2.5 text-base rounded-xl px-3.5 py-2.5 ${
                    r.skipped ? 'bg-slate-50 text-slate-400' :
                    r.success  ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'
                  }`}>
                    <span className="text-base">{r.skipped ? '⏭' : r.success ? '✅' : '❌'}</span>
                    <span className="font-medium">{r.channel}</span>
                    {r.skipped && <span className="text-sm text-slate-400">(skipped — not needed)</span>}
                  </div>
                ))}
              </div>
              <Button
                onClick={onClose}
                className={`w-full rounded-xl py-3 mt-2 text-base font-bold ${step === 'error' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
              >
                {step === 'error' ? 'Close & Call Manually' : 'Close'}
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

/* ─── PAGE LAYOUT WRAPPER ─────────────────────────────────────── */
const PageLayout = ({ children, activeTab }) => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [trends, setTrends] = useState([]);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showAIChatModal, setShowAIChatModal] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [chatContactName, setChatContactName] = useState(user?.emergencyContact?.name || 'Contact');

  // Synchronize contact name on user load
  useEffect(() => {
    if (user?.emergencyContact?.name) {
      setChatContactName(user.emergencyContact.name);
    }
  }, [user]);

  // Fetch mood history for sidebar widgets/insights if needed
  useEffect(() => {
    if (token) {
      axios.get(`${API}/mood/trends?days=30&t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setTrends(res.data.trends || []);
      }).catch(err => console.warn('Sidebar trends fetch failed:', err));
    }
  }, [token]);

  const computedStreak = useMemo(() => {
    if (!trends || trends.length === 0) return 0;
    
    const toLocalDateStr = (d) => {
      const dt = new Date(d);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    };

    const activeDates = new Set(trends.map(t => toLocalDateStr(t.date)));
    let streak = 0;
    let curr = new Date();
    while (activeDates.has(toLocalDateStr(curr))) {
      streak++;
      curr.setDate(curr.getDate() - 1);
    }
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

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  /* ── Shared navigation items (single source of truth for desktop & mobile) ── */
  const navItems = [
    { icon: Smile, label: 'Dashboard', active: activeTab === 'dashboard', onClick: () => navigate('/dashboard') },
    { icon: BookOpen, label: 'Weekly Journal', active: activeTab === 'journal', onClick: () => navigate('/journal') },
    { icon: Camera, label: 'Mood Selfie', active: activeTab === 'selfie', onClick: () => navigate('/selfie') },
    { icon: ClipboardList, label: 'Wellness Quiz', active: activeTab === 'quiz', onClick: () => navigate('/quiz') },
    { icon: TrendingUp, label: 'Insights', onClick: () => navigate('/dashboard') },
    { icon: Sparkles, label: 'AI Companion', onClick: () => setShowAIChatModal(true) },
    { icon: MessageCircle, label: 'Support Chat', onClick: () => { setChatContactName(user?.emergencyContact?.name || 'Contact'); setShowChatModal(true); } },
    { icon: ShieldCheck, label: 'Emergency Safety', active: activeTab === 'safety', onClick: () => setShowSafetyModal(true) },
  ];

  /* ── Reusable nav button renderer ── */
  const renderNavButton = (item, idx, { onAfterClick } = {}) => (
    <button
      key={idx}
      onClick={() => { item.onClick(); onAfterClick?.(); }}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-bold tracking-wide transition-all ${
        item.active 
          ? 'bg-indigo-50/70 text-indigo-700 font-extrabold' 
          : 'text-slate-400 hover:text-slate-750 hover:bg-slate-50'
      }`}
    >
      <item.icon className={`w-4 h-4 ${item.active ? 'text-indigo-600' : 'text-slate-400'}`} />
      <span>{item.label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans antialiased text-slate-800">
      
      {/* ── Left Navigation Sidebar (Desktop only — unchanged) ── */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-100 flex-shrink-0 h-screen sticky top-0 justify-between py-6 px-4">
        <div>
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5 px-3 mb-8 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <img src="/mindmate-logo.png" alt="MindMate" className="w-8 h-8 rounded-xl object-contain" />
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">MindMate</span>
          </div>

          {/* Navigation Links — uses shared navItems */}
          <nav className="space-y-1.5 flex-1">
            {navItems.map((item, idx) => renderNavButton(item, idx))}
          </nav>
        </div>

        {/* Sidebar Footer Support widgets */}
        <div className="space-y-3 pt-6 border-t border-slate-100/80">
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-left">
            <p className="text-sm font-bold text-slate-805 tracking-wide uppercase leading-none">Need immediate support?</p>
            <p className="text-sm text-slate-500 mt-2 leading-normal">You're not alone. Our support network is here 24/7.</p>
            <button 
              onClick={() => setShowSOSModal(true)}
              className="w-full mt-3.5 bg-red-50 hover:bg-red-100 text-red-650 font-extrabold py-2.5 px-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5 border border-red-200"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>SOS Alert</span>
            </button>
          </div>
          
          <div className="relative overflow-hidden bg-gradient-to-b from-indigo-50 to-violet-50 border border-indigo-100/50 p-4 rounded-2xl text-left min-h-[90px] flex flex-col justify-end">
            <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-indigo-100/30 blur-xl" />
            <p className="text-sm text-indigo-850 font-extrabold leading-normal relative z-10">
              Take a deep breath, you're doing better than you think. 💛
            </p>
          </div>
        </div>
      </aside>

      {/* ── Mobile Navigation Drawer (lg:hidden only) ── */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Main navigation menu</SheetDescription>
          </SheetHeader>

          {/* Drawer header / logo */}
          <div className="flex items-center gap-2.5 px-6 py-5 border-b border-slate-100">
            <img src="/mindmate-logo.png" alt="MindMate" className="w-8 h-8 rounded-xl object-contain" />
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">MindMate</span>
          </div>

          {/* Drawer nav — reuses same navItems */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {navItems.map((item, idx) => renderNavButton(item, idx, { onAfterClick: () => setMobileNavOpen(false) }))}
            <button
              onClick={() => { handleLogout(); setMobileNavOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-bold tracking-wide transition-all text-slate-400 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 text-slate-400 hover:text-red-500" />
              <span>Logout</span>
            </button>
          </nav>

          {/* Drawer footer — same SOS + motivational cards */}
          <div className="space-y-3 p-4 border-t border-slate-100/80">
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-left">
              <p className="text-sm font-bold text-slate-805 tracking-wide uppercase leading-none">Need immediate support?</p>
              <p className="text-sm text-slate-500 mt-2 leading-normal">You're not alone. Our support network is here 24/7.</p>
              <button 
                onClick={() => { setShowSOSModal(true); setMobileNavOpen(false); }}
                className="w-full mt-3.5 bg-red-50 hover:bg-red-100 text-red-650 font-extrabold py-2.5 px-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5 border border-red-200"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>SOS Alert</span>
              </button>
            </div>
            
            <div className="relative overflow-hidden bg-gradient-to-b from-indigo-50 to-violet-50 border border-indigo-100/50 p-4 rounded-2xl text-left min-h-[90px] flex flex-col justify-end">
              <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-indigo-100/30 blur-xl" />
              <p className="text-sm text-indigo-850 font-extrabold leading-normal relative z-10">
                Take a deep breath, you're doing better than you think. 💛
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Main Content Area ── */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
        
        {/* ── Mobile-only top header bar ── */}
        <header className="flex lg:hidden items-center justify-between flex-shrink-0 -mx-4 -mt-4 px-4 py-3 bg-white border-b border-slate-100 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 flex items-center justify-center text-slate-600 transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
              <img src="/mindmate-logo.png" alt="MindMate" className="w-7 h-7 rounded-lg object-contain" />
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">MindMate</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSOSModal(true)}
              className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 border border-red-100 flex items-center justify-center text-red-500 relative transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-600 rounded-full animate-ping" />
            </button>
            <button 
              onClick={() => setShowAIChatModal(true)}
              className="w-8 h-8 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100/50 flex items-center justify-center text-indigo-600 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs uppercase shadow-inner">
              {user?.name?.[0]}
            </div>
          </div>
        </header>

        {/* ── Desktop-only top bar (search and profile) — unchanged ── */}
        <header className="hidden lg:flex items-center justify-between flex-shrink-0">
          <div className="relative w-80">
            <input 
              type="text" 
              placeholder="Search your journey, insights..." 
              className="w-full text-base bg-slate-50 border border-slate-150 rounded-xl py-2.5 pl-3.5 pr-9 focus:outline-none focus:ring-1 focus:ring-indigo-100 text-slate-650 placeholder:text-slate-400"
            />
            <span className="absolute right-2.5 top-2.5 text-xs text-slate-400 font-extrabold border border-slate-200 rounded px-1.5 py-0.5 leading-none select-none">⌘K</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowSOSModal(true)}
              className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 border border-red-100 flex items-center justify-center text-red-500 relative transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-600 rounded-full animate-ping" />
            </button>
            
            <button 
              onClick={() => setShowAIChatModal(true)}
              className="w-9 h-9 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100/50 flex items-center justify-center text-indigo-600 transition-colors"
            >
              <Sparkles className="w-4 h-4 fill-current animate-pulse" />
            </button>

            <div className="flex items-center gap-2 border border-slate-150 rounded-xl p-1 bg-white">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs uppercase shadow-inner">
                {user?.name?.[0]}
              </div>
              <span className="text-base font-bold text-slate-705 pr-2 pl-0.5">{user?.name?.split(' ')[0]}</span>
            </div>
            
            <button 
              onClick={handleLogout}
              className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-655"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Dynamic page content */}
        <main className="flex-1 min-w-0 flex flex-col pb-10">
          {children}
        </main>

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
              className="relative w-full max-w-lg bg-white rounded-2xl overflow-hidden text-left"
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

        {showSOSModal && <SOSModal token={token} onClose={() => setShowSOSModal(false)} />}

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
      </AnimatePresence>

    </div>
  );
};

export default PageLayout;
