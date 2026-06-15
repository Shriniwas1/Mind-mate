const nodemailer = require('nodemailer');
const twilio = require('twilio');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const getTwilioClient = () => {
  const sid = process.env.TWILIO_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || !sid.startsWith('AC')) return null;
  return twilio(sid, token);
};

/* ──────────────────────────────────────────────────────────
   Notify offline contact via email or SMS
   ────────────────────────────────────────────────────────── */
module.exports = async function notifyOfflineContact(contact, message, senderName) {
  try {
    if (contact.hasApp) {
      // Contact has the app, they'll receive in-app notification via socket
      return { success: true, method: 'in-app' };
    }

    // Try email first
    if (contact.email && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await transporter.sendMail({
          from: `"MindMate Chat" <${process.env.EMAIL_USER}>`,
          to: contact.email,
          subject: `💬 New message from ${senderName}`,
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #E5E7EB;border-radius:12px;">
              <h2 style="color:#3A6B5E;">💬 ${senderName} sent you a message</h2>
              <div style="background:#F3F4F6;padding:16px;border-radius:8px;margin:16px 0;">
                <p style="margin:0;font-style:italic;">"${message.substring(0, 200)}${message.length > 200 ? '...' : ''}"</p>
              </div>
              <p><a href="http://localhost:5173/dashboard" style="color:#3A6B5E;font-weight:bold;text-decoration:none;">Reply now →</a></p>
              <p style="color:#6B7280;font-size:13px;">Open MindMate to reply to this message.</p>
            </div>
          `,
        });
        console.log(`✅ Offline notification sent via email to ${contact.email}`);
        return { success: true, method: 'email' };
      } catch (emailError) {
        console.error('⚠️ Email notification failed:', emailError.message);
      }
    }

    // Try SMS as fallback
    if (contact.phone) {
      const twilioClient = getTwilioClient();
      if (twilioClient) {
        try {
          await twilioClient.messages.create({
            body: `${senderName} sent you a message on MindMate: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: contact.phone,
          });
          console.log(`✅ Offline notification sent via SMS to ${contact.phone}`);
          return { success: true, method: 'sms' };
        } catch (smsError) {
          console.error('⚠️ SMS notification failed:', smsError.message);
        }
      }
    }

    console.log(`⚠️ Could not notify offline contact via email or SMS`);
    return { success: false, method: 'none' };
  } catch (error) {
    console.error('❌ Offline notification error:', error);
    return { success: false, method: 'none', error: error.message };
  }
};
