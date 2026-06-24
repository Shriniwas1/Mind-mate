const express = require('express');
const Quiz = require('../models/Quiz');
const Mood = require('../models/Mood');
const authenticate = require('../middleware/auth');
const { checkAndTriggerMoodAlerts } = require('../utils/moodAlertHelper');
const router = express.Router();

// Dynamic quiz questions
const quizQuestions = [
  [
    { id: 'sleep', question: 'How would you rate your sleep quality this week?', options: ['Poor', 'Fair', 'Good', 'Excellent'] },
    { id: 'anxiety', question: 'How often did you feel anxious or worried?', options: ['Very Often', 'Often', 'Sometimes', 'Rarely'] },
    { id: 'social', question: 'How much social interaction did you have?', options: ['Very Little', 'Some', 'Moderate', 'A Lot'] },
    { id: 'energy', question: 'What was your energy level like?', options: ['Very Low', 'Low', 'Moderate', 'High'] },
  ],
  [
    { id: 'stress', question: 'How stressed have you been feeling?', options: ['Extremely', 'Very', 'Moderately', 'Not at all'] },
    { id: 'motivation', question: 'How motivated have you felt?', options: ['Not motivated', 'Slightly', 'Moderately', 'Very motivated'] },
    { id: 'focus', question: 'How well could you focus on tasks?', options: ['Poorly', 'Somewhat', 'Well', 'Very well'] },
    { id: 'appetite', question: 'How has your appetite been?', options: ['Very poor', 'Poor', 'Normal', 'Good'] },
  ],
  [
    { id: 'mood_swings', question: 'Did you experience mood swings?', options: ['Frequently', 'Sometimes', 'Rarely', 'Never'] },
    { id: 'joy', question: 'How often did you feel joy or happiness?', options: ['Rarely', 'Sometimes', 'Often', 'Very Often'] },
    { id: 'exercise', question: 'How much did you exercise?', options: ['Not at all', 'A little', 'Moderately', 'A lot'] },
    { id: 'relaxation', question: 'How much time did you spend on relaxation?', options: ['None', 'Little', 'Some', 'Plenty'] },
  ],
];

// Get quiz questions
router.get('/questions', authenticate, async (req, res) => {
  try {
    // Get count of previous quizzes to rotate questions
    const quizCount = await Quiz.countDocuments({ userId: req.userId });
    const questionSet = quizQuestions[quizCount % quizQuestions.length];
    
    res.json({ questions: questionSet });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch questions', details: error.message });
  }
});

// Submit quiz
router.post('/submit', authenticate, async (req, res) => {
  try {
    const { answers } = req.body;

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'Answers object is required' });
    }

    // Calculate quiz score (0-3 scale, normalize to -1 to 1)
    const scoreMapping = { 0: -0.8, 1: -0.3, 2: 0.3, 3: 0.8 };
    let totalScore = 0;
    let count = 0;

    for (const [key, value] of Object.entries(answers)) {
      totalScore += scoreMapping[value] || 0;
      count++;
    }

    const quizScore = count > 0 ? totalScore / count : 0;

    const now = new Date();
    const week = Math.ceil((now.getDate()) / 7);
    const year = now.getFullYear();

    const quiz = new Quiz({
      userId: req.userId,
      answers,
      quizScore,
      week,
      year,
    });

    await quiz.save();

    // Create mood entry
    const mood = new Mood({
      userId: req.userId,
      quizScore,
      finalMoodScore: quizScore,
      type: 'quiz',
    });
    await mood.save();

    // Trigger mood update checks
    checkAndTriggerMoodAlerts(req.userId).catch(err => console.error('❌ Mood check error:', err));

    res.status(201).json({ message: 'Quiz submitted', quizScore, mood });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit quiz', details: error.message });
  }
});

module.exports = router;
