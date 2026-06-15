const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/* ══════════════════════════════════════════════════════════════
   AI CHAT - Get response from Groq LLM
   POST /api/ai/chat
══════════════════════════════════════════════════════════════ */
router.post('/chat', authenticate, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const systemPrompt = `You are MindMate AI, a compassionate mental health support assistant.
You help users with wellness advice, mental health questions, coping strategies, and general support.
Always be empathetic, non-judgmental, and encouraging.
If the user mentions suicidal thoughts or self-harm, encourage them to contact emergency services or a crisis hotline immediately.
Keep responses concise (2-3 sentences max) and supportive.
Never pretend to be a licensed therapist or provide medical diagnoses.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      model: 'llama-3.1-8b-instant',
      max_tokens: 1024,
    });

    const responseText = chatCompletion.choices[0]?.message?.content
      ?? 'Sorry, I could not generate a response.';

    console.log(`🤖 AI response generated for user ${req.userId}`);

    res.status(200).json({
      success: true,
      response: responseText,
      model: 'llama-3.1-8b-instant',
    });

  } catch (error) {
    console.error('❌ AI chat error:', error?.message);
    console.error('❌ Groq error detail:', error?.error ?? error?.response?.data ?? error);
    res.status(500).json({
      error: 'Failed to get AI response',
      details: error?.message,
    });
  }
});

module.exports = router;