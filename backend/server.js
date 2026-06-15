const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { loadModel, predict } = require('./server/modelLoader.js');
const http = require('http');
const socketIo = require('socket.io');
const setupChatHandlers = require('./io/chatHandler.js');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST'],
  },
});
const PORT = process.env.PORT || 8001;

// ✅ UPDATED CORS: Specifically allows your Vite frontend and headers
app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'mindmate_db';

mongoose.connect(`${mongoUrl}/${dbName}`)
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
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/user',    require('./routes/user'));
app.use('/api/mood',    require('./routes/mood'));
app.use('/api/journal', require('./routes/journal'));
app.use('/api/quiz',    require('./routes/quiz'));
app.use('/api/task',    require('./routes/task'));
app.use('/api/alert',   require('./routes/alert'));
app.use('/api/chat',    require('./routes/chat'));
app.use('/api/ai',      require('./routes/ai'));
app.use('/api/friend',  require('./routes/friend'));
// app.use('/api/emotion', require('./routes/emotion')); // ✅ Emotion (selfie) route

// ✅ Setup Socket.io handlers for chat
setupChatHandlers(io);

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