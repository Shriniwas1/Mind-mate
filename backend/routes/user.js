const express = require('express');
const User = require('../models/User');
const EmergencyContact = require('../models/EmergencyContact'); 
const authenticate = require('../middleware/auth');
const router = express.Router();

router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/profile', authenticate, async (req, res) => {
  try {
    const { emergencyContact } = req.body;

    // Validate all required emergency fields
    if (!emergencyContact.name || !emergencyContact.phone || !emergencyContact.email) {
      return res.status(400).json({ error: 'All emergency contact details are required' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { 
        $set: { 
          emergencyContact: emergencyContact, 
          profileCompleted: true 
        } 
      },
      { new: true } 
    ).select('-password');

    await EmergencyContact.findOneAndUpdate(
      { userId: req.userId }, 
      { 
        $set: {
          userId: req.userId,
          name: emergencyContact.name,
          phone: emergencyContact.phone,
          email: emergencyContact.email,
          hasApp: emergencyContact.hasApp || false,
          updatedAt: Date.now()
        }
      },
      { upsert: true, new: true }
    );

    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save profile', details: error.message });
  }
});

module.exports = router;