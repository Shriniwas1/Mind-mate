const mongoose = require('mongoose');
const crypto = require('crypto');

const ENCRYPTION_KEY = crypto.createHash('sha256')
  .update(process.env.JOURNAL_ENCRYPTION_KEY || 'default_secret_key_mindmate_deberta_must_be_32_bytes_long')
  .digest();
const IV_LENGTH = 16;

function encryptText(val) {
  if (!val || typeof val !== 'string') return val;
  // If it's already encrypted (has iv:encrypted structure), don't double-encrypt
  if (val.includes(':') && val.split(':').length === 2 && val.split(':')[0].length === 32) {
    return val;
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(val, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptText(val) {
  if (!val || typeof val !== 'string') return val;
  try {
    const parts = val.split(':');
    if (parts.length !== 2 || parts[0].length !== 32) {
      return val; // Return original if not in expected encrypted format
    }
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    return val; // Fallback to raw text if decryption fails
  }
}

const journalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: true,
    get: decryptText,
    set: encryptText,
  },
  textSentiment: {
    label: String,          // Raw model label: 'Anxiety', 'Depression', etc.
    score: Number,          // Raw model confidence score
    confidence: Number,     // Alias for score (frontend compat)
    primary: String,        // Normalized human-readable emotion: 'Anxious', 'Sad', etc.
    summary: String,        // Groq-generated 1-2 sentence summary
    suggestedTasks: [String], // Groq-generated array of 3 actionable tasks
  },
  videoEmotions: [{
    emotion: String,
    confidence: Number,
    moodScore: Number,
    timestamp: Date,
  }],
  averageVideoScore: {
    type: Number,
    default: 0,
  },
  combinedMoodScore: {
    type: Number,
    required: true,
  },
  week: { type: Number, required: true },
  year: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

journalSchema.index({ userId: 1, createdAt: -1 });

journalSchema.set('toJSON', { getters: true });
journalSchema.set('toObject', { getters: true });

module.exports = mongoose.model('Journal', journalSchema);