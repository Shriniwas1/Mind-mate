const express  = require('express');
const router   = express.Router();
const ort      = require('onnxruntime-node');
const Jimp = require('jimp');
const multer   = require('multer');
const path     = require('path');

// ── Multer (memory only) ─────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  }
});

// ── Emotion config ───────────────────────────────
// moodScore values are in [0, 1] — same space as journal LABEL_TO_MOOD_SCORE
// so that the dashboard normalizeTo100() treats all mood sources consistently:
//   happy    → 0.85  (≈ journal "Normal" 0.8)
//   surprise → 0.60  (positive surprise)
//   neutral  → 0.50  (mid-point)
//   sad      → 0.15  (≈ journal "Depression" 0.2)
//   fear     → 0.12  (below Depression)
//   disgust  → 0.12
//   angry    → 0.10  (most negative, near journal "Suicidal" 0.05)
const EMOTIONS = [
  { key: 'angry',    emoji: '😠', color: '#FF6B6B', moodScore: 0.10 },
  { key: 'disgust',  emoji: '🤢', color: '#90EE90', moodScore: 0.12 },
  { key: 'fear',     emoji: '😰', color: '#DDA0DD', moodScore: 0.12 },
  { key: 'happy',    emoji: '😊', color: '#FFD700', moodScore: 0.85 },
  { key: 'sad',      emoji: '😢', color: '#6495ED', moodScore: 0.15 },
  { key: 'surprise', emoji: '😮', color: '#FFA500', moodScore: 0.60 },
  { key: 'neutral',  emoji: '😐', color: '#87CEEB', moodScore: 0.50 },
];

const fs = require('fs');
const https = require('https');

// ── Load ONNX model once ─────────────────────────
let session = null;

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: Status Code ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

(async () => {
  try {
    const modelDir = path.join(__dirname, '../model');
    const modelPath = path.join(modelDir, 'mindmate_emotion.onnx');

    if (!fs.existsSync(modelPath)) {
      console.log('📦 Emotion ONNX model not found locally. Checking download...');
      const isProd = process.env.NODE_ENV === 'production';
      if (isProd) {
        if (!fs.existsSync(modelDir)) {
          fs.mkdirSync(modelDir, { recursive: true });
        }
        const hfUrl = process.env.EMOTION_MODEL_URL || 'https://huggingface.co/shriniwasg07/mindmate-deberta/resolve/main/mindmate_emotion.onnx';
        console.log(`📥 Downloading emotion ONNX model from: ${hfUrl}`);
        await downloadFile(hfUrl, modelPath);
        console.log('✅ Download complete.');
      } else {
        console.log('⚠️ Running locally but mindmate_emotion.onnx is missing. Make sure it exists in backend/model/.');
      }
    }

    session = await ort.InferenceSession.create(modelPath);
    console.log('✅ Emotion model loaded successfully');
  } catch (err) {
    console.error('❌ Failed to load emotion model:', err.message);
  }
})();

// ── FER2013 PREPROCESSING (48x48 GRAYSCALE) ─────
async function preprocessImage(buffer) {

  const image = await Jimp.read(buffer);

  image
    .resize(48, 48)
    .grayscale();

  const tensor = new Float32Array(48 * 48);

  for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 48; x++) {

      const pixel = image.getPixelColor(x, y);
      const rgba = Jimp.intToRGBA(pixel);

      tensor[y * 48 + x] = rgba.r / 255;

    }
  }

  return tensor;
}

// ── Softmax ──────────────────────────────────────
function softmax(arr) {
  const max = Math.max(...arr);
  const exps = arr.map(v => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(v => v / sum);
}

// ── POST /api/emotion/analyze ────────────────────
router.post('/analyze', upload.single('selfie'), async (req, res) => {

  try {

    if (!req.file)
      return res.status(400).json({ error: 'No image provided' });

    if (!session)
      return res.status(503).json({ error: 'Model loading...' });

    const tensorData = await preprocessImage(req.file.buffer);

    const inputTensor = new ort.Tensor(
      'float32',
      tensorData,
      [1, 1, 48, 48]
    );

    const feeds = {};
    feeds[session.inputNames[0]] = inputTensor;

    const results = await session.run(feeds);

    const logits = Array.from(results[session.outputNames[0]].data);

    const probs = softmax(logits);

    const mapped = EMOTIONS.map((e, i) => ({
      ...e,
      confidence: Math.round(probs[i] * 100)
    })).sort((a, b) => b.confidence - a.confidence);

    const top = mapped[0];

    res.json({
      success: true,
      dominant: {
        emotion: top.key,
        emoji: top.emoji,
        color: top.color,
        moodScore: top.moodScore,
        confidence: top.confidence
      },
      breakdown: mapped,
      timestamp: new Date().toISOString()
    });

  } catch (err) {

    console.error('Emotion route error:', err);

    res.status(500).json({
      error: 'Analysis failed',
      detail: err.message
    });

  }

});

module.exports = router;