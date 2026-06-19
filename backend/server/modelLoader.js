const path = require('path');
const { env, pipeline } = require('@xenova/transformers');

const modelDir = path.join(__dirname, '..', 'model');

const isProd = process.env.NODE_ENV === 'production';

// 🔒 Configure loading depending on environment
env.allowRemoteModels = isProd;
env.allowLocalModels = true;
env.cacheDir = modelDir;

if (!isProd) {
  // Point directly to your model folder in local dev
  env.localModelPath = path.join(__dirname, '..');
}

let classifierPipeline = null;

// ✅ Load model once (singleton pattern)
async function loadModel() {
  if (classifierPipeline) {
    console.log('⚡ Model already loaded');
    return classifierPipeline;
  }

  try {
    if (isProd) {
      const hfModelId = process.env.HF_MODEL_ID || 'shriniwasg07/mindmate-deberta';
      console.log(`🚀 Loading MindMate model from Hugging Face Hub: ${hfModelId}...`);
      classifierPipeline = await pipeline(
        'text-classification',
        hfModelId,
        {
          local_files_only: false,
        }
      );
    } else {
      console.log('🚀 Loading MindMate ONNX model from local disk...');
      classifierPipeline = await pipeline(
        'text-classification',
        'model', // folder name inside backend/
        {
          local_files_only: true,
        }
      );
    }

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

function isModelLoaded() {
  return !!classifierPipeline;
}

module.exports = { loadModel, predict, isModelLoaded };