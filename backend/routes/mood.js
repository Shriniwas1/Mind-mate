const express = require('express');
const Mood = require('../models/Mood');
const authenticate = require('../middleware/auth');
const router = express.Router();

// Create mood entry
router.post('/', authenticate, async (req, res) => {
  try {
    const { textScore, selfieScore, videoScore, quizScore, dominantEmotion, type, metadata } = req.body;

    // Calculate final mood score
    const scores = [
      { val: textScore, weight: 0.4 },
      { val: selfieScore, weight: 0.3 },
      { val: videoScore, weight: 0.2 },
      { val: quizScore, weight: 0.1 },
    ];

    let weightedSum = 0;
    let activeWeight = 0;

    scores.forEach(item => {
      if (typeof item.val === 'number' && !isNaN(item.val)) {
        weightedSum += item.val * item.weight;
        activeWeight += item.weight;
      }
    });

    const finalMoodScore = activeWeight === 0 ? 0 : weightedSum / activeWeight;

    const mood = new Mood({
      userId: req.userId,
      textScore,
      selfieScore,
      videoScore,
      quizScore,
      finalMoodScore,
      dominantEmotion: dominantEmotion || 'neutral',
      type: type || 'combined',
      metadata: metadata || {},
    });

    await mood.save();

    res.status(201).json({ message: 'Mood entry created', mood });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create mood entry', details: error.message });
  }
});

// Get mood history
router.get('/history', authenticate, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const moods = await Mood.find({
      userId: req.userId,
      date: { $gte: startDate },
    }).sort({ date: -1 });

    res.json({ moods });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch mood history', details: error.message });
  }
});

// Get mood trends
router.get('/trends', authenticate, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const moods = await Mood.find({
      userId: req.userId,
      date: { $gte: startDate },
    }).sort({ date: 1 });

    // Calculate trends
    const trendData = moods.map(m => ({
      date: m.date,
      score: m.finalMoodScore,
      emotion: m.dominantEmotion,
    }));

    const avgScore = moods.length > 0
      ? moods.reduce((sum, m) => sum + m.finalMoodScore, 0) / moods.length
      : 0;

    res.json({ trends: trendData, averageScore: avgScore });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch mood trends', details: error.message });
  }
});

// Check for critical state
router.get('/critical-check', authenticate, async (req, res) => {
  try {
    const recentMoods = await Mood.find({ userId: req.userId })
      .sort({ date: -1 })
      .limit(5);

    if (recentMoods.length < 3) {
      return res.json({ isCritical: false });
    }

    const avgRecentScore = recentMoods.reduce((sum, m) => sum + m.finalMoodScore, 0) / recentMoods.length;
    const hasNegativeEmotions = recentMoods.some(m => 
      ['sad', 'angry', 'fearful'].includes(m.dominantEmotion)
    );

    const isCritical = avgRecentScore < -0.4 && hasNegativeEmotions;

    res.json({ isCritical, averageScore: avgRecentScore });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check critical state', details: error.message });
  }
});

module.exports = router;
