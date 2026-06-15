const path = require('path');
const { env, pipeline } = require('@xenova/transformers');

const modelDir = path.join(__dirname, '..', 'model');

// 🔒 Force local-only loading
env.allowRemoteModels = false;
env.allowLocalModels = true;

// Point directly to your model folder
env.localModelPath = path.join(__dirname, '..');
env.cacheDir = modelDir;

let classifierPipeline = null;

// ✅ Load model once (singleton pattern)
async function loadModel() {
  if (classifierPipeline) {
    console.log('⚡ Model already loaded');
    return classifierPipeline;
  }

  try {
    console.log('🚀 Loading MindMate ONNX model from local disk...');

    classifierPipeline = await pipeline(
      'text-classification',
      'model', // folder name inside backend/
      {
        local_files_only: true,
        // optional: device: 'cpu' (default)
      }
    );

    console.log('✅ MindMate ONNX model loaded successfully');
    return classifierPipeline;

  } catch (error) {
    console.error('❌ Model loading failed:', error);
    throw error;
  }
}

// ✅ Prediction function
async function predict(text) {
  if (!classifierPipeline) {
    await loadModel(); // auto-load if not loaded
  }

  try {
    const results = await classifierPipeline(text, {
      topk: null, // return all classes
    });

    // 🔥 Handle both single & batch safely
    const output = Array.isArray(results[0]) ? results[0] : results;

    const sorted = output.sort((a, b) => b.score - a.score);
    const top = sorted[0];

    return {
      input: text,
      prediction: top,
      all_scores: sorted,
    };

  } catch (error) {
    console.error('❌ Prediction error:', error);
    throw error;
  }
}

module.exports = { loadModel, predict };