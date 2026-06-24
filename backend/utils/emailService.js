const nodemailer = require('nodemailer');

// ─── Shared transporter (reuses Gmail credentials already in .env) ────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send a 6-digit OTP email for password reset.
 * @param {string} to       - Recipient email address
 * @param {string} otp      - Plain 6-digit OTP (shown in email, never stored plain)
 * @param {string} name     - Recipient's display name
 */
const sendOtpEmail = async (to, otp, name) => {
  const digits = otp.split('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#F0F4FF;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:20px;overflow:hidden;
                      box-shadow:0 8px 40px rgba(99,102,241,0.12);">
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:36px 40px;text-align:center;">
              <div style="font-size:36px;margin-bottom:8px;">🧠</div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">MindMate</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Password Reset Request</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;color:#374151;font-size:16px;">Hi <strong>${name}</strong>,</p>
              <p style="margin:0 0 28px;color:#6B7280;font-size:15px;line-height:1.6;">
                We received a request to reset your MindMate password.
                Use the code below — it expires in <strong>10 minutes</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  ${digits.map(d => `
                  <td style="padding:0 5px;">
                    <div style="width:48px;height:56px;line-height:56px;text-align:center;
                                background:#F5F3FF;border:2px solid #8b5cf6;
                                border-radius:12px;font-size:24px;font-weight:800;color:#6366f1;">
                      ${d}
                    </div>
                  </td>`).join('')}
                </tr>
              </table>
              <p style="margin:0 0 28px;color:#9CA3AF;font-size:13px;text-align:center;">
                If you didn't request this, you can safely ignore this email.
              </p>
              <hr style="border:none;border-top:1px solid #E5E7EB;margin:0 0 24px;" />
              <p style="margin:0;color:#9CA3AF;font-size:12px;text-align:center;">
                This code will expire in 10 minutes &nbsp;·&nbsp;
                <span style="color:#6366f1;">MindMate Mental Wellness</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"MindMate" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${otp} is your MindMate reset code`,
    html,
  });
};

/**
 * Send a rich wellness alert email to an emergency contact.
 * Mirrors the FriendHealthCard UI shown in the app.
 *
 * @param {object} contact        - { name, email }
 * @param {object} user           - { name }  (the person in distress)
 * @param {number} avgScore       - 0-100 wellness score
 * @param {string} dominantEmotion
 * @param {string} appUrl         - frontend base URL for the CTA button
 */
const sendWellnessAlertEmail = async (contact, user, avgScore, dominantEmotion, appUrl = 'http://localhost:5173') => {
  // Derive alert level colours
  let alertColor, alertBg, alertLabel;
  if (avgScore <= 20) {
    alertColor = '#dc2626'; alertBg = '#fef2f2'; alertLabel = 'Critical Wellness Level';
  } else if (avgScore <= 40) {
    alertColor = '#ea580c'; alertBg = '#fff7ed'; alertLabel = 'Low Wellness Level';
  } else {
    alertColor = '#ca8a04'; alertBg = '#fefce8'; alertLabel = 'Below Average';
  }

  const radius = 42;
  const circumference = +(2 * Math.PI * radius).toFixed(1);
  const dashoffset = +(circumference - (avgScore / 100) * circumference).toFixed(1);
  const emotionLabel = dominantEmotion
    ? dominantEmotion.charAt(0).toUpperCase() + dominantEmotion.slice(1)
    : 'Unknown';

  const helpRows = [
    ['&#128172;', 'Send a voice note &mdash; hearing your voice can mean everything'],
    ['&#128222;', 'Give them a call, even just 10 minutes matters'],
    ['&#129309;', 'Text them: &ldquo;No pressure, I&rsquo;m just here for you&rdquo;'],
  ];

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0"
           style="background:#ffffff;border-radius:20px;overflow:hidden;
                  box-shadow:0 10px 48px rgba(0,0,0,0.10);">

      <!-- Siren Header -->
      <tr>
        <td style="background:linear-gradient(135deg,${alertColor},${alertColor}cc);padding:28px 36px;text-align:center;">
          <div style="font-size:40px;margin-bottom:8px;">&#128680;</div>
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;">Action Recommended</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.88);font-size:14px;">
            Your friend <strong>${user.name}</strong> needs support right now
          </p>
        </td>
      </tr>

      <!-- Subheader pill -->
      <tr>
        <td style="background:${alertBg};padding:14px 36px;text-align:center;">
          <span style="display:inline-block;background:${alertColor}18;border:1px solid ${alertColor}40;
                        color:${alertColor};font-size:11px;font-weight:700;padding:5px 14px;
                        border-radius:20px;letter-spacing:0.5px;text-transform:uppercase;">
            MindMate detected a severe drop in their wellness score
          </span>
        </td>
      </tr>

      <!-- Wellness ring + stats -->
      <tr>
        <td style="padding:32px 36px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <!-- SVG ring -->
              <td width="150" align="center" valign="top">
                <svg width="120" height="120" viewBox="0 0 100 100"
                     style="transform:rotate(-90deg);display:block;margin:0 auto;">
                  <circle cx="50" cy="50" r="${radius}" stroke="#e2e8f0"
                          stroke-width="7" fill="transparent"/>
                  <circle cx="50" cy="50" r="${radius}" stroke="${alertColor}"
                          stroke-width="7" fill="transparent"
                          stroke-dasharray="${circumference}"
                          stroke-dashoffset="${dashoffset}"
                          stroke-linecap="round"/>
                </svg>
                <div style="text-align:center;margin-top:-75px;margin-bottom:45px;">
                  <span style="font-size:26px;font-weight:900;color:${alertColor};">${avgScore}%</span>
                </div>
                <p style="margin:0;font-size:10px;font-weight:700;color:#64748b;
                            text-transform:uppercase;letter-spacing:0.5px;text-align:center;">
                  Wellness
                </p>
              </td>
              <!-- Details -->
              <td style="padding-left:24px;" valign="middle">
                <div style="background:${alertColor}12;border:1.5px solid ${alertColor}35;
                              border-radius:10px;padding:10px 14px;margin-bottom:14px;">
                  <p style="margin:0;font-size:13px;font-weight:800;color:${alertColor};">
                    &#9888;&#65039; ${alertLabel}
                  </p>
                </div>
                <table cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                  <tr>
                    <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;">
                      <p style="margin:0;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">
                        Dominant Emotion
                      </p>
                      <p style="margin:4px 0 0;font-size:17px;font-weight:800;color:#1e293b;">
                        ${emotionLabel}
                      </p>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
                  <strong>${user.name}</strong> could really use a friendly check-in from you right now.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Divider -->
      <tr><td style="padding:0 36px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;"/></td></tr>

      <!-- Urgency message -->
      <tr>
        <td style="padding:24px 36px;">
          <div style="background:${alertBg};border-left:4px solid ${alertColor};border-radius:0 10px 10px 0;padding:16px 20px;">
            <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">
              Your friend needs you right now. You don&rsquo;t need the perfect words &mdash;
              just reaching out and showing up is more than enough.
              A simple <em>&ldquo;Hey, thinking of you&rdquo;</em> can mean everything.
            </p>
          </div>
        </td>
      </tr>

      <!-- CTA Button -->
      <tr>
        <td style="padding:0 36px 32px;text-align:center;">
          <a href="${appUrl}/dashboard"
             style="display:inline-block;background:${alertColor};color:#ffffff;
                    font-size:16px;font-weight:700;text-decoration:none;
                    padding:14px 36px;border-radius:12px;
                    box-shadow:0 4px 14px ${alertColor}44;">
            Connect with ${user.name} now &#8594;
          </a>
          <p style="margin:14px 0 0;font-size:12px;color:#94a3b8;">Opens your MindMate dashboard</p>
        </td>
      </tr>

      <!-- Ways to help -->
      <tr>
        <td style="padding:0 36px 28px;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#64748b;
                      text-transform:uppercase;letter-spacing:0.5px;">
            Ways you can help right now
          </p>
          ${helpRows.map(([icon, text]) => `
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;
                       padding:12px 16px;margin-bottom:8px;display:block;">
            <span style="font-size:16px;margin-right:8px;">${icon}</span>
            <span style="font-size:13px;color:#374151;font-weight:500;">${text}</span>
          </div>`).join('')}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f8fafc;padding:18px 36px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.7;">
            You received this because <strong>${user.name}</strong> listed you as their trusted
            emergency contact in MindMate.<br/>
            Only the wellness score threshold is shared &mdash; all journal content stays private.
            &nbsp;&middot;&nbsp;
            <span style="color:#6366f1;font-weight:600;">MindMate Mental Wellness</span>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"MindMate Wellness Alert" <${process.env.EMAIL_USER}>`,
    to: contact.email,
    subject: `🚨 ${user.name} needs your support right now — Wellness: ${avgScore}%`,
    html,
  });
};

module.exports = { sendOtpEmail, sendWellnessAlertEmail };
