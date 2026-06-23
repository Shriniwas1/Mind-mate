const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const User = require('../models/User');
const Mood = require('../models/Mood');
const Journal = require('../models/Journal');
const Notification = require('../models/Notification');
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

/* ─── Support task suggestion pool (rotated per request) ─────── */
const SUPPORT_TASKS = [
  "Send them a voice note right now — hearing your voice can mean everything.",
  "Text them: 'No pressure, just checking in. I'm here whenever you need.'",
  "Schedule a video call with them today, even just 10 minutes.",
  "Share a funny memory or inside joke you both have.",
  "Drop by with their favorite snack or comfort food.",
  "Send them a playlist of songs that remind you of good times together.",
  "Ask them if they'd like to go for a walk — movement helps mood.",
  "Remind them of a time they overcame something really difficult.",
  "Watch a movie or show together remotely (sync up on Netflix).",
  "Write them a short letter about why they matter to you.",
  "Send a care package with their favorite things.",
  "Play an online game together — distraction can be healing.",
  "Ask them 'What's one thing that would make tomorrow slightly better?'",
  "Share an article or video that made you think of them positively.",
  "Simply say: 'You don't have to explain anything. I'm just here.'",
  "Set a daily check-in reminder for the next 3 days.",
  "Send them a photo from a happy shared memory.",
  "Ask if they've eaten today — basic care matters.",
  "Tell them one specific thing you admire about them.",
  "Offer to help with something practical: errands, calls, tasks.",
];

/**
 * Get a random selection of N tasks, seeded by the hour
 * so they rotate every hour (never completely static, never always the same).
 */
function getDynamicTasks(count = 3, seed = 0) {
  const shuffled = [...SUPPORT_TASKS].sort(() => {
    // Deterministic-ish shuffle based on seed + time hour
    const h = new Date().getHours() + seed;
    return Math.sin(h * Math.random() * 9301 + 49297) - 0.5;
  });
  return shuffled.slice(0, count);
}

/* ══════════════════════════════════════════════════════════════
   1. GET FRIEND HEALTH REPORT
   GET /api/friend/report
   
   Returns the wellness report of the person who listed the
   currently authenticated user as their emergency contact.
   Only works if that person's emergencyContact.hasApp === true.
══════════════════════════════════════════════════════════════ */
router.get('/report', authenticate, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    // Find someone who has listed currentUser as their emergency contact
    const friend = await User.findOne({
      'emergencyContact.email': currentUser.email.toLowerCase(),
      'emergencyContact.hasApp': true,
    });

    if (!friend) {
      // No one has listed this user as a hasApp emergency contact
      return res.status(200).json({ hasFriendInNeed: false, friend: null });
    }

    // Fetch friend's recent mood trends (last 30 days to align with dashboard)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMoods = await Mood.find({
      userId: friend._id,
      date: { $gte: thirtyDaysAgo },
    }).sort({ date: 1 });

    // Calculate average score (normalize from [-1,1] to [0,100])
    const normalize = (s) => Math.max(0, Math.min(100, Math.round(((s + 1) / 2) * 100)));

    let avgScore = 0;
    let trend = 'stable'; // 'improving' | 'declining' | 'stable'

    if (recentMoods.length > 0) {
      const scores = recentMoods.map(m => normalize(m.finalMoodScore));
      avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

      // Trend: compare last 3 vs first 3
      if (scores.length >= 4) {
        const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
        const secondHalf = scores.slice(Math.floor(scores.length / 2));
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        if (secondAvg - firstAvg > 5) trend = 'improving';
        else if (firstAvg - secondAvg > 5) trend = 'declining';
      }
    }

    // Latest dominant emotion
    const latestMood = recentMoods[recentMoods.length - 1];
    const dominantEmotion = latestMood?.dominantEmotion || 'neutral';

    // Latest journal summary (if exists and created in the last 24 hours)
    let journalSummary = null;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const latestJournal = await Journal.findOne({ 
      userId: friend._id,
      createdAt: { $gte: oneDayAgo }
    })
      .sort({ createdAt: -1 })
      .limit(1);
      
    if (latestJournal?.textSentiment?.summary) {
      journalSummary = latestJournal.textSentiment.summary;
    }


    // Dynamic support tasks (rotate each hour)
    const supportTasks = getDynamicTasks(3, req.userId.toString().charCodeAt(0));

    // Determine alert level
    let alertLevel = 'ok'; // 'ok' | 'watch' | 'concern' | 'critical'
    if (avgScore <= 20) alertLevel = 'critical';
    else if (avgScore <= 40) alertLevel = 'concern';
    else if (avgScore <= 55) alertLevel = 'watch';

    const hasFriendInNeed = recentMoods.length > 0 && avgScore <= 20;

    if (!hasFriendInNeed) {
      console.log(`📊 [Friend Report] ${currentUser.name} checking on ${friend.name} — score: ${avgScore}. Friend is stable (above 20%), hiding banner.`);
      return res.status(200).json({ hasFriendInNeed: false, friend: null });
    }

    console.log(`📊 [Friend Report] ALERT! ${currentUser.name} checking on ${friend.name} — score: ${avgScore}, level: ${alertLevel}`);

    return res.status(200).json({
      hasFriendInNeed: true,
      alertLevel,
      friend: {
        name: friend.name,
        avgScore,
        trend,
        dominantEmotion,
        journalSummary,
        moodHistory: recentMoods.map(m => ({
          date: m.date,
          score: normalize(m.finalMoodScore),
          emotion: m.dominantEmotion,
        })),
        entryCount: recentMoods.length,
      },
      supportTasks,
    });


  } catch (error) {
    console.error('❌ Friend report error:', error);
    res.status(500).json({ error: 'Failed to fetch friend report', details: error.message });
  }
});

/* ══════════════════════════════════════════════════════════════
   2. LOW SCORE AUTO-ALERT
   POST /api/friend/low-score-alert
   
   Called by the frontend when the user's wellness score drops
   to ≤ 20%. Sends a gentle alert to the emergency contact.
   Idempotent — throttled server-side to once per 24 hours
   per user using a notification check.
══════════════════════════════════════════════════════════════ */
router.post('/low-score-alert', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const contact = user.emergencyContact;
    if (!contact) return res.status(200).json({ sent: false, reason: 'No emergency contact' });

    // Throttle: check if we already sent a low-score alert in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAlert = await Notification.findOne({
      sender: req.userId,
      message: { $regex: /low.score/i },
      createdAt: { $gte: oneDayAgo },
    });

    if (recentAlert) {
      console.log(`⏭ [Low Score Alert] Already sent within 24h for ${user.name}`);
      return res.status(200).json({ sent: false, reason: 'Already sent within 24 hours' });
    }

    const alertMessage = `💛 Wellness Check: ${user.name}'s mood score has dropped below 20% today. They may need some extra support.`;

    let emailSent = false;
    let smsSent = false;
    let inApp = false;

    if (contact.hasApp) {
      // Save in-app notification for the contact (if they have an account)
      const contactUser = await User.findOne({ email: contact.email.toLowerCase() });
      if (contactUser) {
        await Notification.create({
          recipient: contactUser._id,
          sender: req.userId,
          message: alertMessage,
          isRead: false,
        });
        inApp = true;
        console.log(`✅ [Low Score Alert] In-app notification created for ${contactUser.name}`);
      }
    } else {
      // Send email if configured
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS && contact.email) {
        try {
          await transporter.sendMail({
            from: `"MindMate Wellness" <${process.env.EMAIL_USER}>`,
            to: contact.email,
            subject: `💛 ${user.name} may need your support today`,
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:28px;border:1.5px solid #F59E0B;border-radius:14px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
                  <span style="font-size:28px;">💛</span>
                  <h2 style="margin:0;color:#92400E;font-size:18px;">Wellness Check from MindMate</h2>
                </div>
                <p style="color:#374151;font-size:15px;line-height:1.6;">
                  Hi <strong>${contact.name}</strong>,
                </p>
                <p style="color:#374151;font-size:15px;line-height:1.6;">
                  We noticed that <strong>${user.name}</strong>'s wellness score has dropped significantly today. 
                  They may be going through a tough time and could really use a friendly check-in.
                </p>
                <div style="background:#FFFBEB;border-left:4px solid #F59E0B;padding:16px;border-radius:8px;margin:20px 0;">
                  <p style="margin:0;color:#78350F;font-size:14px;">
                    <strong>What you can do:</strong><br/>
                    A simple text, call, or message can make a huge difference.
                    You don't need the perfect words — just showing up is enough.
                  </p>
                </div>
                <p style="color:#6B7280;font-size:12px;margin-top:24px;border-top:1px solid #E5E7EB;padding-top:16px;">
                  This alert was sent because ${user.name} listed you as their trusted emergency contact in MindMate. 
                  Their data is private and we only share this score threshold trigger.
                </p>
              </div>
            `,
          });
          emailSent = true;
          console.log(`✅ [Low Score Alert] Email sent to ${contact.email}`);
        } catch (emailErr) {
          console.warn(`⚠️ [Low Score Alert] Email failed: ${emailErr.message}`);
        }
      }

      // Send SMS if phone is present and Twilio is configured
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
            console.log(`✅ [Low Score Alert] SMS sent to ${contact.phone}`);
          } else {
            console.warn(`⚠️ [Low Score Alert] Twilio not configured properly in .env`);
          }
        } catch (smsErr) {
          console.warn(`⚠️ [Low Score Alert] SMS failed: ${smsErr.message}`);
        }
      }
    }

    // Store a record so we don't re-send for 24h
    await Notification.create({
      recipient: req.userId,
      sender: req.userId,
      message: 'low-score alert sent',
      isRead: true,
    });

    res.status(200).json({ sent: true, emailSent, smsSent, inApp });


  } catch (error) {
    console.error('❌ Low score alert error:', error);
    res.status(500).json({ error: 'Failed to send low score alert', details: error.message });
  }
});

/* ══════════════════════════════════════════════════════════════
   3. GET FRESH SUPPORT TASKS
   GET /api/friend/support-tasks
   Returns a fresh set of 3 non-repeating support tasks.
══════════════════════════════════════════════════════════════ */
router.get('/support-tasks', authenticate, async (req, res) => {
  try {
    // Use current minute as seed so tasks change every minute during dev
    const seed = new Date().getMinutes() + (req.userId.toString().charCodeAt(2) || 0);
    const tasks = getDynamicTasks(3, seed);
    res.status(200).json({ tasks });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tasks', details: error.message });
  }
});

/* ══════════════════════════════════════════════════════════════
   4. SHARE STREAK LEAGUE MILESTONE
   POST /api/friend/share-streak
   
   Sends a league progression milestone update to the emergency contact
   via in-app notification (if hasApp) or SMS & Email (if not hasApp).
══════════════════════════════════════════════════════════════ */
router.post('/share-streak', authenticate, async (req, res) => {
  try {
    const { leagueName, streakDays } = req.body;
    if (!leagueName || streakDays === undefined) {
      return res.status(400).json({ error: 'leagueName and streakDays are required' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const contact = user.emergencyContact;
    if (!contact) return res.status(400).json({ error: 'No emergency contact configured' });

    const shareMessage = `🎉 Wellness Milestone: ${user.name} has reached the ${leagueName} in MindMate with a ${streakDays}-day consistency streak! 💛`;

    let emailSent = false;
    let smsSent = false;
    let inApp = false;

    if (contact.hasApp) {
      // Find matching contact user account
      const contactUser = await User.findOne({ email: contact.email.toLowerCase() });
      if (contactUser) {
        await Notification.create({
          recipient: contactUser._id,
          sender: req.userId,
          message: shareMessage,
          isRead: false,
        });
        inApp = true;
        console.log(`✅ [Streak Share] In-app notification sent to ${contactUser.name}`);
      }
    } else {
      // Send Email
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS && contact.email) {
        try {
          await transporter.sendMail({
            from: `"MindMate Progress" <${process.env.EMAIL_USER}>`,
            to: contact.email,
            subject: `🎉 ${user.name} reached the ${leagueName}!`,
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:28px;border:1.5px solid #10B981;border-radius:14px;text-align:center;">
                <span style="font-size:48px;">🏆</span>
                <h2 style="margin:16px 0 8px 0;color:#065F46;font-size:20px;">Progress Milestone from MindMate</h2>
                <p style="color:#374151;font-size:15px;line-height:1.6;margin-bottom:20px;">
                  Hi <strong>${contact.name}</strong>,<br/>
                  Your friend <strong>${user.name}</strong> just shared their mental wellness streak milestone with you!
                </p>
                <div style="background:#ECFDF5;border:1px solid #A7F3D0;padding:20px;border-radius:12px;margin:20px 0;">
                  <h3 style="margin:0 0 4px 0;color:#047857;font-size:16px;">Unlocked: ${leagueName}</h3>
                  <p style="margin:0;color:#065F46;font-size:14px;font-weight:bold;">
                    ${streakDays} Days of Consistency
                  </p>
                </div>
                <p style="color:#374151;font-size:14px;line-height:1.6;">
                  Maintaining a daily routine helps support emotional stability. 
                  Let's celebrate their dedication to self-care!
                </p>
                <p style="color:#6B7280;font-size:12px;margin-top:24px;border-top:1px solid #E5E7EB;padding-top:16px;">
                  You received this email because ${user.name} listed you as their trusted partner in MindMate.
                </p>
              </div>
            `,
          });
          emailSent = true;
          console.log(`✅ [Streak Share] Email sent to ${contact.email}`);
        } catch (emailErr) {
          console.warn(`⚠️ [Streak Share] Email failed: ${emailErr.message}`);
        }
      }

      // Send SMS
      if (contact.phone) {
        try {
          const twilioClient = getTwilioClient();
          if (twilioClient) {
            await twilioClient.messages.create({
              body: shareMessage,
              from: process.env.TWILIO_PHONE_NUMBER,
              to: contact.phone,
            });
            smsSent = true;
            console.log(`✅ [Streak Share] SMS sent to ${contact.phone}`);
          }
        } catch (smsErr) {
          console.warn(`⚠️ [Streak Share] SMS failed: ${smsErr.message}`);
        }
      }
    }

    res.status(200).json({ success: true, inApp, emailSent, smsSent });
  } catch (error) {
    console.error('❌ Share streak error:', error);
    res.status(500).json({ error: 'Failed to share streak milestone', details: error.message });
  }
});

module.exports = router;

