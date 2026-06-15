const axios = require('axios');
const { predict } = require('../server/modelLoader');

// 1. EMOTION MAP
const EMOTION_MAP = {
  admiration: 'positive', amusement: 'happy', anger: 'angry', annoyance: 'angry',
  approval: 'neutral', caring: 'positive', confusion: 'confused', curiosity: 'neutral',
  desire: 'positive', disappointment: 'sad', disapproval: 'sad', disgust: 'disgust',
  embarrassment: 'anxious', excitement: 'happy', fear: 'anxious', gratitude: 'positive',
  grief: 'sad', joy: 'happy', love: 'happy', nervousness: 'anxious',
  optimism: 'positive', pride: 'happy', realization: 'neutral', relief: 'positive',
  remorse: 'sad', sadness: 'sad', surprise: 'neutral', neutral: 'neutral'
};

// 2. STATIC FALLBACK CONTENT (If API is down or Key expires)
const SUGGESTIONS = {
  happy: {
    summary: "You're in a great head space! Capturing these moments helps build emotional resilience.",
    tasks: ["Write down one specific thing that made you smile.", "Share this positive energy with a friend.", "Take a mental 'snapshot' of this feeling."]
  },
  sad: {
    summary: "It sounds like you're carrying a heavy heart right now. It's okay to not be okay.",
    tasks: ["Hydrate and take 5 deep breaths.", "Listen to a comforting playlist.", "Identify one thing you can control right now."]
  },
  anxious: {
    summary: "Your mind seems to be racing or feeling on edge. Let's try to ground you.",
    tasks: ["Try the 5-4-3-2-1 grounding technique.", "Limit caffeine for the next few hours.", "Write a 'worry list' then physically cross out things out of your control."]
  },
  angry: {
    summary: "There's some frustration or heat in your words. This energy needs a safe outlet.",
    tasks: ["Go for a 10-minute brisk walk.", "Do a 'brain dump' on paper—rip it up afterwards.", "Practice box breathing (4s in, 4s hold, 4s out)."]
  },
  mixed: {
    summary: "You're feeling a complex blend of emotions. This is very common during growth or change.",
    tasks: ["Try to label the two strongest feelings separately.", "Journal about what 'conflict' is causing this mix.", "Give yourself permission to feel both things at once."]
  },
  neutral: {
    summary: "You're feeling relatively steady or centered right now.",
    tasks: ["Set one small goal for the next 3 hours.", "Check in with your physical posture.", "Practice 2 minutes of mindful observation."]
  },
  positive: {
    summary: "You've expressed a sense of appreciation or connection.",
    tasks: ["Send a 'thank you' text to someone.", "Reflect on how this connection improves your day.", "Acknowledge your own role in this positive interaction."]
  }
};

const MIN_THRESHOLD = 0.40;
const MIXED_THRESHOLD = 0.15;

/**
 * NEW: Calls Groq API with ANONYMIZED data (No user text sent)
 */
const getDynamicAdvice = async (emotion, intensity) => {
  if (!process.env.GROQ_API_KEY) {
    console.warn("⚠️ GROQ_API_KEY missing in .env - using static fallbacks.");
    return null;
  }

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "You are MindMate, a helpful mental health assistant. Respond ONLY in valid JSON format."
          },
          {
            role: "user",
            content: `The user is feeling "${emotion}" with ${intensity} intensity. Provide a 1-sentence empathetic summary and 3 actionable self-care tasks. JSON structure: {"summary": "string", "tasks": ["string", "string", "string"]}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 3000 // 3 second timeout for fast UX
      }
    );

    return JSON.parse(response.data.choices[0].message.content);
  } catch (error) {
    console.error("❌ Groq API Error:", error.message);
    return null; // Triggers fallback to static SUGGESTIONS
  }
};

/**
 * MAIN PREDICTION FUNCTION
 */
const predictEmotion = async (text) => {
  if (!text || text.trim().length === 0) {
    return { primary: 'neutral', confidence: 0, summary: SUGGESTIONS.neutral.summary, suggestedTasks: SUGGESTIONS.neutral.tasks };
  }

  try {
    const result = await predict(text);
    if (!result || !result.all_scores) return { primary: 'neutral', confidence: 0 };

    const top1 = result.all_scores[0];
    const top2 = result.all_scores[1] || { label: 'neutral', score: 0 };

    let finalLabel = EMOTION_MAP[top1.label] || 'neutral';
    
    // Logic for Mixed/Fallback
    if (top1.score < MIN_THRESHOLD) {
      finalLabel = 'neutral';
    } else if (top2.score > 0.35 && (top1.score - top2.score) < MIXED_THRESHOLD) {
      if (EMOTION_MAP[top1.label] !== EMOTION_MAP[top2.label]) {
        finalLabel = 'mixed';
      }
    }

    const intensity = top1.score > 0.8 ? 'High' : top1.score > 0.6 ? 'Moderate' : 'Low';

    // 🔥 TRY DYNAMIC GENERATION (ANONYMIZED)
    let content = await getDynamicAdvice(finalLabel, intensity);

    // 🛡️ STATIC FALLBACK if API fails
    if (!content) {
      content = SUGGESTIONS[finalLabel] || SUGGESTIONS['neutral'];
    }

    return {
      primary: finalLabel,
      confidence: parseFloat(top1.score.toFixed(4)),
      summary: content.summary,
      suggestedTasks: content.tasks,
      analysis: {
        detected: top1.label,
        intensity: intensity
      }
    };

  } catch (error) {
    console.error('❌ MindMate Engine Error:', error);
    return { 
      primary: 'neutral', 
      confidence: 0, 
      summary: SUGGESTIONS.neutral.summary, 
      suggestedTasks: SUGGESTIONS.neutral.tasks 
    };
  }
};

module.exports = { predictEmotion };