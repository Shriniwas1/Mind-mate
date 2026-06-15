import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
// Added Eye and EyeOff icons
import { Heart, Mail, Lock, User, Phone, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // State for password visibility
  const [showPassword, setShowPassword] = useState(false);
  
  // Emergency Contact States
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [hasApp, setHasApp] = useState(false);

  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password, rememberMe);
        toast.success('Welcome back!');
      } else {
        const emergencyData = {
          name: contactName,
          phone: contactPhone,
          email: contactEmail,
          hasApp
        };
        await register(email, password, name, emergencyData);
        toast.success('Account created successfully!');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-page">
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
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-5 border border-primary/10"
          >
            <Heart className="w-7 h-7 text-primary" />
          </motion.div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-1.5">MindMate</h1>
          <p className="text-base text-slate-500 font-semibold">Your companion for mental wellness</p>
        </div>

        <Card
          className="rounded-2xl border border-slate-100 bg-white overflow-hidden"
          style={{ boxShadow: 'var(--shadow-lg)' }}
        >
          {/* Tab switcher */}
          <div className="flex border-b border-slate-100">
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
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="p-7 space-y-4">
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
              <Label htmlFor="password" className="text-sm font-bold text-slate-550 uppercase tracking-wide">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
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
              className="w-full rounded-xl py-5 text-base font-bold mt-2"
              style={{ background: '#1e293b', color: '#fff' }}
            >
              {loading
                ? 'Processing…'
                : isLogin ? 'Log In' : 'Create Account & Set Safety Net'
              }
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};

export default AuthPage;