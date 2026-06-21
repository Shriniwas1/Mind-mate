const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); 
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

// Register Route
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, emergencyContact } = req.body;

    // 1. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // 2. Cost-saving check: Does the emergency contact have an account?
    let contactHasApp = false;
    if (emergencyContact && emergencyContact.email) {
      const contactUser = await User.findOne({ email: emergencyContact.email.toLowerCase() });
      contactHasApp = !!contactUser;
    }

    // 3. Create user with embedded emergency contact info
    const user = new User({ 
      email, 
      password, 
      name, 
      emergencyContact: {
        ...emergencyContact,
        hasApp: contactHasApp
      },
      profileCompleted: true // Set true immediately as they filled it in signup
    });
    
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        profileCompleted: user.profileCompleted,
        emergencyContact: user.emergencyContact
      },
    });
  } catch (error) {
    console.error('SERVER ERROR DURING REGISTRATION:', error); 
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        profileCompleted: user.profileCompleted,
        emergencyContact: user.emergencyContact
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;