import * as faceapi from 'face-api.js';

let modelsLoaded = false;
let isInitializing = false;

// Use a reliable CDN for face-api.js models (SsdMobilenetv1 provides max accuracy)
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

export async function loadFaceModels(onProgress) {
  if (modelsLoaded) return true;
  
  if (isInitializing) {
    // Wait for the existing initialization to finish
    while (isInitializing) {
      await new Promise(r => setTimeout(r, 100));
    }
    return modelsLoaded;
  }

  isInitializing = true;
  try {
    if (onProgress) onProgress('Loading SsdMobilenetv1 Model...');
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);

    if (onProgress) onProgress('Loading Facial Landmark Model...');
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

    if (onProgress) onProgress('Loading Emotion Model...');
    await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);

    modelsLoaded = true;
    if (onProgress) onProgress('Emotion AI Ready');
    return true;
  } catch (err) {
    console.error('Failed to load face-api models:', err);
    if (onProgress) onProgress('Error loading models');
    return false;
  } finally {
    isInitializing = false;
  }
}

export function isFaceModelLoaded() {
  return modelsLoaded;
}

/**
 * Predicts emotions for a given image or video element
 */
export async function predictEmotionAPI(mediaElement) {
  if (!modelsLoaded) {
    await loadFaceModels();
  }

  // Use SsdMobilenetv1 for highest accuracy
  const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });
  
  const detection = await faceapi.detectSingleFace(mediaElement, options)
    .withFaceLandmarks()
    .withFaceExpressions();

  if (!detection) {
    return { success: false, emotion: 'No Face' };
  }

  // Parse expressions
  const expressions = detection.expressions;
  const sorted = Object.entries(expressions)
    .sort((a, b) => b[1] - a[1])
    .map(([emotion, confidence]) => ({
      emotion,
      confidence: Math.round(confidence * 100)
    }));

  const dominant = sorted[0];

  return {
    success: true,
    detection: detection, // Includes bounding box and landmarks
    dominant: {
      emotion: dominant.emotion,
      confidence: dominant.confidence,
    },
    breakdown: sorted,
  };
}
