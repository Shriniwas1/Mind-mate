const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { loadModel, predict, isModelLoaded } = require('./server/modelLoader.js');
const http = require('http');
const socketIo = require('socket.io');
const setupChatHandlers = require('./io/chatHandler.js');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      // Dynamic CORS for socket connections
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST'],
  },
});
const PORT = process.env.PORT || 8001;

// ✅ DYNAMIC CORS: Echoes the incoming origin to allow credentialed requests from localhost, staging, and Hugging Face domains
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or direct link API calls)
    if (!origin) return callback(null, true);
    // Otherwise allow the requesting origin dynamically
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'mindmate_db';

let connectionString = mongoUrl;
const urlWithoutProtocol = mongoUrl.replace(/^mongodb(\+srv)?:\/\//, '');
const slashIndex = urlWithoutProtocol.indexOf('/');
if (slashIndex === -1) {
  connectionString = `${mongoUrl}/${dbName}`;
} else if (slashIndex === urlWithoutProtocol.length - 1) {
  connectionString = `${mongoUrl}${dbName}`;
}

mongoose.connect(connectionString)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ✅ LOAD TEXT SENTIMENT MODEL AT SERVER START
loadModel()
  .then(() => console.log("🧠 ONNX model loaded"))
  .catch((err) => {
    console.error("❌ Model loading failed:", err);
  });

// Make io available to routes
app.locals.io = io;

// ---------------- ROUTES ----------------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/mood', require('./routes/mood'));
app.use('/api/journal', require('./routes/journal'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/task', require('./routes/task'));
app.use('/api/alert', require('./routes/alert'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/friend', require('./routes/friend'));
// app.use('/api/emotion', require('./routes/emotion')); // ✅ Emotion (selfie) route

// ✅ Setup Socket.io handlers for chat
setupChatHandlers(io);

// ✅ DIAGNOSTIC HEALTH CHECK ROUTE
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    models: {
      sentiment: isModelLoaded() ? 'loaded' : 'not_loaded',
    },
    groq: !!process.env.GROQ_API_KEY
  });
});

// ✅ TEXT PREDICT ROUTE
app.post('/api/predict', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const result = await predict(text);
    res.json(result);
  } catch (err) {
    console.error("Prediction error:", err);
    res.status(500).json({ error: "Prediction failed", details: err.message });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('--- SERVER ERROR ---');
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MindMate Backend running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.io ready for chat connections`);
});

module.exports = app;