/**
 * JourneyHub Email Delivery Service
 * Powered by Nodemailer with Gmail SMTP
 *
 * Supported Environment Variables:
 * - SMTP_HOST (default: smtp.gmail.com)
 * - SMTP_PORT (default: 587)
 * - SMTP_SECURE (default: false for 587, true for 465)
 * - SMTP_USER (e.g., journeyhub8@gmail.com)
 * - SMTP_PASS (16-character Google App Password)
 * - EMAIL_FROM (e.g., "JourneyHub" <journeyhub8@gmail.com>)
 */
const nodemailer = require('nodemailer');
const { sanitizeEnvValue, getEnvDiagnostics } = require('../config/env');

let etherealAccount = null;

/**
 * Check whether email delivery (Resend or Gmail SMTP) is properly configured
 */
function isSmtpConfigured() {
  const diag = getEnvDiagnostics();
  if (process.env.NODE_ENV === 'test') {
    return diag.isConfigured;
  }
  let hasResend = false;
  try {
    const resendService = require('./resendService');
    hasResend = resendService.isResendConfigured();
  } catch (_) {}
  return diag.isConfigured || hasResend;
}

/**
 * Get safe Email/SMTP status without leaking secret credentials
 */
function getSmtpStatus() {
  const diag = getEnvDiagnostics();
  let resendStatus = { isConfigured: false };
  try {
    const resendService = require('./resendService');
    resendStatus = resendService.getResendStatus();
  } catch (_) {}

  const isResend = resendStatus.isConfigured;
  return {
    isConfigured: diag.isConfigured || isResend,
    provider: isResend ? 'resend' : (diag.isConfigured ? 'smtp' : 'none'),
    smtpHost: diag.smtpHost,
    smtpPort: diag.smtpPort,
    smtpSecure: diag.smtpSecure,
    smtpUserMasked: isResend ? resendStatus.sender : diag.smtpUserMasked,
    hasSmtpUser: diag.hasSmtpUser || isResend,
    hasSmtpPass: diag.hasSmtpPass || isResend,
    activeEnvFile: diag.activeEnvFile,
    backendEnvExists: diag.backendEnvExists,
    rootEnvExists: diag.rootEnvExists,
    nodeEnv: diag.nodeEnv
  };
}

/**
 * Create or acquire a Nodemailer transporter instance
 */
async function getTransporter() {
  const host = sanitizeEnvValue(process.env.SMTP_HOST) || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = sanitizeEnvValue(process.env.SMTP_USER);
  const pass = sanitizeEnvValue(process.env.SMTP_PASS);
  const secure = String(process.env.SMTP_SECURE).toLowerCase() === 'true' || port === 465;

  // In automated test suite, use fast deterministic mock transport
  if (process.env.NODE_ENV === 'test' && process.env.TEST_REAL_SMTP !== 'true') {
    return {
      transporter: {
        sendMail: async (mailOpts) => ({
          messageId: 'mock_mail_' + Date.now(),
          envelope: { to: [mailOpts.to] }
        })
      },
      from: `"JourneyHub Test Mailer" <journeyhub8@gmail.com>`,
      isDev: true
    };
  }

  if (isSmtpConfigured()) {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    });

    return {
      transporter,
      from: process.env.EMAIL_FROM || `"JourneyHub" <${user}>`,
      isDev: false
    };
  }

  // When unconfigured, do not pretend an email was sent!
  const error = new Error(
    'Gmail SMTP is not configured. To receive real verification codes, please configure SMTP_USER and SMTP_PASS (your 16-character Google App Password) in your backend .env file.'
  );
  error.code = 'SMTP_NOT_CONFIGURED';
  throw error;
}

/**
 * Send real 6-digit Email OTP for user registration
 */
async function sendEmailOtp({ to, name, otp }) {
  const cleanTo = (to || '').toString().trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanTo)) {
    const err = new Error(`Invalid email address format: "${to}". Please enter a valid email address.`);
    err.code = 'INVALID_EMAIL_ADDRESS';
    throw err;
  }

  // If not test mode and Resend is configured, prioritize Resend API
  if (process.env.NODE_ENV !== 'test') {
    try {
      const resendService = require('./resendService');
      if (resendService.isResendConfigured()) {
        console.log(`[Email] Dispatching OTP to ${cleanTo} via Resend REST API...`);
        return await resendService.sendEmailOtp({ to: cleanTo, name, otp });
      }
    } catch (_) {}
  }

  const { transporter, from, isDev } = await getTransporter();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0; }
        .header { background: #0f172a; padding: 28px 24px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
        .header span { color: #0d9488; }
        .content { padding: 36px 28px; text-align: center; }
        .welcome { font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #0f172a; }
        .intro { font-size: 15px; color: #64748b; line-height: 1.6; margin-bottom: 24px; }
        .otp-box { background: #f0fdfa; border: 2px dashed #0d9488; border-radius: 12px; padding: 20px; margin: 24px 0; display: inline-block; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #0d9488; margin: 0; }
        .expiry-note { font-size: 14px; color: #e11d48; margin-top: 16px; font-weight: 600; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Journey<span>Hub</span></h1>
        </div>
        <div class="content">
          <div class="welcome">Welcome to JourneyHub, ${name || 'Traveler'}!</div>
          <div class="intro">
            Use the 6-digit verification code below to verify your email address and complete your account registration:
          </div>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          <div class="expiry-note">
            ⏱️ This verification code expires in 5 minutes.
          </div>
          <p style="font-size: 13px; color: #94a3b8; margin-top: 24px; line-height: 1.5;">
            If you did not initiate this registration request, you can safely ignore this email.
          </p>
        </div>
        <div class="footer">
          JourneyHub &copy; 2026 &bull; Collaborative Travel Planning Platform
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Welcome to JourneyHub, ${name || 'Traveler'}!\n\nYour 6-digit email verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you did not request this, please ignore this email.\n\n— The JourneyHub Team`;

  const info = await transporter.sendMail({
    from,
    to: cleanTo,
    subject: `${otp} is your JourneyHub Email Verification Code`,
    text,
    html
  });

  return {
    success: true,
    messageId: info.messageId,
    email: cleanTo
  };
}

/**
 * Send real 6-digit Password Reset OTP
 */
async function sendPasswordResetOtp({ to, name, otp }) {
  const cleanTo = (to || '').toString().trim().toLowerCase();

  // If not test mode and Resend is configured, prioritize Resend API
  if (process.env.NODE_ENV !== 'test') {
    try {
      const resendService = require('./resendService');
      if (resendService.isResendConfigured()) {
        return await resendService.sendPasswordResetOtp({ to: cleanTo, name, otp });
      }
    } catch (_) {}
  }

  const { transporter, from } = await getTransporter();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0; }
        .header { background: #0f172a; padding: 28px 24px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; }
        .header span { color: #f97316; }
        .content { padding: 36px 28px; text-align: center; }
        .welcome { font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #0f172a; }
        .intro { font-size: 15px; color: #64748b; line-height: 1.6; margin-bottom: 24px; }
        .otp-box { background: #fff7ed; border: 2px dashed #f97316; border-radius: 12px; padding: 20px; margin: 24px 0; display: inline-block; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #f97316; margin: 0; }
        .expiry-note { font-size: 14px; color: #e11d48; margin-top: 16px; font-weight: 600; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Journey<span>Hub</span></h1>
        </div>
        <div class="content">
          <div class="welcome">Password Reset Request</div>
          <div class="intro">
            Hello ${name || 'User'}, we received a request to reset your password. Use the following code to proceed:
          </div>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          <div class="expiry-note">
            ⏱️ This code is valid for 10 minutes only.
          </div>
        </div>
        <div class="footer">
          JourneyHub &copy; 2026 &bull; Collaborative Travel Planning Platform
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hello ${name || 'User'},\n\nYour password reset code is: ${otp}\n\nValid for 10 minutes.\n\n— The JourneyHub Team`;

  const info = await transporter.sendMail({
    from,
    to: cleanTo,
    subject: `${otp} is your JourneyHub Password Reset Code`,
    text,
    html
  });

  return { success: true, messageId: info.messageId, email: cleanTo };
}

module.exports = {
  isSmtpConfigured,
  getSmtpStatus,
  sendEmailOtp,
  sendPasswordResetOtp
};
