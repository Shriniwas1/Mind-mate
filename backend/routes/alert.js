const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const Notification = require('../models/Notification');
const User = require('../models/User');
const twilio = require('twilio');
const { sendEmail } = require('../utils/emailService');

/* ─── Twilio lazy init ────────────────────────────────────────── */
const getTwilioClient = () => {
  const sid = process.env.TWILIO_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || !sid.startsWith('AC')) return null;
  return twilio(sid, token);
};

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

    let recipientId = req.userId;
    if (contact.hasApp && contact.email) {
      const contactUser = await User.findOne({ email: contact.email.toLowerCase() });
      if (contactUser) {
        recipientId = contactUser._id;
      }
    }

    const notification = await Notification.create({
      recipient: recipientId,
      sender: req.userId,
      message: `🆘 SOS from ${sender.name}: ${message}`,
      isRead: false,
    });

    console.log(`✅ In-app SOS notification saved for recipient ${recipientId}`);
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

    if (!process.env.RESEND_API_KEY && !process.env.BREVO_API_KEY && (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      return res.status(500).json({ error: 'Email sending is not configured on the server. Please set up RESEND_API_KEY, BREVO_API_KEY, or EMAIL_USER/EMAIL_PASS.' });
    }

    const sender = await User.findById(req.userId);
    if (!sender) return res.status(404).json({ error: 'User not found' });

    const contact = sender.emergencyContact;
    if (!contact) return res.status(404).json({ error: 'No emergency contact found' });

    const recipientEmail = contact.email;
    if (!recipientEmail) return res.status(404).json({ error: 'Emergency contact has no email address' });

    await sendEmail({
      fromName: "MindMate SOS",
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

/* ─── TEST EMAIL CONNECTION ───
   GET /api/alert/test-email
*/
router.get('/test-email', async (req, res) => {
  try {
    const testRecipient = req.query.to || process.env.EMAIL_USER || 'test@example.com';
    
    if (process.env.RESEND_API_KEY) {
      const result = await sendEmail({
        to: testRecipient,
        subject: 'MindMate Email Test (Resend)',
        html: '<p>This is a diagnostic test email from your MindMate deployment on Hugging Face using Resend API!</p>',
        fromName: 'MindMate Diagnostic'
      });
      return res.status(200).json({
        success: true,
        message: 'Successfully sent diagnostic test email via Resend API!',
        details: result
      });
    }

    if (process.env.BREVO_API_KEY) {
      const result = await sendEmail({
        to: testRecipient,
        subject: 'MindMate Email Test (Brevo)',
        html: '<p>This is a diagnostic test email from your MindMate deployment on Hugging Face using Brevo API!</p>',
        fromName: 'MindMate Diagnostic'
      });
      return res.status(200).json({
        success: true,
        message: 'Successfully sent diagnostic test email via Brevo API!',
        details: result
      });
    }

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      await transporter.verify();
      return res.status(200).json({
        success: true,
        message: 'SMTP connection (Nodemailer) verified successfully!'
      });
    }

    return res.status(400).json({
      success: false,
      error: 'No email service is configured. Set RESEND_API_KEY, BREVO_API_KEY, or EMAIL_USER/EMAIL_PASS.'
    });

  } catch (error) {
    console.error('❌ Email test connection failed:', error);
    res.status(500).json({
      success: false,
      error: 'Email test connection failed',
      details: error.message,
      code: error.code,
      command: error.command
    });
  }
});

module.exports = router;