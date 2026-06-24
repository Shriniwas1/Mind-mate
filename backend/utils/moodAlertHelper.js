const Mood = require('../models/Mood');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendWellnessAlertEmail } = require('./emailService');
const twilio = require('twilio');

const getTwilioClient = () => {
  const sid = process.env.TWILIO_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || !sid.startsWith('AC')) return null;
  return twilio(sid, token);
};

function groupByDay(moods) {
  const dayMap = new Map();

  moods.forEach(m => {
    const dayKey = new Date(m.date).toISOString().slice(0, 10);
    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, { date: m.date, scores: [], emotions: [] });
    }
    const entry = dayMap.get(dayKey);
    entry.scores.push(m.finalMoodScore);
    entry.emotions.push(m.dominantEmotion || 'neutral');
  });

  const days = [];
  for (const [, entry] of dayMap) {
    const avgScore = entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length;

    const freq = {};
    let topEmotion = 'neutral';
    let topCount = 0;
    entry.emotions.forEach(e => {
      freq[e] = (freq[e] || 0) + 1;
      if (freq[e] > topCount) { topCount = freq[e]; topEmotion = e; }
    });

    days.push({
      date: entry.date,
      score: avgScore,
      emotion: topEmotion,
    });
  }

  days.sort((a, b) => new Date(a.date) - new Date(b.date));
  return days;
}

const normalizeTo100 = (score) => {
  const normalized = ((score + 1) / 2) * 100;
  return Math.max(0, Math.min(100, Math.round(normalized)));
};

async function checkAndTriggerMoodAlerts(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.log(`❌ [Mood Check Helper] User not found: ${userId}`);
      return { success: false, reason: 'User not found' };
    }

    const contact = user.emergencyContact;
    if (!contact) {
      console.log(`ℹ️ [Mood Check Helper] No emergency contact set for ${user.name}`);
      return { success: false, reason: 'No emergency contact' };
    }

    // Fetch trends for the last 30 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const moods = await Mood.find({
      userId: userId,
      date: { $gte: startDate },
    }).sort({ date: 1 });

    if (moods.length === 0) {
      console.log(`ℹ️ [Mood Check Helper] No mood entries in last 30 days for ${user.name}`);
      return { success: false, reason: 'No mood entries' };
    }

    const dailyPoints = groupByDay(moods);
    const averageScore = dailyPoints.reduce((sum, d) => sum + d.score, 0) / dailyPoints.length;
    const normalizedAvg = normalizeTo100(averageScore);

    console.log(`ℹ️ [Mood Check Helper] User ${user.name} normalized 30-day average: ${normalizedAvg}%`);

    if (normalizedAvg > 20) {
      return { success: false, reason: `Score is stable: ${normalizedAvg}%` };
    }

    // Throttle check: 24h limit
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAlert = await Notification.findOne({
      sender: userId,
      message: { $regex: /low.score/i },
      createdAt: { $gte: oneDayAgo },
    });

    if (recentAlert) {
      console.log(`⏭ [Mood Check Helper] Low score alert already sent within 24h for ${user.name}`);
      return { success: false, reason: 'Alert already sent in the last 24 hours' };
    }

    const dominantEmotion = dailyPoints.length > 0
      ? (dailyPoints[dailyPoints.length - 1].emotion || 'Unknown')
      : 'Unknown';

    const alertMessage = `💛 Wellness Check: ${user.name}'s mood score has dropped below 20% today. They may need some extra support.`;

    let emailSent = false;
    let smsSent = false;
    let inApp = false;

    if (contact.hasApp) {
      const contactUser = await User.findOne({ email: contact.email.toLowerCase() });
      if (contactUser) {
        await Notification.create({
          recipient: contactUser._id,
          sender: userId,
          message: alertMessage,
          isRead: false,
        });
        inApp = true;
        console.log(`✅ [Mood Check Helper] In-app notification created for ${contactUser.name}`);
      }
    } else {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS && contact.email) {
        try {
          const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
          await sendWellnessAlertEmail(contact, user, normalizedAvg, dominantEmotion, appUrl);
          emailSent = true;
          console.log(`✅ [Mood Check Helper] Email alert sent to ${contact.email}`);
        } catch (emailErr) {
          console.warn(`⚠️ [Mood Check Helper] Email failed: ${emailErr.message}`);
        }
      }

      if (contact.phone) {
        try {
          const twilioClient = getTwilioClient();
          if (twilioClient) {
            await twilioClient.messages.create({
              body: `💛 Wellness Alert: ${user.name}'s mood score has dropped below 20% today. Please check in on them.`,
              from: process.env.TWILIO_PHONE_NUMBER,
              to: contact.phone,
            });
            smsSent = true;
            console.log(`✅ [Mood Check Helper] SMS alert sent to ${contact.phone}`);
          }
        } catch (smsErr) {
          console.warn(`⚠️ [Mood Check Helper] SMS failed: ${smsErr.message}`);
        }
      }
    }

    // Record notification sent so we don't repeat for 24h
    await Notification.create({
      recipient: userId,
      sender: userId,
      message: 'low-score alert sent',
      isRead: true,
    });

    return { success: true, emailSent, smsSent, inApp };
  } catch (error) {
    console.error('❌ Error in checkAndTriggerMoodAlerts:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { checkAndTriggerMoodAlerts };
