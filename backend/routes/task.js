const express = require('express');
const Task = require('../models/Task');
const authenticate = require('../middleware/auth');
const router = express.Router();

// Task templates based on emotions
const taskTemplates = {
  sad: [
    { title: 'Call a Friend', description: 'Reach out to someone who makes you smile', category: 'social' },
    { title: 'Watch Something Funny', description: 'Watch a comedy show or funny videos', category: 'rest' },
    { title: 'Journal Your Feelings', description: 'Write down what\'s making you feel sad', category: 'creativity' },
  ],
  anxious: [
    { title: 'Deep Breathing Exercise', description: '4-7-8 breathing: Inhale 4s, hold 7s, exhale 8s', category: 'breathing' },
    { title: 'Progressive Muscle Relaxation', description: 'Tense and relax each muscle group', category: 'meditation' },
    { title: 'Go for a Walk', description: 'Take a 15-minute walk outside', category: 'exercise' },
  ],
  tired: [
    { title: 'Power Nap', description: 'Take a 20-minute nap to recharge', category: 'rest' },
    { title: 'Hydrate', description: 'Drink a glass of water and eat a healthy snack', category: 'rest' },
    { title: 'Gentle Stretching', description: 'Do 5 minutes of gentle stretches', category: 'exercise' },
  ],
  stressed: [
    { title: 'Mindful Meditation', description: '10 minutes of guided meditation', category: 'meditation' },
    { title: 'Creative Activity', description: 'Draw, paint, or do something creative', category: 'creativity' },
    { title: 'Exercise', description: '20 minutes of moderate physical activity', category: 'exercise' },
  ],
  neutral: [
    { title: 'Gratitude Practice', description: 'List 3 things you\'re grateful for', category: 'meditation' },
    { title: 'Connect Socially', description: 'Send a message to a friend', category: 'social' },
    { title: 'Physical Activity', description: 'Do your favorite physical activity', category: 'exercise' },
  ],
};

// Generate tasks based on mood
router.post('/generate', authenticate, async (req, res) => {
  try {
    const { emotion } = req.body;
    const normalizedEmotion = emotion?.toLowerCase() || 'neutral';
    
    let templates = taskTemplates[normalizedEmotion] || taskTemplates.neutral;
    
    // Map similar emotions
    if (['fearful', 'angry'].includes(normalizedEmotion)) {
      templates = taskTemplates.anxious;
    }

    // Create tasks
    const tasks = [];
    for (const template of templates) {
      const task = new Task({
        userId: req.userId,
        ...template,
        assignedEmotion: normalizedEmotion,
      });
      await task.save();
      tasks.push(task);
    }

    res.status(201).json({ message: 'Tasks generated', tasks });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate tasks', details: error.message });
  }
});

// Get tasks
router.get('/', authenticate, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.userId, completed: false })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks', details: error.message });
  }
});

// Complete task
router.put('/:taskId/complete', authenticate, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.taskId, userId: req.userId },
      { completed: true, completedAt: new Date() },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task completed', task });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete task', details: error.message });
  }
});

module.exports = router;
