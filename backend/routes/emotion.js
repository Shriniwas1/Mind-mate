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
const EMOTIONS = [
  { key: 'angry', emoji: '😠', color: '#FF6B6B', moodScore: 2 },
  { key: 'disgust', emoji: '🤢', color: '#90EE90', moodScore: 2 },
  { key: 'fear', emoji: '😰', color: '#DDA0DD', moodScore: 2 },
  { key: 'happy', emoji: '😊', color: '#FFD700', moodScore: 9 },
  { key: 'sad', emoji: '😢', color: '#6495ED', moodScore: 3 },
  { key: 'surprise', emoji: '😮', color: '#FFA500', moodScore: 6 },
  { key: 'neutral', emoji: '😐', color: '#87CEEB', moodScore: 5 }
];

// ── Load ONNX model once ─────────────────────────
let session = null;

(async () => {
  try {
    const modelPath = path.join(__dirname, '../model/mindmate_emotion.onnx');
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