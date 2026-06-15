import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { Phone, User, Heart, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const OnboardingPage = () => {
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [hasApp, setHasApp] = useState(false);
  const [loading, setLoading] = useState(false);

  // FIXED: Added 'user' to the destructuring here
  const { updateProfile, user } = useAuth(); 
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // We pass the existing user name and the completion flag
      await updateProfile({
        name: user?.name, // This now works because 'user' is defined
        emergencyContact: {
          name: contactName,
          phone: contactPhone,
          hasApp,
        },
        profileCompleted: true, 
      });

      toast.success('Profile setup complete!');
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Onboarding error:', error);
      // More descriptive error message
      toast.error(error.response?.data?.details || 'Failed to save emergency contact');
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
        className="w-full max-w-lg"
      >
        {/* Brand header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-5 border border-primary/10"
          >
            <Heart className="w-6 h-6 text-primary" />
          </motion.div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-1.5">Welcome to MindMate</h1>
          <p className="text-base text-slate-500 font-semibold">One last step — let's set up your safety net</p>
        </div>

        <Card
          className="rounded-2xl border border-slate-100 bg-white overflow-hidden"
          style={{ boxShadow: 'var(--shadow-lg)' }}
        >
          {/* Section header */}
          <div className="px-8 pt-8 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 leading-none">Emergency Contact</h2>
                <p className="text-sm text-slate-500 mt-1">Someone who can be reached if you need support</p>
              </div>
            </div>
            <p className="text-base text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
              This person will only be contacted if you choose to send an SOS alert. Your privacy is always protected.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="contactName" className="text-sm font-bold text-slate-550 uppercase tracking-wide">Contact Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="contactName"
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="pl-10 rounded-xl border-slate-200 bg-slate-50 focus-visible:bg-white text-base h-11"
                  placeholder="e.g., Mom, Best Friend"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contactPhone" className="text-sm font-bold text-slate-550 uppercase tracking-wide">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="contactPhone"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="pl-10 rounded-xl border-slate-200 bg-slate-50 focus-visible:bg-white text-base h-11"
                  placeholder="+91XXXXXXXXXX"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center space-x-3">
                <Switch
                  id="hasApp"
                  checked={hasApp}
                  onCheckedChange={setHasApp}
                />
                <Label htmlFor="hasApp" className="cursor-pointer text-base text-slate-655 font-bold">
                  This contact has MindMate installed
                </Label>
              </div>
            </div>

            <div className={`p-4 rounded-xl border text-base flex items-center gap-2.5 ${
              hasApp
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                : 'bg-blue-50 border-blue-100 text-blue-700'
            }`}>
              <span>{hasApp ? '✅' : '📱'}</span>
              <p className="text-sm font-semibold">
                {hasApp
                  ? 'They will receive in-app notifications'
                  : 'They will receive SMS alerts when needed'}
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-5 text-base font-bold mt-2"
              style={{ background: '#1e293b', color: '#fff' }}
            >
              {loading ? 'Saving…' : 'Complete Setup & Go to Dashboard'}
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};

export default OnboardingPage;