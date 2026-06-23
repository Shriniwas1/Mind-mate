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
    if (!emergencyContact || !emergencyContact.name || !emergencyContact.phone || !emergencyContact.email) {
      return res.status(400).json({ error: 'All emergency contact details are required' });
    }

    const currentUser = await User.findById(req.userId);
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    const currentEmail = currentUser.emergencyContact?.email?.toLowerCase();
    const newEmail = emergencyContact.email.toLowerCase();
    const emailChanged = currentEmail !== newEmail;

    let contactHasApp = false;
    let status = 'pending';

    if (emailChanged) {
      const contactUser = await User.findOne({ email: newEmail });
      contactHasApp = !!contactUser;
      status = 'pending';
    } else {
      contactHasApp = currentUser.emergencyContact?.hasApp || false;
      status = currentUser.emergencyContact?.status || 'pending';
    }

    const updatedContact = {
      name: emergencyContact.name,
      phone: emergencyContact.phone,
      email: emergencyContact.email,
      hasApp: contactHasApp,
      status: status
    };

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { 
        $set: { 
          emergencyContact: updatedContact, 
          profileCompleted: true 
        } 
      },
      { new: true } 
    ).select('-password');

    // Create a notification for the emergency contact user if the email changed and they have the app
    if (emailChanged && contactHasApp) {
      const contactUser = await User.findOne({ email: newEmail });
      if (contactUser) {
        const Notification = require('../models/Notification');
        await Notification.create({
          recipient: contactUser._id,
          sender: req.userId,
          message: `${currentUser.name} has listed you as their emergency contact partner in MindMate. Please accept the request to connect.`,
          isRead: false
        });
      }
    }

    await EmergencyContact.findOneAndUpdate(
      { userId: req.userId }, 
      { 
        $set: {
          userId: req.userId,
          name: updatedContact.name,
          phone: updatedContact.phone,
          email: updatedContact.email,
          hasApp: updatedContact.hasApp,
          status: updatedContact.status,
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