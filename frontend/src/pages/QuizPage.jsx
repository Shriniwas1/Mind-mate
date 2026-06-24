import React, { useState, useEffect } from 'react';
import { useAuth, API } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { CheckCircle, Loader2, BrainCircuit, PartyPopper, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { questionBank } from '../data/questions';

const QuizPage = () => {
  const [activeQuestions, setActiveQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0); // Track current question
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    generateAdaptiveQuiz();
  }, []);

  const generateAdaptiveQuiz = async () => {
    setLoading(true);
    try {
      const historyRes = await axios.get(`${API}/mood/trends?days=7&t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const trends = historyRes.data.trends || [];
      const lowCategories = identifyWeakCategories(trends);
      const selected = selectQuestions(lowCategories);
      setActiveQuestions(selected);
    } catch (error) {
      console.error('Quiz initialization error:', error);
      setActiveQuestions(shuffleArray(questionBank).slice(0, 10));
    } finally {
      setLoading(false);
    }
  };

  const identifyWeakCategories = (trends) => {
    if (trends.length === 0) return ["Mood"];
    const avgMood = trends.reduce((acc, curr) => acc + curr.score, 0) / trends.length;
    return avgMood < 0 ? ["Mood", "Stress", "Safety"] : ["Energy", "Social"];
  };

  const selectQuestions = (priorityCategories) => {
    let pool = [...questionBank];
    const finalSelection = [];
    const priorityPool = pool.filter(q => priorityCategories.includes(q.category));
    finalSelection.push(...shuffleArray(priorityPool).slice(0, 5));
    pool = pool.filter(q => !finalSelection.find(f => f.id === q.id));
    finalSelection.push(...shuffleArray(pool).slice(0, 5));
    return shuffleArray(finalSelection);
  };

  const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: parseInt(value) }));
    
    // Auto-advance after a small delay so user sees their selection
    if (currentIndex < activeQuestions.length - 1) {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 400);
    }
  };

  const submitQuiz = async () => {
    setSubmitting(true);
    try {
      const formattedAnswers = {};
      activeQuestions.forEach(q => {
        const categoryKey = q.category.toLowerCase();
        formattedAnswers[categoryKey] = answers[q.id];
      });

      const totalQuestions = activeQuestions.length;
      const totalScore = Object.values(answers).reduce((a, b) => a + b, 0);
      const quizScore = parseFloat((totalScore / totalQuestions).toFixed(2));

      const now = new Date();
      const submissionPayload = {
        answers: formattedAnswers,
        quizScore: quizScore,
        week: getWeekNumber(now),
        year: now.getFullYear()
      };

      await axios.post(`${API}/quiz/submit`, submissionPayload, { 
        headers: { Authorization: `Bearer ${token}` } 
      });

      setShowSuccessAlert(true);
      setTimeout(() => {
        setShowSuccessAlert(false);
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save quiz');
      setSubmitting(false);
    }
  };

  const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const getCategoryColor = (category) => ({
    Mood: '#3A6B5E', Stress: '#F59E0B', Safety: '#EF4444',
    Energy: '#8B5CF6', Social: '#0EA5E9'
  }[category] || '#475569');

  const renderOptions = (q) => {
    let options = [];
    if (q.type === "Likert") options = ["Not at all", "Slightly", "Moderately", "Very much", "Extremely"];
    else if (q.type === "Binary") options = ["No", "Yes"];
    else options = ["Never", "Rarely", "Sometimes", "Often", "Always"];

    return options.map((opt, i) => {
      const isSelected = answers[q.id] === i;
      return (
        <div
          key={i}
          className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 cursor-pointer
            ${isSelected
              ? 'border-primary bg-primary/5'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
        >
          <RadioGroupItem value={i.toString()} id={`q-${q.id}-${i}`} className="flex-shrink-0 w-4.5 h-4.5" />
          <Label
            htmlFor={`q-${q.id}-${i}`}
            className={`flex-1 cursor-pointer font-bold text-base transition-colors ${isSelected ? 'text-primary' : 'text-slate-705'}`}
          >
            {opt}
          </Label>
          {isSelected && <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />}
        </div>
      );
    });
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-page gap-4">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
        <BrainCircuit className="w-6 h-6 text-primary animate-pulse" />
      </div>
      <div className="text-center">
        <p className="text-base font-bold text-slate-700">Tailoring your quiz…</p>
        <p className="text-sm text-slate-450 mt-1.5">Analyzing your recent mood patterns</p>
      </div>
    </div>
  );

  const currentQ = activeQuestions[currentIndex];
  const isLastQuestion = currentIndex === activeQuestions.length - 1;
  const progress = ((currentIndex + 1) / activeQuestions.length) * 100;
  const answeredCount = Object.keys(answers).length;
  const catColor = getCategoryColor(currentQ?.category);

  return (
    <PageLayout activeTab="quiz">
      <div className="flex-1 flex flex-col items-center justify-center py-6 px-4">
      
      <AnimatePresence>
        {showSuccessAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 16 }}
              className="bg-white p-10 rounded-2xl text-center max-w-sm w-full"
              style={{ boxShadow: 'var(--shadow-xl)' }}
            >
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
                <PartyPopper className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">All done!</h2>
              <p className="text-slate-500 text-base">Your check-in has been recorded.</p>
              <div className="mt-6 flex justify-center">
                <Loader2 className="animate-spin text-primary/40 w-6 h-6" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-xl w-full space-y-6">

        {/* Header */}
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-primary/45 font-bold mb-2">MindMate</p>
          <h1 className="text-3xl font-extrabold text-slate-800">Wellness Check-In</h1>
          <p className="text-base text-slate-500 mt-1.5">Adaptive questions based on your patterns</p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-450">
              Question {currentIndex + 1} of {activeQuestions.length}
            </span>
            <span className="text-sm font-bold text-slate-450">
              {answeredCount} answered
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: catColor }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22 }}
          >
            <Card
              className="rounded-2xl border border-slate-100 bg-white overflow-hidden"
              style={{ boxShadow: 'var(--shadow-md)' }}
            >
              {/* Category accent strip */}
              <div className="h-1" style={{ background: catColor }} />

              <div className="p-5 sm:p-8 md:p-10">
                <div className="mb-6">
                  <span
                    className="inline-block text-xs font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4"
                    style={{ background: `${catColor}15`, color: catColor }}
                  >
                    {currentQ.category}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 leading-snug">
                    {currentQ.text}
                  </h3>
                </div>

                <RadioGroup
                  value={answers[currentQ.id]?.toString() || ""}
                  onValueChange={(value) => handleAnswerChange(currentQ.id, value)}
                  className="grid grid-cols-1 gap-2.5"
                >
                  {renderOptions(currentQ)}
                </RadioGroup>

                {/* Navigation */}
                <div className="mt-8 flex justify-between items-center pt-6 border-t border-slate-100">
                  <Button
                    variant="ghost"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(prev => prev - 1)}
                    className="rounded-xl gap-2 text-slate-500 hover:text-slate-800 disabled:opacity-30 text-base font-bold"
                  >
                    <ChevronLeft size={18} /> Previous
                  </Button>

                  {isLastQuestion ? (
                    <Button
                      onClick={submitQuiz}
                      disabled={submitting || answers[currentQ.id] === undefined}
                      className="rounded-xl px-7 py-5 font-bold text-base"
                      style={{ background: '#1e293b', color: '#fff' }}
                    >
                      {submitting
                        ? <><Loader2 className="animate-spin mr-2 w-4 h-4" /> Saving…</>
                        : <><CheckCircle className="mr-2 w-4 h-4" /> Finish</>
                      }
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      disabled={answers[currentQ.id] === undefined}
                      onClick={() => setCurrentIndex(prev => prev + 1)}
                      className="rounded-xl gap-2 border-slate-200 text-slate-700 disabled:opacity-30 text-base font-bold"
                    >
                      Next <ChevronRight size={18} />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
        </div>
      </div>
    </PageLayout>
  );
};

export default QuizPage;