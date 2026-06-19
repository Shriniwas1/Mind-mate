import { pipeline, env } from '@xenova/transformers';

/**
 * DEPLOYMENT MODE: Load model from Hugging Face Hub
 * Model repo: https://huggingface.co/Shriniwas1/mindmate-deberta
 * 
 * Previously loaded from local /models/ directory.
 * Now fetches from HF and caches in browser IndexedDB automatically.
 */
env.allowRemoteModels = true;
env.allowLocalModels = false;

let textPipe = null;

/**
 * SAFETY: Detect high-risk phrases (non-diagnostic, flag only)
 */
function detectRisk(text) {
  const riskWords = [
    'want to disappear',
    'end it all',
    'no reason to live',
    'suicide',
    'kill myself',
    'i don\'t want to exist'
  ];

  const lower = text.toLowerCase();
  return riskWords.some(w => lower.includes(w)) ? 'high' : 'none';
}

/**
 * Detect numb / emotional flatness
 */
function detectNumbness(text) {
  const numbWords = [
    'empty',
    'numb',
    'nothing',
    'blur',
    'tired of everything',
    'feel nothing'
  ];

  const lower = text.toLowerCase();
  return numbWords.some(w => lower.includes(w));
}

/**
 * Convert sentiment score → meaningful mood system
 */
function interpretMood(score, confidence, text) {
  let mood = 'Neutral';
  let energy = 'Medium';
  let outlook = 'Neutral';

  if (score <= -0.6) {
    mood = 'Very Low';
    energy = 'Low';
    outlook = 'Negative';
  } else if (score <= -0.2) {
    mood = 'Low';
    energy = 'Low';
    outlook = 'Slightly Negative';
  } else if (score < 0.3) {
    mood = 'Neutral';
    energy = 'Medium';
    outlook = 'Neutral';
  } else {
    mood = 'Positive';
    energy = 'High';
    outlook = 'Hopeful';
  }

  // Override if numbness detected
  if (detectNumbness(text)) {
    mood = 'Low';
    outlook = 'Flat / Numb';
  }

  // Confidence adjustment (optional but useful for UI warnings)
  const reliability =
    confidence < 0.5 ? 'Low Confidence' :
    confidence < 0.75 ? 'Moderate Confidence' :
    'High Confidence';

  return { mood, energy, outlook, reliability };
}

/**
 * MAIN ANALYSIS FUNCTION
 */
export async function analyzeText(text) {
  try {
    if (!textPipe) {
      console.log('⏳ Loading text sentiment model from Hugging Face...');
      textPipe = await pipeline(
        'text-classification',
        'Shriniwas1/mindmate-deberta' // Hugging Face model repo
      );
      console.log('✅ Text sentiment model loaded from Hugging Face');
    }

    const results = await textPipe(text);

    const scoreMap = {
      '1 star': -0.9,
      '2 stars': -0.4,
      '3 stars': 0,
      '4 stars': 0.5,
      '5 stars': 0.9,
    };

    const label = results[0].label;
    const score = scoreMap[label] || 0;
    const confidence = results[0].score;

    const interpretation = interpretMood(score, confidence, text);
    const riskLevel = detectRisk(text);

    /**
     * Console output for debugging
     */
    console.log('--- Text Sentiment Analysis (Hugging Face) ---');
    console.log(`Emotion Label: ${label}`);
    console.log(`Positivity Score: ${score}`);
    console.log(`AI Confidence: ${(confidence * 100).toFixed(2)}%`);
    console.log(`Mood: ${interpretation.mood}`);
    console.log(`Energy: ${interpretation.energy}`);
    console.log(`Outlook: ${interpretation.outlook}`);
    console.log(`Reliability: ${interpretation.reliability}`);
    console.log(`Risk Level: ${riskLevel}`);
    console.log('----------------------------------------------');

    /**
     * Structured return → ideal for MongoDB storage + charts
     */
    return {
      label,
      score,
      confidence,
      mood: interpretation.mood,
      energy: interpretation.energy,
      outlook: interpretation.outlook,
      reliability: interpretation.reliability,
      riskLevel,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Text analysis error:', error);

    // Safe neutral fallback
    return {
      label: '3 stars',
      score: 0,
      confidence: 0.5,
      mood: 'Neutral',
      energy: 'Medium',
      outlook: 'Neutral',
      reliability: 'Low Confidence',
      riskLevel: 'none',
      timestamp: new Date().toISOString()
    };
  }
}