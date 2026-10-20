/**
 * JourneyHub Unified Email Service
 * Intelligently routes email dispatch to:
 * 1. Resend (HTTP REST API - ideal for Cloudflare Workers & serverless)
 * 2. Nodemailer (Gmail SMTP - fallback for full Node.js runtimes)
 */
const resendService = require('./resendService');
const emailService = require('./emailService');

function getActiveProvider() {
  if (resendService.isResendConfigured()) {
    return 'resend';
  }
  if (emailService.isSmtpConfigured()) {
    return 'smtp';
  }
  return 'none';
}

function isEmailConfigured() {
  if (typeof module.exports.isSmtpConfigured === 'function' && module.exports.isSmtpConfigured !== isSmtpConfigured) {
    return module.exports.isSmtpConfigured();
  }
  return getActiveProvider() !== 'none';
}

function isSmtpConfigured() {
  return emailService.isSmtpConfigured();
}

function getEmailStatus() {
  const provider = getActiveProvider();
  if (provider === 'resend') {
    return {
      success: true,
      provider: 'resend',
      isConfigured: true,
      ...resendService.getResendStatus()
    };
  }
  if (provider === 'smtp') {
    return {
      success: true,
      provider: 'smtp',
      isConfigured: true,
      ...emailService.getSmtpStatus()
    };
  }
  return {
    success: true,
    provider: 'none',
    isConfigured: false,
    message: 'Neither Resend API key nor Gmail SMTP credentials are configured.'
  };
}

async function sendEmailOtp({ to, name, otp }) {
  const provider = getActiveProvider();
  if (provider === 'resend') {
    console.log(`[Email] Dispatching OTP to ${to} via Resend REST API...`);
    return await resendService.sendEmailOtp({ to, name, otp });
  }
  if (provider === 'smtp') {
    console.log(`[Email] Dispatching OTP to ${to} via Gmail SMTP...`);
    return await emailService.sendEmailOtp({ to, name, otp });
  }

  const err = new Error('No email delivery service configured. Please provide RESEND_API_KEY (for Cloudflare) or SMTP_USER & SMTP_PASS (for Render).');
  err.code = 'EMAIL_NOT_CONFIGURED';
  throw err;
}

async function sendPasswordResetOtp({ to, name, otp }) {
  const provider = getActiveProvider();
  if (provider === 'resend') {
    return await resendService.sendPasswordResetOtp({ to, name, otp });
  }
  if (provider === 'smtp') {
    return await emailService.sendPasswordResetOtp({ to, name, otp });
  }

  const err = new Error('No email delivery service configured.');
  err.code = 'EMAIL_NOT_CONFIGURED';
  throw err;
}

module.exports = {
  getActiveProvider,
  isEmailConfigured,
  isSmtpConfigured,
  getEmailStatus,
  getSmtpStatus: getEmailStatus,
  sendEmailOtp,
  sendPasswordResetOtp
};
