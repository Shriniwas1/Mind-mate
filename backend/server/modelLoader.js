const path = require('path');
const { env, pipeline } = require('@xenova/transformers');

// ✅ DEPLOYMENT MODE: Load model from Hugging Face Hub
// Model repo: https://huggingface.co/Shriniwas1/mindmate-deberta
// Contains: model_quantized.onnx, tokenizer.json, config.json, class_names.json
env.allowRemoteModels = true;
env.allowLocalModels = false;

// Cache downloaded models in a local directory (avoids re-downloading on restart)
const cacheDir = path.join(__dirname, '..', '.model_cache');
env.cacheDir = cacheDir;

let classifierPipeline = null;

// ✅ Load model once (singleton pattern)
async function loadModel() {
  if (classifierPipeline) {
    console.log('⚡ Model already loaded');
    return classifierPipeline;
  }

  try {
    console.log('🚀 Loading MindMate DeBERTa model from Hugging Face...');
    console.log('📦 Model: Shriniwas1/mindmate-deberta');
    console.log('💾 Cache dir:', cacheDir);

    classifierPipeline = await pipeline(
      'text-classification',
      'Shriniwas1/mindmate-deberta', // Hugging Face model repo
      {
        // quantized: true is default — uses model_quantized.onnx
      }
    );

    console.log('✅ MindMate DeBERTa model loaded successfully from Hugging Face');
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