const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const Notification = require('../models/Notification');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

/* ─── Twilio lazy init ────────────────────────────────────────── */
const getTwilioClient = () => {
  const sid = process.env.TWILIO_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || !sid.startsWith('AC')) return null;
  return twilio(sid, token);
};

/* ─── Nodemailer transporter ──────────────────────────────────── */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* ══════════════════════════════════════════════════════════════
   1. IN-APP MESSAGE
   POST /api/alert/sos/in-app
══════════════════════════════════════════════════════════════ */
router.post('/sos/in-app', authenticate, async (req, res) => {
  try {
    const { message } = req.body;

    const sender = await User.findById(req.userId);
    if (!sender) return res.status(404).json({ error: 'User not found' });

    const contact = sender.emergencyContact;
    if (!contact) return res.status(404).json({ error: 'No emergency contact found. Please add one in Safety Settings.' });

    const notification = await Notification.create({
      recipient: req.userId,
      sender: req.userId,
      message: `🆘 SOS from ${sender.name}: ${message}`,
      isRead: false,
    });

    console.log(`✅ In-app SOS notification saved for user ${req.userId}`);
    res.status(200).json({ success: true, notification });

  } catch (error) {
    console.error('❌ In-app SOS error:', error);
    res.status(500).json({ error: 'In-app notification failed', details: error.message });
  }
});

/* ══════════════════════════════════════════════════════════════
   2. EMAIL
   POST /api/alert/sos/email
══════════════════════════════════════════════════════════════ */
router.post('/sos/email', authenticate, async (req, res) => {
  try {
    const { message } = req.body;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(500).json({ error: 'Email not configured on server' });
    }

    const sender = await User.findById(req.userId);
    if (!sender) return res.status(404).json({ error: 'User not found' });

    const contact = sender.emergencyContact;
    if (!contact) return res.status(404).json({ error: 'No emergency contact found' });

    const recipientEmail = contact.email;
    if (!recipientEmail) return res.status(404).json({ error: 'Emergency contact has no email address' });

    await transporter.sendMail({
      from: `"MindMate SOS" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: `🆘 SOS Alert from ${sender.name}`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:24px;border:2px solid #EF4444;border-radius:12px;">
          <h2 style="color:#EF4444;">🆘 Emergency SOS Alert</h2>
          <p><strong>${sender.name}</strong> needs your support right now.</p>
          <div style="background:#FEF2F2;padding:16px;border-radius:8px;margin:16px 0;">
            <p style="margin:0;font-style:italic;">"${message}"</p>
          </div>
          <p style="color:#6B7280;font-size:13px;">This alert was sent via MindMate. Please check in on them as soon as possible.</p>
        </div>
      `,
    });

    console.log(`✅ SOS email sent to ${recipientEmail}`);
    res.status(200).json({ success: true });

  } catch (error) {
    console.error('❌ Email SOS error:', error);
    res.status(500).json({ error: 'Email failed', details: error.message });
  }
});

/* ══════════════════════════════════════════════════════════════
   3. SMS via Twilio
   POST /api/alert/sos/sms
══════════════════════════════════════════════════════════════ */
router.post('/sos/sms', authenticate, async (req, res) => {
  try {
    const { message } = req.body;

    const twilioClient = getTwilioClient();
    if (!twilioClient) {
      return res.status(500).json({ error: 'Twilio not configured properly in .env' });
    }

    const sender = await User.findById(req.userId);
    if (!sender) return res.status(404).json({ error: 'User not found' });

    const contact = sender.emergencyContact;
    if (!contact?.phone) return res.status(404).json({ error: 'No emergency contact phone number found' });

    await twilioClient.messages.create({
      body: `🆘 SOS from ${sender.name}: ${message}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: contact.phone,
    });

    console.log(`✅ SOS SMS sent to ${contact.phone}`);
    res.status(200).json({ success: true });

  } catch (error) {
    console.error('❌ Twilio SMS SOS error:', error);
    res.status(500).json({ error: 'SMS failed', details: error.message });
  }
});

module.exports = router;