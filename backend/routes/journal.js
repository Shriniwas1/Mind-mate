const express = require('express');
const Journal = require('../models/Journal');
const Mood = require('../models/Mood');
const authenticate = require('../middleware/auth');
const { checkAndTriggerMoodAlerts } = require('../utils/moodAlertHelper');
const { predictEmotion } = require('../middleware/classifier');
const Groq = require('groq-sdk');

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/* ─── Helpers ─────────────────────────────────────────────────── */

function getWeekNumber(date) {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  return Math.ceil((((tempDate - yearStart) / 86400000) + 1) / 7);
}

const LABEL_TO_MOOD_SCORE = {
  'Normal': 0.8,
  'Anxiety': 0.3,
  'Depression': 0.2,
  'Suicidal': 0.05,
  'Stress': 0.3,
  'Bipolar': 0.35,
  'Personality disorder': 0.3,
};

const LABEL_TO_PRIMARY = {
  'Normal': 'Calm',
  'Anxiety': 'Anxious',
  'Depression': 'Low',
  'Suicidal': 'Distressed',
  'Stress': 'Stressed',
  'Bipolar': 'Unstable',
  'Personality disorder': 'Turbulent',
};

/* ─── Groq: summary + 3 tasks ────────────────────────────────── */
// async function getGroqInsights(text, emotionLabel) {
//   console.log('🤖 Calling Groq with label:', emotionLabel);
//   const prompt = `You are a compassionate mental health assistant. A user wrote the following journal entry and their dominant emotion was detected as "${emotionLabel}".

// Journal: "${text}"

// Respond ONLY with a valid JSON object (no markdown, no explanation) in this exact shape:
// {
//   "summary": "A 1-2 sentence empathetic summary of how the user is feeling.",
//   "suggestedTasks": [
//     "First specific, actionable self-care task.",
//     "Second specific, actionable self-care task.",
//     "Third specific, actionable self-care task."
//   ]
// }`;

//   const completion = await groq.chat.completions.create({
//     messages: [{ role: 'user', content: prompt }],
//     model: 'llama3-8b-8192',
//     temperature: 0.6,
//     max_tokens: 300,
//   });

//   const raw = completion.choices[0]?.message?.content?.trim() || '{}';
//   const clean = raw.replace(/```json|```/gi, '').trim();
//   console.log('✅ Groq raw response:', raw);
//   return JSON.parse(clean);
  
// }
/* ─── Updated Groq: Use llama-3.1-8b-instant ────────────────── */
/* ─── Updated Groq: Use llama-3.1-8b-instant ────────────────── */
async function getGroqInsights(text, emotionLabel) {
  console.log('🤖 Calling Groq with label:', emotionLabel);
  // Ensure we have a string for the label
  const label = emotionLabel || "Neutral";
  
  const prompt = `You are a compassionate mental health assistant. A user wrote the following journal entry and their dominant emotion was detected as "${label}".

Journal: "${text}"

Respond ONLY with a valid JSON object (no markdown, no explanation) in this exact shape:
{
  "summary": "A 1-2 sentence empathetic summary of how the user is feeling.",
  "suggestedTasks": [
    "First specific, actionable self-care task.",
    "Second specific, actionable self-care task.",
    "Third specific, actionable self-care task."
  ]
}`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.1-8b-instant',
    temperature: 0.6,
    max_tokens: 300,
    response_format: { type: "json_object" }
  });

  const raw = completion.choices[0]?.message?.content?.trim() || '{}';
  const data = JSON.parse(raw);
  
  // Add a source tag so the frontend knows this came from the API
  console.log('✅ Groq raw response:', raw);
  return { ...data, source: 'Groq AI' };
}

/* ─── POST /api/journal ──────────────────────────────────────── */
router.post('/', authenticate, async (req, res) => {
  try {
    const { text, videoEmotions = [], averageVideoScore = 0 } = req.body;

    if (!text || text.trim().length < 5) {
      return res.status(400).json({ error: 'Journal text is too short' });
    }

    // Dedup guard — reject identical text within 10 seconds
    const recent = await Journal.findOne({
      userId: req.userId,
      text: text.trim(),
      createdAt: { $gte: new Date(Date.now() - 10000) },
    });
    if (recent) return res.status(409).json({ error: 'Duplicate journal detected' });

    // Step 1: Run local ONNX classifier
    const aiResult = await predictEmotion(text);
    console.log('🧠 AI Result:', aiResult);

    // Step 2: Call Groq with the real label and a 5s timeout
    let finalInsights = {
      summary: aiResult.summary || 'Reflecting on your day is a great step for your well-being.',
      suggestedTasks: aiResult.suggestedTasks || [
        'Take a short walk outside.',
        'Drink a glass of water and breathe deeply.',
        'Write down three things you are grateful for.',
      ],
      source: 'Local-Static',
    };

    try {
      const bestLabel = aiResult.label || aiResult.primary || 'Neutral';
      const dynamicInsights = await Promise.race([
        getGroqInsights(text, bestLabel),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Groq timeout')), 5000)),
      ]);
      if (dynamicInsights && dynamicInsights.summary) {
        finalInsights = dynamicInsights;
      }
    } catch (groqErr) {
      console.warn('⚠️ Groq fallback triggered:', groqErr.message);
    }

    // Step 3: Calculate scores (using dynamic relative weights to align with research model)
    const textScore = LABEL_TO_MOOD_SCORE[aiResult.label] ?? 0.5;
    
    let weightedSum = textScore * 0.4;
    let activeWeight = 0.4;

    if (averageVideoScore && typeof averageVideoScore === 'number' && averageVideoScore > 0) {
      weightedSum += averageVideoScore * 0.2;
      activeWeight += 0.2;
    }

    const combinedMoodScore = weightedSum / activeWeight;

    const now = new Date();
    const week = getWeekNumber(now);
    const year = now.getFullYear();

    // Step 4: Save Journal document
    const journal = await Journal.create({
      userId: req.userId,
      text,
      textSentiment: {
        label: aiResult.label || 'Normal',
        score: aiResult.confidence ?? 0,
        confidence: aiResult.confidence ?? 0,
        primary: LABEL_TO_PRIMARY[aiResult.label] ?? aiResult.primary ?? 'Calm',
        summary: finalInsights.summary,
        suggestedTasks: finalInsights.suggestedTasks,
        source: finalInsights.source,
      },
      videoEmotions,
      averageVideoScore,
      combinedMoodScore,
      week,
      year,
      createdAt: now,
    });

    // Step 5: Save Mood record so Dashboard picks it up
    await Mood.create({
      userId: req.userId,
      textScore,
      videoScore: averageVideoScore,
      finalMoodScore: combinedMoodScore,
      dominantEmotion: aiResult.label || 'Normal',
      type: 'combined',
      date: now,
    });

    console.log('✅ Journal + Mood saved. combinedMoodScore:', combinedMoodScore);

    // Trigger mood update checks
    checkAndTriggerMoodAlerts(req.userId).catch(err => console.error('❌ Mood check error:', err));

    res.status(201).json({
      success: true,
      message: 'Journal entry created and analyzed',
      journal,
      analysis: aiResult,
    });

  } catch (error) {
    console.error('❌ Journal POST error:', error);
    res.status(500).json({ error: 'Failed to create journal', details: error.message });
  }
});

/* ─── GET /api/journal ───────────────────────────────────────── */
router.get('/', authenticate, async (req, res) => {
  try {
    const journals = await Journal.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ journals });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch journals', details: error.message });
  }
});

/* ─── GET /api/journal/weekly-summary ───────────────────────── */
router.get('/weekly-summary', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const week = getWeekNumber(now);
    const year = now.getFullYear();

    const journals = await Journal.find({ userId: req.userId, week, year });
    const moods = await Mood.find({
      userId: req.userId,
      date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });

    const avgMoodScore = moods.length
      ? moods.reduce((sum, m) => sum + (m.finalMoodScore || 0), 0) / moods.length
      : 0;

    const emotionCount = {};
    moods.forEach(m => {
      const emo = m.dominantEmotion || 'Normal';
      emotionCount[emo] = (emotionCount[emo] || 0) + 1;
    });

    const dominantEmotion = Object.keys(emotionCount).reduce(
      (a, b) => (emotionCount[a] > emotionCount[b] ? a : b),
      'Normal'
    );

    let summary = 'This week ';
    if (dominantEmotion === 'Normal') {
      summary += 'you maintained a positive mood. Great job! Keep it up.';
    } else if (['Depression', 'Suicidal', 'Anxiety'].includes(dominantEmotion)) {
      summary += `showed signs of ${dominantEmotion.toLowerCase()}. Consider self-care and reaching out for support.`;
    } else {
      summary += 'your mood has been relatively stable. Keep tracking your progress.';
    }

    res.json({ 
        summary, 
        journalCount: journals.length, 
        averageMood: avgMoodScore, 
        dominantEmotion, 
        weekData: { week, year } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate summary', details: error.message });
  }
});

module.exports = router;