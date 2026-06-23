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
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const systemPrompt = `You are MindMate AI, a compassionate mental health support assistant.
You help users with wellness advice, mental health questions, coping strategies, and general support.
Always be empathetic, non-judgmental, and encouraging.
If the user mentions suicidal thoughts or self-harm, encourage them to contact emergency services or a crisis hotline immediately.
Keep responses concise (2-3 sentences max) and supportive.
Never pretend to be a licensed therapist or provide medical diagnoses.`;

    // 🛡️ Pre-classification check: restrict MindMate AI Assistant to mental health topics
    const classificationCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a strict content classifier for "MindMate AI", a mental health support assistant. Your sole task is to determine if the user\'s message is related to mental health, emotional support, psychological wellness, stress, anxiety, depression, coping strategies, personal life issues, or general supportive/empathetic conversation. If it is related, respond with exactly "yes". If it is unrelated to mental health/wellness (e.g. requests for code/programming, math, science, history, general knowledge, business, entertainment, or random tasks that do not involve personal feelings or mental wellness), respond with exactly "no". Respond with ONLY "yes" or "no". Do not include any explanations, reasoning, or punctuation.'
        },
        {
          role: 'user',
          content: message
        }
      ],
      model: 'llama-3.1-8b-instant',
      max_tokens: 5,
      temperature: 0,
    });

    const isRelated = classificationCompletion.choices[0]?.message?.content?.trim().toLowerCase();

    if (isRelated && isRelated.includes('no')) {
      console.log(`🛡️ Refused unrelated AI request from user ${req.userId}: "${message}"`);
      return res.status(200).json({
        success: true,
        response: "This request cannot be served because the context is not related to mental health, to ensure the safety and focus of MindMate AI Assistant.",
        model: 'llama-3.1-8b-instant',
      });
    }

    const chatHistory = Array.isArray(history) ? history : [];
    
    const formattedHistory = chatHistory.slice(-10).map(h => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: h.content || ''
    }));

    const messages = [
      { role: 'system', content: systemPrompt },
      ...formattedHistory,
      { role: 'user', content: message }
    ];

    const chatCompletion = await groq.chat.completions.create({
      messages,
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