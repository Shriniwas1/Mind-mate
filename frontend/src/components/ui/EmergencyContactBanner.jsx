import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext'; 
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Switch } from './switch';
import { User, Phone, Mail, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const EmergencyContactBanner = ({ forceShow = false, onComplete }) => {
  const { user, updateProfile } = useAuth();
  const [contactName, setContactName] = useState(user?.emergencyContact?.name || '');
  const [contactPhone, setContactPhone] = useState(user?.emergencyContact?.phone || '');
  const [contactEmail, setContactEmail] = useState(user?.emergencyContact?.email || '');
  const [hasApp, setHasApp] = useState(user?.emergencyContact?.hasApp || false);
  const [loading, setLoading] = useState(false);

  const shouldHide = !user || (!forceShow && (user.profileCompleted === true || !!user.emergencyContact?.name));

  if (shouldHide) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate all 3 required fields
    if (!contactName || !contactPhone || !contactEmail) {
      toast.error("Please fill in all contact details");
      return;
    }
    
    setLoading(true);
    try {
      await updateProfile({
        emergencyContact: { 
          name: contactName, 
          phone: contactPhone,
          email: contactEmail, // SENDING EMAIL TO BACKEND
          hasApp: hasApp 
        },
        profileCompleted: true
      });
      toast.success("Safety profile updated!");
      if (onComplete) onComplete();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save contact details.");
      console.error("Banner Submit Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Context note */}
      <p className="text-sm text-slate-500 leading-relaxed mb-5">
        Add a trusted person who can be notified if you trigger an SOS. Your data is always private.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <User className="w-3 h-3" /> Contact Name
            </Label>
            <Input 
              value={contactName} 
              onChange={(e) => setContactName(e.target.value)} 
              placeholder="e.g. Mom" 
              className="rounded-xl border-slate-200 bg-slate-50 focus-visible:bg-white text-sm h-11" 
              required 
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <Phone className="w-3 h-3" /> Phone Number
            </Label>
            <Input 
              value={contactPhone} 
              onChange={(e) => setContactPhone(e.target.value)} 
              placeholder="+91..." 
              className="rounded-xl border-slate-200 bg-slate-50 focus-visible:bg-white text-sm h-11" 
              required 
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <Mail className="w-3 h-3" /> Contact Email
            </Label>
            <Input 
              type="email"
              value={contactEmail} 
              onChange={(e) => setContactEmail(e.target.value)} 
              placeholder="contact@email.com" 
              className="rounded-xl border-slate-200 bg-slate-50 focus-visible:bg-white text-sm h-11" 
              required 
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center space-x-3">
            <Switch 
              id="hasApp-feature"
              checked={hasApp} 
              onCheckedChange={setHasApp} 
            />
            <Label htmlFor="hasApp-feature" className="text-sm font-medium text-slate-600 cursor-pointer">
              Contact has MindMate installed
            </Label>
          </div>
        </div>

        <Button 
          type="submit" 
          disabled={loading} 
          className="w-full rounded-xl py-5 font-semibold text-sm"
          style={{ background: '#1e293b', color: '#fff' }}
        >
          <ShieldCheck className="w-4 h-4 mr-2" />
          {loading ? "Updating…" : "Save Emergency Contact"}
        </Button>
      </form>
    </div>
  );
};

export default EmergencyContactBanner;