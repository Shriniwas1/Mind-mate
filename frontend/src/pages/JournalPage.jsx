import React, { useState, useRef, useEffect } from 'react';
import { useAuth, API } from '../context/AuthContext';
import PageLayout from '../components/PageLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import {
  Video, Loader2, CheckCircle, History, ChevronDown,
  Calendar, Lightbulb, Activity, Quote, Plus, Brain, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { loadVisionModels, startLiveAnalysis, stopLiveAnalysis } from '../utils/visionAnalysis';

/* ─── Emotion → accent color map ─────────────────────────────── */
const EMOTION_COLORS = {
  Calm:      { bg: '#3A6B5E', text: '#fff', light: '#EEF5F3', border: '#3A6B5E20' },
  Anxious:   { bg: '#D97706', text: '#fff', light: '#FFFBEB', border: '#D9770620' },
  Low:       { bg: '#6366F1', text: '#fff', light: '#EEF2FF', border: '#6366F120' },
  Distressed:{ bg: '#DC2626', text: '#fff', light: '#FEF2F2', border: '#DC262620' },
  Stressed:  { bg: '#EA580C', text: '#fff', light: '#FFF7ED', border: '#EA580C20' },
  Unstable:  { bg: '#7C3AED', text: '#fff', light: '#F5F3FF', border: '#7C3AED20' },
  Turbulent: { bg: '#DB2777', text: '#fff', light: '#FDF2F8', border: '#DB277720' },
  happy:     { bg: '#3A6B5E', text: '#fff', light: '#EEF5F3', border: '#3A6B5E20' },
  sad:       { bg: '#6366F1', text: '#fff', light: '#EEF2FF', border: '#6366F120' },
  anxious:   { bg: '#D97706', text: '#fff', light: '#FFFBEB', border: '#D9770620' },
};
const defaultColor = { bg: '#475569', text: '#fff', light: '#F8FAFC', border: '#47556920' };

const JournalPage = () => {
  const [journalText, setJournalText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [videoEmotions, setVideoEmotions] = useState([]);

  const [showResults, setShowResults] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const [showHistory, setShowHistory] = useState(false);
  const [journalHistory, setJournalHistory] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const { token } = useAuth();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || API;

  // ── Preload ONNX emotion model on page mount ───────────────
  useEffect(() => {
    console.log('📄 [Journal] Page mounted — preloading ONNX emotion model…');
    loadVisionModels();
    return () => {
      console.log('📄 [Journal] Page unmounting — cleaning up camera & analysis');
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      stopLiveAnalysis();
    };
  }, []);

  // ── Attach stream to <video> AFTER React renders it ────────
  // The <video> element only exists in DOM when isRecording=true.
  // We must wait for the re-render before assigning srcObject.
  useEffect(() => {
    if (isRecording && videoRef.current && streamRef.current) {
      console.log('🎥 [Journal] Video element mounted — attaching stream');
      videoRef.current.srcObject = streamRef.current;

      // Wait for video to be actually playing before starting analysis
      const video = videoRef.current;
      const onPlaying = () => {
        console.log('🎥 [Journal] Video playing — readyState:', video.readyState);
        console.log('🎥 [Journal] Starting live emotion analysis (every 2.5s)…');
        startLiveAnalysis(videoRef, (emotion) => {
          console.log(`🎥 [Journal] Frame analyzed: ${emotion.emotion} (score: ${emotion.moodScore})`);
          setVideoEmotions(prev => [...prev, { ...emotion, timestamp: new Date() }]);
        });
        video.removeEventListener('playing', onPlaying);
      };

      // If already playing, start immediately; otherwise wait
      if (video.readyState >= 2) {
        onPlaying();
      } else {
        video.addEventListener('playing', onPlaying);
      }
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      console.log('📹 [Journal] Requesting camera access…');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log('📹 [Journal] Camera access granted — stream active');
      streamRef.current = stream;
      setIsRecording(true);
    } catch {
      toast.error('Camera access denied');
      console.error('📹 [Journal] Camera access DENIED');
    }
  };

  const stopRecording = () => {
    console.log('🛑 [Journal] Stopping recording…');
    console.log(`🛑 [Journal] Total frames captured: ${videoEmotions.length}`);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    stopLiveAnalysis();
    setIsRecording(false);
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/journal?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setJournalHistory(res.data.journals || []);
    } catch {
      toast.error('Failed to load history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleHistory = () => {
    if (!showHistory) fetchHistory();
    setShowHistory(h => !h);
    setShowResults(false);
  };

  const submitJournal = async () => {
    if (!journalText.trim()) return toast.error('Journal is empty');
    setAnalyzing(true);
    console.log('📝 [Journal] Submitting journal…');
    console.log(`📝 [Journal] Text length: ${journalText.length} chars`);
    console.log(`📝 [Journal] Video emotion frames collected: ${videoEmotions.length}`);
    try {
      const validScores = videoEmotions
        .map(e => e.moodScore)
        .filter(s => typeof s === 'number' && !isNaN(s));
      const averageVideoScore = validScores.length
        ? validScores.reduce((a, b) => a + b, 0) / validScores.length
        : 0;
      console.log(`📝 [Journal] Valid mood scores: [${validScores.join(', ')}]`);
      console.log(`📝 [Journal] Average video score: ${averageVideoScore.toFixed(3)}`);

      const res = await axios.post(
        `${BACKEND_URL}/api/journal`,
        { text: journalText, videoEmotions, averageVideoScore },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAnalysisResult(res.data.journal);
      setShowResults(true);
      toast.success('AI Insights Generated!');
    } catch {
      toast.error('Analysis Failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const resetToEditor = () => {
    setShowResults(false);
    setJournalText('');
    setVideoEmotions([]);
  };

  const primaryEmotion = analysisResult?.textSentiment?.primary || 'Calm';
  const accentColor = EMOTION_COLORS[primaryEmotion] || defaultColor;

  return (
    <PageLayout activeTab="journal">
      <div className="w-full max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-wrap items-end justify-between gap-3"
        >
          <div className="min-w-0">
            <p className="text-sm uppercase tracking-[0.28em] text-indigo-600 font-bold mb-2">MindMate · Neural Synthesis</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-805 leading-none">Weekly Journal</h1>
          </div>
          <div className="flex gap-2">
            {showResults && (
              <Button
                variant="ghost"
                onClick={resetToEditor}
                className="rounded-xl text-base gap-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              >
                <Plus className="w-3.5 h-3.5" /> New Entry
              </Button>
            )}
            <Button
              variant="outline"
              onClick={toggleHistory}
              className="rounded-xl text-base gap-1.5 border-slate-200 text-slate-650 hover:bg-slate-50 bg-white"
              style={{ boxShadow: 'var(--shadow-xs)' }}
            >
              <History className="w-3.5 h-3.5" />
              {showHistory ? 'Back to Entry' : 'History'}
            </Button>
          </div>
        </motion.header>

        <AnimatePresence mode="wait">

          {/* ── HISTORY VIEW ── */}
          {showHistory && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.25 }}
              className="space-y-3"
            >
              <h2 className="text-base font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Past Insights
              </h2>

              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <Loader2 className="animate-spin w-7 h-7 text-slate-300" />
                  <p className="text-base text-slate-400">Loading your reflections…</p>
                </div>
              ) : journalHistory.length === 0 ? (
                <div className="text-center py-24">
                  <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-base text-slate-400">No journal entries yet. Start writing!</p>
                </div>
              ) : (
                journalHistory.map((item) => {
                  const em = item.textSentiment?.primary || 'Calm';
                  const col = EMOTION_COLORS[em] || defaultColor;
                  const isOpen = expandedId === item._id;
                  return (
                    <motion.div
                      key={item._id}
                      layout
                      className="rounded-2xl overflow-hidden border border-slate-100 bg-white"
                      style={{ boxShadow: 'var(--shadow-xs)' }}
                    >
                      <button
                        onClick={() => setExpandedId(isOpen ? null : item._id)}
                        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50/70 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <span
                            className="text-xs font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wide"
                            style={{ background: col.light, color: col.bg }}
                          >
                            {em}
                          </span>
                          <span className="text-base text-slate-500 font-semibold">
                            {new Date(item.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-300 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-4">
                              <blockquote
                                className="italic text-slate-600 text-base leading-relaxed border-l-2 pl-4 font-medium"
                                style={{ borderColor: col.bg }}
                              >
                                "{item.text}"
                              </blockquote>
        
                              {item.textSentiment?.summary && (
                                <div className="rounded-xl p-4 text-sm" style={{ background: col.light }}>
                                  <p className="text-xs uppercase font-extrabold mb-1.5" style={{ color: col.bg }}>AI Summary</p>
                                  <p className="text-slate-750 leading-relaxed font-medium">{item.textSentiment.summary}</p>
                                </div>
                              )}

                              {item.textSentiment?.suggestedTasks?.length > 0 && (
                                <div className="bg-slate-900 rounded-xl p-5">
                                  <p className="text-xs uppercase font-extrabold text-slate-400 mb-3">Recommended Steps</p>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    {item.textSentiment.suggestedTasks.map((t, i) => (
                                      <div key={i} className="bg-white/10 border border-white/10 rounded-xl p-3 flex gap-2 text-sm font-semibold text-slate-200">
                                        <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: col.bg }} />
                                        {t}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}

          {/* ── RESULTS VIEW ── */}
          {!showHistory && showResults && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Reflection card */}
                <Card
                  className="lg:col-span-2 p-7 rounded-2xl border border-slate-100 bg-white flex flex-col"
                  style={{ boxShadow: 'var(--shadow-sm)' }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Quote className="w-4 h-4 text-slate-300" />
                    <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400">Your Reflection</span>
                  </div>
                  <p className="text-base text-slate-600 italic leading-relaxed flex-1">"{analysisResult?.text}"</p>
                  <div className="mt-5 pt-4 border-t border-slate-100 flex gap-4 text-sm text-slate-450 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-4 h-4" /> {videoEmotions.length} frames
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Brain className="w-4 h-4" /> Vision: {analysisResult?.averageVideoScore?.toFixed(2)}
                    </span>
                  </div>
                </Card>

                {/* Sentiment analysis card */}
                <Card
                  className="lg:col-span-3 p-7 rounded-2xl border-0 text-white flex flex-col justify-between"
                  style={{ background: accentColor.bg, boxShadow: 'var(--shadow-md)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 opacity-65" />
                    <span className="text-xs uppercase font-extrabold tracking-widest opacity-65">Sentiment Analysis</span>
                  </div>
                  <div>
                    <h2 className="text-5xl font-black capitalize tracking-tight mb-3 leading-none">{primaryEmotion}</h2>
                    <p className="text-base opacity-90 leading-relaxed max-w-lg font-medium">
                      {analysisResult?.textSentiment?.summary}
                    </p>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <div className="bg-black/15 backdrop-blur px-4 py-3 rounded-xl flex-1">
                      <p className="text-[11px] uppercase font-extrabold opacity-60 mb-1">Confidence</p>
                      <p className="text-2xl font-bold">
                        {analysisResult?.textSentiment?.confidence != null
                          ? `${(analysisResult.textSentiment.confidence * 100).toFixed(0)}%`
                          : '—'}
                      </p>
                    </div>

                    <div className="bg-black/15 backdrop-blur px-4 py-3 rounded-xl flex-1">
                      <p className="text-[11px] uppercase font-extrabold opacity-60 mb-1">Fusion Score</p>
                      <p className="text-2xl font-bold">
                        {analysisResult?.combinedMoodScore?.toFixed(2) ?? '—'}
                      </p>
                    </div>

                    <div className="bg-black/15 backdrop-blur px-4 py-3 rounded-xl flex-1">
                      <p className="text-[11px] uppercase font-extrabold opacity-60 mb-1">Detected</p>
                      <p className="text-lg font-bold leading-tight">
                        {analysisResult?.textSentiment?.label || '—'}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Actionable Steps */}
              <Card className="p-7 rounded-2xl bg-slate-900 border-0" style={{ boxShadow: 'var(--shadow-md)' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl" style={{ background: `${accentColor.bg}30` }}>
                    <Lightbulb className="w-4 h-4" style={{ color: accentColor.bg }} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base">Actionable Steps</h3>
                    <p className="text-sm text-slate-500">Generated by MindMate AI</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(analysisResult?.textSentiment?.suggestedTasks || []).map((task, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      className="bg-white/5 border border-white/8 p-5 rounded-xl hover:bg-white/8 transition-colors"
                    >
                      <span className="font-black text-xl mb-3 block" style={{ color: accentColor.bg }}>0{idx + 1}</span>
                      <p className="text-slate-300 text-base leading-relaxed font-semibold">{task}</p>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* ── EDITOR VIEW ── */}
          {!showHistory && !showResults && (
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 lg:grid-cols-4 gap-5"
            >
              {/* Main editor */}
              <div className="lg:col-span-3">
                <Card
                  className="rounded-2xl border border-slate-100 bg-white overflow-hidden"
                  style={{ boxShadow: 'var(--shadow-sm)' }}
                >
                  <div className="px-7 pt-6 pb-3 border-b border-slate-100">
                    <h2 className="text-base font-bold text-slate-805">Today's reflection</h2>
                    <p className="text-base text-slate-450 mt-0.5 font-semibold">Write freely — your AI companion is listening</p>
                  </div>
                  <div className="p-4">
                    <Textarea
                      value={journalText}
                      onChange={(e) => setJournalText(e.target.value)}
                      placeholder="Reflect on your week while the AI captures your expressions..."
                      className="w-full min-h-[260px] rounded-xl text-base p-5 border-none bg-slate-50/60 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none text-slate-700 placeholder:text-slate-300 leading-relaxed"
                    />
                    <div className="mt-3 flex items-center gap-3">
                      <Button
                        onClick={submitJournal}
                        disabled={analyzing || !journalText.trim()}
                        className="flex-1 rounded-xl py-5 text-base font-bold transition-all"
                        style={journalText.trim() ? { background: '#1e293b', color: '#fff' } : {}}
                      >
                        {analyzing
                          ? <><Loader2 className="animate-spin mr-2 w-4 h-4" /> Synthesizing…</>
                          : <><CheckCircle className="mr-2 w-4 h-4" /> Save & Analyze</>
                        }
                      </Button>
                      <span className="text-base text-slate-400 whitespace-nowrap font-mono">
                        {journalText.length} chars
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Vision Sync sidebar */}
              <div className="lg:col-span-1">
                <Card
                  className="rounded-2xl border border-slate-100 bg-white sticky top-8"
                  style={{ boxShadow: 'var(--shadow-sm)' }}
                >
                  <div className="p-5">
                    <h2 className="text-base font-bold text-slate-805 mb-3 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-slate-400" /> Vision Sync
                    </h2>
                    <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-square mb-4">
                      {isRecording
                        ? <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                        : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/20">
                            <Video className="w-8 h-8" />
                            <p className="text-base font-mono">Camera off</p>
                          </div>
                        )
                      }
                      {isRecording && (
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-red-500 text-white text-sm font-bold px-2 py-1 rounded-full uppercase">
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Live
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={isRecording ? stopRecording : startRecording}
                      variant={isRecording ? 'destructive' : 'outline'}
                      className="w-full rounded-xl py-4 text-sm font-semibold tracking-wide border-slate-200"
                    >
                      {isRecording ? 'Stop Sync' : 'Start Vision AI'}
                    </Button>
                    <p className="text-sm text-center text-slate-400 mt-2.5 font-mono tracking-wider font-bold">
                      {videoEmotions.length} FRAMES CAPTURED
                    </p>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </PageLayout>
  );
};

export default JournalPage;