/**
 * JourneyHub Resend Email Delivery Service
 * Designed for serverless runtimes (Cloudflare Workers & Node.js)
 * Dispatches real transactional verification emails via Resend's HTTPS REST API.
 */

function sanitizeVal(val) {
  if (!val) return '';
  return val.toString().trim();
}

function getApiKey() {
  return sanitizeVal(process.env.RESEND_API_KEY);
}

function isResendConfigured() {
  const key = getApiKey();
  return Boolean(key && key.startsWith('re_') && key.length >= 20);
}

function getResendStatus() {
  const key = getApiKey();
  const configured = isResendConfigured();
  return {
    provider: 'resend',
    isConfigured: configured,
    apiKeyMasked: configured ? `${key.slice(0, 6)}••••${key.slice(-4)}` : '(none)',
    sender: sanitizeVal(process.env.RESEND_FROM) || 'JourneyHub <onboarding@resend.dev>'
  };
}

async function sendViaResend({ to, subject, html, text }) {
  const apiKey = getApiKey();
  if (!isResendConfigured()) {
    const error = new Error('Resend API key is not configured. Please set RESEND_API_KEY in your Cloudflare Worker secrets or .env file.');
    error.code = 'RESEND_NOT_CONFIGURED';
    throw error;
  }

  const from = sanitizeVal(process.env.RESEND_FROM) || 'JourneyHub <onboarding@resend.dev>';
  const cleanTo = Array.isArray(to) ? to : [to.toString().trim().toLowerCase()];

  const payload = {
    from,
    to: cleanTo,
    subject,
    html,
    text
  };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.message || `Resend delivery failed with status ${response.status}`);
    err.code = data.name || 'RESEND_ERROR';
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return {
    success: true,
    id: data.id,
    to: cleanTo
  };
}

/**
 * Send real 6-digit Email OTP for user registration via Resend
 */
async function sendEmailOtp({ to, name, otp }) {
  const cleanTo = (to || '').toString().trim().toLowerCase();
  const userName = name || 'Traveler';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }
        .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 32px 24px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
        .header h1 span { color: #fde047; }
        .content { padding: 32px 24px; color: #1e293b; line-height: 1.6; }
        .welcome { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
        .otp-box { background: #f0fdfa; border: 2px dashed #0d9488; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0; }
        .otp-label { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #0d9488; margin-bottom: 8px; }
        .otp-code { font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #0f766e; font-family: monospace; }
        .expiry-note { font-size: 13px; color: #64748b; margin-top: 8px; font-weight: 500; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Journey<span>Hub</span></h1>
        </div>
        <div class="content">
          <div class="welcome">Verify Your Email Address</div>
          <div>Hello <strong>${userName}</strong>, welcome to JourneyHub! Use the following one-time code to complete your registration:</div>
          <div class="otp-box">
            <div class="otp-label">Verification Code</div>
            <div class="otp-code">${otp}</div>
            <div class="expiry-note">Expires in 5 minutes &bull; Do not share with anyone</div>
          </div>
          <div>If you did not request this verification, please disregard this message.</div>
        </div>
        <div class="footer">
          JourneyHub &copy; 2026 &bull; Collaborative Travel Intelligence Platform
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hello ${userName},\n\nYour JourneyHub verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\n— The JourneyHub Team`;

  return sendViaResend({
    to: cleanTo,
    subject: `${otp} is your JourneyHub verification code`,
    html,
    text
  });
}

/**
 * Send Password Reset OTP via Resend
 */
async function sendPasswordResetOtp({ to, name, otp }) {
  const cleanTo = (to || '').toString().trim().toLowerCase();
  const userName = name || 'Traveler';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: sans-serif; background-color: #f1f5f9; padding: 20px; }
        .container { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; }
        .otp-box { background: #fef2f2; border: 2px dashed #ef4444; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
        .otp-code { font-size: 34px; font-weight: bold; letter-spacing: 8px; color: #b91c1c; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>JourneyHub Password Reset</h2>
        <p>Hello ${userName}, use the code below to reset your password:</p>
        <div class="otp-box">
          <div class="otp-code">${otp}</div>
          <p>Valid for 10 minutes only.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendViaResend({
    to: cleanTo,
    subject: `${otp} is your JourneyHub password reset code`,
    html,
    text: `Your password reset code is: ${otp} (valid for 10 minutes).`
  });
}

module.exports = {
  isResendConfigured,
  getResendStatus,
  sendEmailOtp,
  sendPasswordResetOtp
};
