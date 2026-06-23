const dotenv = require('dotenv');
dotenv.config();

const { loadModel } = require('./modelLoader.js');

async function download() {
  console.log('⏳ Starting model weights pre-download phase...');
  try {
    // Force production mode to ensure HF download pipeline runs
    process.env.NODE_ENV = 'production';
    await loadModel();
    console.log('✅ Model weights pre-downloaded and cached successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to download model weights:', err);
    process.exit(1);
  }
}

download();
