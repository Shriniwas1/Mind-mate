import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, ArrowRight, Video, Camera, ShieldCheck, 
  Zap, Brain, Database, Share2, X, 
  Search, Lock, Milestone
} from 'lucide-react';
import { Button } from '../components/ui/button';

const LandingPage = () => {
  const navigate = useNavigate();
  const [showResearch, setShowResearch] = useState(false);

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.55 }
  };

  const features = [
    {
      icon: Video,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      title: 'Multimodal Journaling',
      desc: 'Sync text sentiment with micro-expression analysis for a high-fidelity emotional log.'
    },
    {
      icon: Camera,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-500',
      title: 'Selfie Mood Detection',
      desc: 'Analyze facial tension and symmetry to detect physiological stress before it manifests.'
    },
    {
      icon: ShieldCheck,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      title: 'Safety Network',
      desc: 'Built-in SOS system with multi-channel emergency contact alerting — in-app, email, or SMS.'
    },
    {
      icon: Brain,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      title: 'AI Wellness Companion',
      desc: 'A compassionate AI assistant powered by cutting-edge language models for real-time support.'
    },
  ];

  return (
    <div className="min-h-screen text-slate-900 font-sans" style={{ background: 'linear-gradient(158deg, hsl(40 28% 97%) 0%, hsl(38 22% 93%) 100%)' }}>
      
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 sticky top-0 bg-white/60 backdrop-blur-md z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5 font-bold text-lg tracking-tight">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary fill-primary/30" />
            </div>
            <span className="text-slate-800">MindMate</span>
          </div>
          <div className="hidden md:flex gap-6 text-base font-bold text-slate-500">
            <a href="#working" className="hover:text-slate-900 transition-colors">Technology</a>
            <a href="#samples" className="hover:text-slate-900 transition-colors">Preview</a>
            <a href="#privacy" className="hover:text-slate-900 transition-colors">Privacy</a>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/auth')}
            className="text-base font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            Log in
          </button>
          <Button
            onClick={() => navigate('/auth')}
            className="rounded-xl bg-slate-900 hover:bg-slate-700 text-white px-5 text-base font-bold"
          >
            Get Started <ArrowRight className="ml-1 w-3.5 h-3.5" />
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <header className="max-w-3xl mx-auto text-center pt-24 pb-20 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-sm font-extrabold uppercase tracking-[0.3em] text-primary/60 mb-5">
            Mental Wellness Platform
          </p>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 text-slate-900 leading-none">
            Introducing<br/>MindMate
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-xl mx-auto leading-relaxed font-medium">
            AI-powered wellness tracking that understands how you feel — not just what you say.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex flex-col sm:flex-row gap-3 justify-center items-center"
        >
          <Button
            onClick={() => navigate('/auth')}
            className="rounded-xl bg-slate-900 text-white px-8 py-5 text-base font-semibold group shadow-lg shadow-black/10"
          >
            Try MindMate <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button
            onClick={() => setShowResearch(true)}
            variant="ghost"
            className="rounded-xl text-base text-slate-500 hover:text-slate-900 hover:bg-white/60 px-8 py-5"
          >
            Read the Research <Share2 className="ml-2 w-3.5 h-3.5" />
          </Button>
        </motion.div>
      </header>

      <main className="max-w-5xl mx-auto px-6 space-y-28 pb-28">

        {/* Why section */}
        <motion.section {...fadeIn} className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-5">
            <h2 className="text-3xl font-bold tracking-tight text-slate-800">Why MindMate?</h2>
            <p className="text-slate-500 leading-relaxed">
              Traditional wellness apps rely solely on manual input — which is often biased, incomplete, or forgotten.
            </p>
            <p className="text-primary font-semibold leading-relaxed">
              MindMate bridges the gap by observing physical cues alongside internal reflections to provide a 360° wellness view.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Search, title: 'Beyond Bias', desc: 'Physical landmarks don\'t lie when words fail.' },
              { icon: Database, title: 'Deep Data', desc: '68 unique facial points tracked locally.' },
              { icon: Lock, title: 'Private First', desc: 'On-device processing. Your images never leave.' },
              { icon: Zap, title: 'Real-time', desc: 'Live emotion analysis during journaling.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-5 bg-white/70 rounded-2xl border border-white/40 shadow-sm">
                <Icon className="text-primary w-4 h-4 mb-2.5" />
                <h4 className="font-extrabold text-base text-slate-800 mb-1">{title}</h4>
                <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Features grid */}
        <section id="working">
          <motion.div {...fadeIn} className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-slate-800 mb-3">Everything you need</h2>
            <p className="text-slate-500">Intelligent tools designed around your mental wellbeing</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                {...fadeIn}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="p-7 bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.iconBg}`}>
                  <f.icon className={`w-5 h-5 ${f.iconColor}`} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{f.title}</h3>
                <p className="text-base text-slate-600 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Interactive preview */}
        <motion.section id="samples" {...fadeIn} className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-800 mb-3">Real-time Analysis Preview</h2>
            <p className="text-slate-500">See how MindMate interprets multimodal data</p>
          </div>
          <div className="grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-slate-200 shadow-lg">
            <div className="bg-white p-8">
              <span className="text-xs font-mono text-slate-450 uppercase tracking-widest font-bold">User Journal Entry</span>
              <p className="mt-4 text-base text-slate-600 italic leading-relaxed">
                "I've been feeling so overwhelmed with the project lately. It feels like no matter how much I work, the list keeps growing. I just want to finish this..."
              </p>
            </div>
            <div className="bg-slate-900 p-8 text-white flex flex-col justify-center">
              <span className="text-xs font-mono text-primary uppercase tracking-widest mb-5 font-bold">AI Insights Engine</span>
              <div className="space-y-3.5">
                <div className="flex justify-between border-b border-white/10 pb-3">
                  <span className="text-base text-slate-400 font-semibold">Detected Stress</span>
                  <span className="text-base text-primary font-extrabold">High (Linguistic)</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-3">
                  <span className="text-base text-slate-400 font-semibold">Facial Symmetry</span>
                  <span className="text-base text-red-400 font-extrabold">Low (Fatigue)</span>
                </div>
                <div className="mt-4 p-4 bg-primary/15 rounded-xl border border-primary/20 text-base">
                  <strong className="text-primary">Recommendation:</strong> <span className="text-slate-300">5-minute Box Breathing & Priority Reset.</span>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Timeline */}
        <motion.section {...fadeIn} className="space-y-10">
          <h3 className="text-3xl font-bold text-center tracking-tight text-slate-800">Project Milestones</h3>
          <div className="relative border-l-2 border-slate-200 ml-4 md:ml-0 md:flex md:border-l-0 md:border-t-2 md:pt-8 md:justify-between">
            {[
              { title: "Concept", date: "Sept 2025", desc: "Multimodal mental health architecture designed." },
              { title: "MindMate Beta", date: "Jan 2026", desc: "First on-device ML facial analysis implemented." },
              { title: "Research Preview", date: "Mar 2026", desc: "Current phase: Testing NLP & Video weights." }
            ].map((m, i) => (
              <div key={i} className="mb-10 ml-6 md:ml-0 md:w-1/4">
                <div className="absolute -left-[9px] md:left-auto md:-top-[9px] w-4 h-4 bg-primary rounded-full" style={{ boxShadow: '0 0 0 4px hsl(163 29% 33% / 0.15)' }} />
                <h4 className="font-bold text-slate-800">{m.title}</h4>
                <p className="text-sm text-primary font-mono font-bold mb-1.5 mt-0.5">{m.date}</p>
                <p className="text-base text-slate-600 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Privacy section */}
        <section id="privacy" className="rounded-2xl p-12 md:p-16 relative overflow-hidden" style={{ background: 'hsl(156 22% 18%)' }}>
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 text-primary mb-5">
              <ShieldCheck className="w-5 h-5" />
              <span className="font-mono text-sm tracking-widest uppercase font-bold">Privacy First Architecture</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white leading-tight">Your data stays<br/>on your device.</h2>
            <ul className="space-y-4">
              <li className="flex gap-3.5 text-slate-300">
                <Zap className="text-primary w-5 h-5 shrink-0 mt-0.5" />
                <span className="text-base leading-relaxed">On-device processing using TensorFlow.js. Facial images are analyzed locally and never transmitted.</span>
              </li>
              <li className="flex gap-3.5 text-slate-300">
                <Database className="text-primary w-5 h-5 shrink-0 mt-0.5" />
                <span className="text-base leading-relaxed">Raw images are deleted immediately after vector extraction. Only numerical scores are stored.</span>
              </li>
              <li className="flex gap-3.5 text-slate-300">
                <Lock className="text-primary w-5 h-5 shrink-0 mt-0.5" />
                <span className="text-base leading-relaxed">Emergency contact alerts require explicit user confirmation before sending.</span>
              </li>
            </ul>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 py-10 border-t border-slate-200/60 text-base text-slate-500 flex flex-col md:flex-row justify-between items-center gap-6 font-medium">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
            <Heart className="w-3 h-3 text-primary" />
          </div>
          <span className="font-bold text-slate-600">MindMate</span>
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-slate-700 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-slate-700 transition-colors">Terms of Use</a>
        </div>
        <span>© 2026 MindMate Wellness Labs</span>
      </footer>

      {/* Research Modal */}
      <AnimatePresence>
        {showResearch && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowResearch(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-y-auto"
              style={{ boxShadow: 'var(--shadow-xl)' }}
            >
              <div className="sticky top-0 bg-white/90 backdrop-blur-md px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">MindMate Research Documentation</h2>
                <button
                  onClick={() => setShowResearch(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              <div className="p-8 md:p-12 space-y-12">
                {/* Technical Methodology */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-sm">
                    <Zap className="w-4 h-4" /> Technical Methodology
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                      <h4 className="font-bold mb-2 flex items-center gap-2 text-slate-800">
                        <Camera className="w-4 h-4 text-primary" /> Facial Landmark Analysis
                      </h4>
                      <p className="text-slate-650 text-base leading-relaxed">
                        Utilizing <strong className="text-slate-700">face-api.js</strong> and <strong className="text-slate-700">TensorFlow.js</strong>, MindMate detects 68 distinct facial landmarks. We measure micro-expressions and muscle tension around the brow and mouth to calculate a baseline stress score.
                      </p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                      <h4 className="font-bold mb-2 flex items-center gap-2 text-slate-800">
                        <Brain className="w-4 h-4 text-primary" /> NLP Sentiment Engine
                      </h4>
                      <p className="text-slate-655 text-base leading-relaxed">
                        Our backend uses DeBERTa-based classification to distinguish between "temporary frustration" and "chronic anxiety" by analyzing linguistic patterns and sentiment density in journal entries.
                      </p>
                    </div>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                    <h4 className="font-bold mb-2 flex items-center gap-2 text-slate-800">
                      <Milestone className="w-4 h-4 text-primary" /> The Weighting Algorithm
                    </h4>
                    <p className="text-slate-650 text-base leading-relaxed">
                      We weight <strong className="text-slate-700">Journal Text at 40%</strong> (representing conscious reflection) and <strong className="text-slate-700">Video at 20%</strong> (subconscious physiological cues) to prevent individual outliers from skewing the daily mood score.
                    </p>
                  </div>
                </div>

                {/* Privacy & Ethics */}
                <div className="space-y-6 border-t border-slate-100 pt-10">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold uppercase tracking-widest text-sm">
                    <Lock className="w-4 h-4" /> Privacy & Ethics
                  </div>
                  <div className="space-y-4">
                    {[
                      { title: 'On-Device Inference', body: "The \"Heavy Lifting\" happens in your browser. Your facial images never reach our database; we only transmit numerical vectors." },
                      { title: 'Data Minimization', body: "MindMate strictly stores the Result (e.g., 0.75 happiness score) and never the Source (the actual photo or video file)." },
                      { title: 'Informed Consent', body: "Our \"Safety Net\" protocol only notifies emergency contacts after the user provides explicit permission following a critical detection event." },
                    ].map(({ title, body }) => (
                      <div key={title} className="flex gap-5 p-5 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="font-bold text-slate-800 min-w-[150px] text-base">{title}</div>
                        <p className="text-base text-slate-600 leading-relaxed">{body}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-center pb-4 text-slate-400 text-sm">
                  © 2026 MindMate Wellness Labs | Research Preview v1.0.4
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;