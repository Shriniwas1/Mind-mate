import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { Mail, Lock, User, Phone, ShieldAlert, Eye, EyeOff, ArrowLeft, KeyRound, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

// ─── Password strength helper ─────────────────────────────────────────────────
const getStrength = (pw) => {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: '', color: '' },
    { label: 'Very Weak', color: '#ef4444' },
    { label: 'Weak', color: '#f97316' },
    { label: 'Fair', color: '#eab308' },
    { label: 'Strong', color: '#22c55e' },
    { label: 'Very Strong', color: '#10b981' },
  ];
  return { score, ...map[score] };
};

// ─── OTP 6-box input component ────────────────────────────────────────────────
const OtpInput = ({ value, onChange }) => {
  const inputs = useRef([]);
  const digits = value.split('').concat(Array(6).fill('')).slice(0, 6);

  const handleKey = (e, idx) => {
    if (e.key === 'Backspace') {
      const next = digits.map((d, i) => (i === idx ? '' : d)).join('').trimEnd();
      onChange(next.padEnd(idx > 0 && !digits[idx] ? idx - 1 : idx, '').slice(0, 6).replace(/\s/g, ''));
      if (!digits[idx] && idx > 0) inputs.current[idx - 1]?.focus();
    }
  };

  const handleChange = (e, idx) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1);
    if (!char) return;
    const next = [...digits];
    next[idx] = char;
    onChange(next.join('').replace(/\s/g, ''));
    if (idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, 5);
    inputs.current[focusIdx]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKey(e, i)}
          onPaste={handlePaste}
          className={`w-11 h-13 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all duration-150
            ${d
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 bg-slate-50 text-slate-800'
            }
            focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20`}
          style={{ height: '52px' }}
        />
      ))}
    </div>
  );
};

// ─── Main AuthPage ─────────────────────────────────────────────────────────────
const AuthPage = () => {
  // ── Auth tab state ──
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Emergency Contact States
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [hasApp, setHasApp] = useState(false);

  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Forgot-password flow state ──
  // null | 'email' | 'otp' | 'newpass' | 'done'
  const [forgotStep, setForgotStep] = useState(null);
  const [fpEmail, setFpEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [fpLoading, setFpLoading] = useState(false);

  // Resend cooldown
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const { login, register } = useAuth();
  const strength = getStrength(newPassword);

  // ── Reset forgot-password flow ──
  const resetForgotFlow = () => {
    setForgotStep(null);
    setFpEmail('');
    setOtp('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPw(false);
    setShowConfirmPw(false);
    setCooldown(0);
  };

  // ── Login / Register handler ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password, rememberMe);
        toast.success('Welcome back!');
      } else {
        const emergencyData = { name: contactName, phone: contactPhone, email: contactEmail, hasApp };
        await register(email, password, name, emergencyData);
        toast.success('Account created successfully!');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot password handlers ──
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!fpEmail) return toast.error('Please enter your email');
    setFpLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email: fpEmail });
      toast.success('Check your inbox — a 6-digit code was sent!');
      setForgotStep('otp');
      setCooldown(60);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send code. Try again.');
    } finally {
      setFpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setFpLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email: fpEmail });
      toast.success('A new code has been sent!');
      setOtp('');
      setCooldown(60);
    } catch (err) {
      toast.error('Failed to resend. Try again.');
    } finally {
      setFpLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length < 6) return toast.error('Please enter the complete 6-digit code');
    setFpLoading(true);
    try {
      const res = await axios.post(`${API}/auth/verify-otp`, { email: fpEmail, otp });
      setResetToken(res.data.resetToken);
      toast.success('Code verified!');
      setForgotStep('newpass');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid or expired code');
    } finally {
      setFpLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    setFpLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { resetToken, newPassword });
      toast.success('Password updated! You can now log in.');
      setForgotStep('done');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reset failed. Please start over.');
    } finally {
      setFpLoading(false);
    }
  };

  // ── Slide animation variants ──
  const slideIn = {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
    transition: { duration: 0.25 },
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8FAFC]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Brand header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white mb-5 shadow-lg shadow-indigo-500/10 border border-slate-100"
          >
            <img src="/mindmate-logo.png" alt="MindMate" className="w-10 h-10 object-contain" />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight mb-1.5">
            <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">MindMate</span>
          </h1>
          <p className="text-base text-slate-500 font-semibold">Your companion for mental wellness</p>
        </div>

        <Card
          className="rounded-2xl border border-slate-100 bg-white overflow-hidden"
          style={{ boxShadow: 'var(--shadow-lg)' }}
        >
          {/* ── TAB SWITCHER (hidden during forgot-password flow) ── */}
          <AnimatePresence>
            {!forgotStep && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex border-b border-slate-100"
              >
                {['Log In', 'Sign Up'].map((label, idx) => {
                  const active = (idx === 0) === isLogin;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => { setIsLogin(idx === 0); setShowPassword(false); }}
                      className={`flex-1 py-4 text-base font-bold transition-colors relative ${
                        active ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {label}
                      {active && (
                        <motion.div
                          layoutId="auth-tab-indicator"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
                          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        />
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ══════════════════════════════════════════════════════════════
              FORGOT PASSWORD FLOW
          ══════════════════════════════════════════════════════════════ */}
          <AnimatePresence mode="wait">

            {/* ── STEP 1: Enter email ── */}
            {forgotStep === 'email' && (
              <motion.div key="fp-email" {...slideIn} className="p-7">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <button
                    type="button"
                    onClick={resetForgotFlow}
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors text-slate-500"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Forgot Password</h2>
                    <p className="text-sm text-slate-500">Enter your account email</p>
                  </div>
                </div>

                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                    <KeyRound className="w-7 h-7 text-indigo-500" />
                  </div>
                </div>

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fp-email" className="text-sm font-bold text-slate-550 uppercase tracking-wide">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="fp-email"
                        type="email"
                        value={fpEmail}
                        onChange={(e) => setFpEmail(e.target.value)}
                        className="pl-10 rounded-xl border-slate-200 bg-slate-50 focus-visible:bg-white text-base h-11"
                        placeholder="you@example.com"
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={fpLoading}
                    className="w-full rounded-xl py-5 text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                  >
                    {fpLoading ? 'Sending…' : 'Send Reset Code'}
                  </Button>
                </form>
              </motion.div>
            )}

            {/* ── STEP 2: Enter OTP ── */}
            {forgotStep === 'otp' && (
              <motion.div key="fp-otp" {...slideIn} className="p-7">
                <div className="flex items-center gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => setForgotStep('email')}
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors text-slate-500"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Enter Reset Code</h2>
                    <p className="text-sm text-slate-500 truncate max-w-[220px]">Sent to {fpEmail}</p>
                  </div>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-550 uppercase tracking-wide text-center block">
                      6-Digit Code
                    </Label>
                    <OtpInput value={otp} onChange={setOtp} />
                    <p className="text-xs text-slate-400 text-center">
                      The code expires in 10 minutes
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={fpLoading || otp.length < 6}
                    className="w-full rounded-xl py-5 text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                  >
                    {fpLoading ? 'Verifying…' : 'Verify Code'}
                  </Button>

                  {/* Resend */}
                  <div className="text-center">
                    {cooldown > 0 ? (
                      <p className="text-sm text-slate-400">
                        Resend in <span className="font-bold text-indigo-500">{cooldown}s</span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={fpLoading}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Resend Code
                      </button>
                    )}
                  </div>
                </form>
              </motion.div>
            )}

            {/* ── STEP 3: Set new password ── */}
            {forgotStep === 'newpass' && (
              <motion.div key="fp-newpass" {...slideIn} className="p-7">
                <div className="flex items-center gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => setForgotStep('otp')}
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors text-slate-500"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Set New Password</h2>
                    <p className="text-sm text-slate-500">Choose a strong password</p>
                  </div>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  {/* New password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="new-pw" className="text-sm font-bold text-slate-550 uppercase tracking-wide">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="new-pw"
                        type={showNewPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-10 pr-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:bg-white text-base h-11"
                        placeholder="••••••••"
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Strength meter */}
                    {newPassword && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-1.5 pt-1"
                      >
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className="h-1 flex-1 rounded-full transition-all duration-300"
                              style={{
                                backgroundColor: i <= strength.score ? strength.color : '#E5E7EB',
                              }}
                            />
                          ))}
                        </div>
                        <p className="text-xs font-semibold" style={{ color: strength.color }}>
                          {strength.label}
                        </p>
                      </motion.div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-pw" className="text-sm font-bold text-slate-550 uppercase tracking-wide">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="confirm-pw"
                        type={showConfirmPw ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`pl-10 pr-12 rounded-xl bg-slate-50 focus-visible:bg-white text-base h-11 border-2 transition-colors ${
                          confirmPassword && confirmPassword !== newPassword
                            ? 'border-red-400'
                            : confirmPassword && confirmPassword === newPassword
                            ? 'border-emerald-400'
                            : 'border-slate-200'
                        }`}
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPw(!showConfirmPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword && confirmPassword !== newPassword && (
                      <p className="text-xs text-red-500 font-medium">Passwords don't match</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={fpLoading || newPassword.length < 6 || newPassword !== confirmPassword}
                    className="w-full rounded-xl py-5 text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                  >
                    {fpLoading ? 'Updating…' : 'Update Password'}
                  </Button>
                </form>
              </motion.div>
            )}

            {/* ── SUCCESS STATE ── */}
            {forgotStep === 'done' && (
              <motion.div
                key="fp-done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-7 flex flex-col items-center text-center gap-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center"
                >
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 mb-1">Password Updated!</h2>
                  <p className="text-sm text-slate-500">Your password has been reset successfully. You can now log in with your new password.</p>
                </div>
                <Button
                  type="button"
                  onClick={resetForgotFlow}
                  className="w-full rounded-xl py-5 text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 mt-2"
                >
                  Back to Login
                </Button>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                NORMAL LOGIN / SIGN UP FORM
            ══════════════════════════════════════════════════════════════ */}
            {!forgotStep && (
              <motion.form
                key="auth-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="p-7 space-y-4"
              >
                <AnimatePresence>
                  {!isLogin && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1.5 pb-1">
                        <Label htmlFor="name" className="text-sm font-bold text-slate-550 uppercase tracking-wide">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="pl-10 rounded-xl border-slate-200 bg-slate-50 focus-visible:bg-white text-base h-11"
                            placeholder="Your Full Name"
                            required
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-bold text-slate-550 uppercase tracking-wide">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 rounded-xl border-slate-200 bg-slate-50 focus-visible:bg-white text-base h-11"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-bold text-slate-550 uppercase tracking-wide">Password</Label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => { setForgotStep('email'); setFpEmail(email); }}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:bg-white text-base h-11"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {!isLogin && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 pb-1 space-y-4">
                        <div className="flex items-center gap-2 text-primary font-bold text-sm">
                          <ShieldAlert className="w-4 h-4" />
                          <span className="uppercase tracking-wide">Emergency Contact</span>
                        </div>
                        <div className="space-y-2.5">
                          <Input
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                            className="rounded-xl border-slate-200 bg-slate-50 text-base h-11"
                            placeholder="Contact person name"
                            required
                          />
                          <Input
                            type="tel"
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                            className="rounded-xl border-slate-200 bg-slate-50 text-base h-11"
                            placeholder="Contact phone number"
                            required
                          />
                          <Input
                            type="email"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            className="rounded-xl border-slate-200 bg-slate-50 text-base h-11"
                            placeholder="Contact email address"
                            required
                          />
                        </div>
                        <div className="flex items-center space-x-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                          <Switch id="hasApp" checked={hasApp} onCheckedChange={setHasApp} />
                          <Label htmlFor="hasApp" className="text-sm font-semibold cursor-pointer text-slate-655">
                            This person has a MindMate account
                          </Label>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {isLogin && (
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="checkbox"
                      id="remember"
                      checked={rememberMe}
                      onChange={() => setRememberMe(!rememberMe)}
                      className="w-4 h-4 rounded border-slate-300 accent-primary cursor-pointer"
                    />
                    <Label htmlFor="remember" className="text-base text-slate-600 cursor-pointer font-medium">Remember me</Label>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl py-5 text-base font-bold mt-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                >
                  {loading
                    ? 'Processing…'
                    : isLogin ? 'Log In' : 'Create Account & Set Safety Net'
                  }
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
};

export default AuthPage;