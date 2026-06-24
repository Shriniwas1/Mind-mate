const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User'); 
const { sendOtpEmail } = require('../utils/emailService');
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
        hasApp: contactHasApp,
        status: 'pending'
      },
      profileCompleted: true // Set true immediately as they filled it in signup
    });
    
    await user.save();

    // Create a notification for the emergency contact user if they have the app
    if (contactHasApp && emergencyContact && emergencyContact.email) {
      const contactUser = await User.findOne({ email: emergencyContact.email.toLowerCase() });
      if (contactUser) {
        const Notification = require('../models/Notification');
        await Notification.create({
          recipient: contactUser._id,
          sender: user._id,
          message: `${user.name} has joined MindMate and listed you as their emergency contact partner. Please accept the request to connect.`,
          isRead: false
        });
      }
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });

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

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });

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

// ─── FORGOT PASSWORD — Step 1: Generate & send OTP ───────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always return 200 to prevent email enumeration attacks
    if (!user) {
      return res.json({ message: 'If that email exists, a code has been sent.' });
    }

    // Generate a cryptographically secure 6-digit OTP
    const otp = String(crypto.randomInt(100000, 999999));

    // Hash the OTP before storing (never store plain OTPs)
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Save hashed OTP + 10-minute expiry
    user.resetOtp = hashedOtp;
    user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // Send the email (plain OTP goes into email, hashed version stays in DB)
    await sendOtpEmail(user.email, otp, user.name);

    console.log(`✅ Password reset OTP sent to ${user.email}`);
    res.json({ message: 'If that email exists, a code has been sent.' });
  } catch (error) {
    console.error('❌ forgot-password error:', error);
    res.status(500).json({ error: 'Failed to send reset email. Please try again.' });
  }
});

// ─── FORGOT PASSWORD — Step 2: Verify OTP, return short-lived resetToken ─────
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user || !user.resetOtp || !user.resetOtpExpiry) {
      return res.status(400).json({ error: 'No reset request found. Please request a new code.' });
    }

    // Check expiry
    if (new Date() > user.resetOtpExpiry) {
      user.resetOtp = null;
      user.resetOtpExpiry = null;
      await user.save();
      return res.status(400).json({ error: 'Code has expired. Please request a new one.' });
    }

    // Verify OTP against stored hash
    const isValid = await bcrypt.compare(otp, user.resetOtp);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid code. Please try again.' });
    }

    // Issue a short-lived resetToken (15 min)
    const resetToken = jwt.sign(
      { userId: user._id, purpose: 'password-reset' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    console.log(`✅ OTP verified for ${user.email}`);
    res.json({ resetToken, message: 'Code verified. You may now set a new password.' });
  } catch (error) {
    console.error('❌ verify-otp error:', error);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// ─── FORGOT PASSWORD — Step 3: Set new password using resetToken ──────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Verify the reset token
    let payload;
    try {
      payload = jwt.verify(resetToken, JWT_SECRET);
    } catch {
      return res.status(400).json({ error: 'Reset link has expired. Please start over.' });
    }

    if (payload.purpose !== 'password-reset') {
      return res.status(400).json({ error: 'Invalid reset token.' });
    }

    const user = await User.findById(payload.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Update password — the pre('save') hook will bcrypt-hash it automatically
    user.password = newPassword;
    // Clear OTP fields
    user.resetOtp = null;
    user.resetOtpExpiry = null;
    await user.save();

    console.log(`✅ Password reset successfully for ${user.email}`);
    res.json({ message: 'Password updated successfully. You can now log in.' });
  } catch (error) {
    console.error('❌ reset-password error:', error);
    res.status(500).json({ error: 'Password reset failed. Please try again.' });
  }
});

module.exports = router;