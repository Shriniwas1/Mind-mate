const express = require('express');
const Mood = require('../models/Mood');
const authenticate = require('../middleware/auth');
const router = express.Router();

// Create mood entry
router.post('/', authenticate, async (req, res) => {
  try {
    const { textScore, selfieScore, videoScore, quizScore, dominantEmotion, type, metadata } = req.body;

    // Calculate final mood score using only the scores that were actually provided
    const scores = [
      { val: textScore,  weight: 0.4 },
      { val: selfieScore, weight: 0.3 },
      { val: videoScore,  weight: 0.2 },
      { val: quizScore,   weight: 0.1 },
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
    let daysNum = parseInt(days, 10);
    if (isNaN(daysNum) || daysNum <= 0) daysNum = 30;
    if (daysNum > 365) daysNum = 365;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const moods = await Mood.find({
      userId: req.userId,
      date: { $gte: startDate },
    }).sort({ date: -1 });

    res.json({ moods });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch mood history', details: error.message });
  }
});

// ─── Helper: group mood entries by local calendar day ─────────────────────────
// Returns an array of { date, score, emotion } — one representative point per day.
// "score" is the average of all entries that day.
// "emotion" is the most frequent emotion of the day.
// This prevents a single day with many selfies from dominating the 30-day average.
function groupByDay(moods) {
  const dayMap = new Map();

  moods.forEach(m => {
    // Use UTC date string as key so timezone quirks don't split a day
    const dayKey = new Date(m.date).toISOString().slice(0, 10);
    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, { date: m.date, scores: [], emotions: [] });
    }
    const entry = dayMap.get(dayKey);
    entry.scores.push(m.finalMoodScore);
    entry.emotions.push(m.dominantEmotion || 'neutral');
  });

  const days = [];
  for (const [, entry] of dayMap) {
    const avgScore = entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length;

    // Pick the most frequent emotion of the day
    const freq = {};
    let topEmotion = 'neutral';
    let topCount = 0;
    entry.emotions.forEach(e => {
      freq[e] = (freq[e] || 0) + 1;
      if (freq[e] > topCount) { topCount = freq[e]; topEmotion = e; }
    });

    days.push({
      date: entry.date,
      score: avgScore,
      emotion: topEmotion,
      entryCount: entry.scores.length,
    });
  }

  // Keep chronological order
  days.sort((a, b) => new Date(a.date) - new Date(b.date));
  return days;
}

// Get mood trends
// ─── FIX: now uses daily aggregation instead of flat average ──────────────────
// Problem with the old approach: if a user clicks 3 sad selfies in one day alongside
// 1 happy selfie, the simple average gives each entry equal weight. So 3×sad + 1×happy
// barely moves the needle. With daily grouping, today becomes ONE data point (the avg
// of all today's entries), so a predominantly-sad day is properly reflected.
// This also prevents a single high-volume testing day from permanently distorting the
// 30-day average.
router.get('/trends', authenticate, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    let daysNum = parseInt(days, 10);
    if (isNaN(daysNum) || daysNum <= 0) daysNum = 7;
    if (daysNum > 365) daysNum = 365;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const moods = await Mood.find({
      userId: req.userId,
      date: { $gte: startDate },
    }).sort({ date: 1 });

    // Group into one data point per calendar day for overall average calculation
    const dailyPoints = groupByDay(moods);

    // Average of daily averages (each day counts equally regardless of entry count)
    const averageScore = dailyPoints.length > 0
      ? dailyPoints.reduce((sum, d) => sum + d.score, 0) / dailyPoints.length
      : 0;

    // Map each individual entry for the chart to show a detailed timeline and smooth curve
    const trendsMapped = moods.map(m => ({
      _id: m._id,
      date: m.date,
      score: m.finalMoodScore,
      dominantEmotion: m.dominantEmotion,
      type: m.type,
    }));

    res.json({
      trends: trendsMapped,     // all individual entries for the timeline chart
      averageScore,             // average of daily averages for the dashboard ring
      rawEntryCount: moods.length,
      dailyPointCount: dailyPoints.length,
    });
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
