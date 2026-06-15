/**
 * Vision Analysis — Live Emotion Detection for Video Journaling
 * 
 * UPGRADED: Now uses face-api.js SsdMobilenetv1 for max accuracy
 * with temporal smoothing to prevent flickering.
 * 
 * Exports remain identical so JournalPage works without import changes.
 */

import { loadFaceModels, isFaceModelLoaded, predictEmotionAPI } from './emotion/modelManager.js';
import { EmotionBuffer } from './emotion/emotionBuffer.js';

let modelsLoaded = false;
const emotionBuffer = new EmotionBuffer(10, 40); // 10 frames window, 40% confidence threshold

// ── Mood Map (for backward compatibility) ──────────────────
const moodMap = {
  happy:    1.0,
  neutral:  0.1,
  sad:     -0.6,
  angry:   -0.8,
  fearful: -0.7,
  fear:    -0.7, // alias
  disgusted:-0.5,
  disgust: -0.5, // alias
  surprised: 0.3,
  surprise: 0.3, // alias
};

export async function loadVisionModels() {
  if (modelsLoaded || isFaceModelLoaded()) {
    modelsLoaded = true;
    return;
  }

  try {
    console.log('⏳ Loading high-accuracy face-api.js models...');
    await loadFaceModels();
    modelsLoaded = true;
    console.log('✅ Vision AI model ready (SsdMobilenetv1)');
  } catch (error) {
    console.error('❌ Failed to load vision models:', error);
  }
}

/**
 * Analyze a single video frame. Returns { emotion, confidence, moodScore }
 */
export async function analyzeVideoFrame(videoElement) {
  try {
    if (!modelsLoaded) await loadVisionModels();

    if (videoElement.paused || videoElement.ended || videoElement.readyState < 2) {
      return { emotion: 'Not Ready', confidence: 0, moodScore: 0 };
    }

    const result = await predictEmotionAPI(videoElement);

    if (!result || !result.success || result.emotion === 'No Face' || result.emotion === 'Error') {
      return { emotion: 'No Face', confidence: 0, moodScore: 0 };
    }

    // Add to our temporal buffer
    const expressions = result.detection.expressions;
    emotionBuffer.addFrame(expressions);
    
    // Get smoothed result
    const smoothed = emotionBuffer.getSmoothedEmotion();
    if (!smoothed) {
      return { emotion: 'No Face', confidence: 0, moodScore: 0 };
    }

    const moodScore = moodMap[smoothed.emotion] || 0;

    return {
      emotion: smoothed.emotion,
      confidence: smoothed.confidence,
      moodScore: moodScore,
    };
  } catch (error) {
    console.error('Vision Frame Error:', error);
    return { emotion: 'Error', confidence: 0, moodScore: 0 };
  }
}

// ── Live analysis loop for journaling ────────────────────────────────

let videoInterval = null;
let frameScores = [];

export function startLiveAnalysis(videoElementOrRef, onFrameAnalyzed) {
  frameScores = [];
  emotionBuffer.clear();

  const getElement = () => videoElementOrRef?.current ?? videoElementOrRef;
  const el = getElement();
  if (!el) return;

  // Analyze every 1 second
  videoInterval = setInterval(async () => {
    const videoElement = getElement();

    if (!videoElement || videoElement.readyState < 2) return;

    const result = await analyzeVideoFrame(videoElement);

    if (result && result.emotion !== 'No Face' && result.emotion !== 'Error' && result.emotion !== 'Not Ready') {
      frameScores.push(result.moodScore);

      if (onFrameAnalyzed) {
        onFrameAnalyzed(result);
      }

      console.log('🎥 Image Sequence Analysis:', result.emotion, '| Score:', result.moodScore);
    }
  }, 1000);
}

export function stopLiveAnalysis() {
  if (videoInterval) {
    clearInterval(videoInterval);
    videoInterval = null;
    console.log('🛑 Live sequence analysis stopped');
  }

  emotionBuffer.clear();

  if (frameScores.length === 0) return 0;

  const sum = frameScores.reduce((a, b) => a + b, 0);
  return sum / frameScores.length;
}

export function computeFinalMood({ textScore, selfieScore, videoScore, quizScore }) {
  const data = [
    { val: textScore, weight: 0.4 },
    { val: selfieScore, weight: 0.3 },
    { val: videoScore, weight: 0.2 },
    { val: quizScore, weight: 0.1 },
  ];

  let weightedSum = 0;
  let activeWeight = 0;

  data.forEach((item) => {
    if (typeof item.val === 'number' && !isNaN(item.val)) {
      weightedSum += item.val * item.weight;
      activeWeight += item.weight;
    }
  });

  if (activeWeight === 0) return 0;
  return weightedSum / activeWeight;
}