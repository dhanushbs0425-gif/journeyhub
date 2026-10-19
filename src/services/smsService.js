/**
 * JourneyHub SMS Delivery & Verification Service
 * Powered by MSG91 SendOTP v5 API (https://control.msg91.com/api/v5/otp)
 *
 * Strict Security Rules:
 * - Real 6-digit SMS OTP sent to Indian (+91) mobile numbers.
 * - Verified through genuine MSG91 verification API.
 * - Never expose OTPs in frontend JavaScript, API responses, or logs.
 * - Do not pretend an SMS was sent if unconfigured.
 */

/**
 * Format phone number into E.164 format with country code
 * @param {string} phone
 * @param {string} [countryCode='+91']
 */
function formatPhoneNumber(phone, countryCode = '+91') {
  let cleaned = (phone || '').toString().trim().replace(/[^0-9+]/g, '');
  if (!cleaned.startsWith('+')) {
    const code = (countryCode || '+91').toString().trim();
    const cleanCode = code.startsWith('+') ? code : '+' + code;
    cleaned = cleanCode + cleaned.replace(/^0+/, '');
  }
  return cleaned;
}

/**
 * Format phone number for MSG91 API (digits only with country code, without leading '+')
 * E.g., "+919876543210" -> "919876543210"
 * @param {string} phone
 * @param {string} [countryCode='+91']
 */
function formatMsg91Mobile(phone, countryCode = '+91') {
  const e164 = formatPhoneNumber(phone, countryCode);
  return e164.replace(/[^0-9]/g, '');
}

const { loadEnv, sanitizeEnvValue, getEnvDiagnostics } = require('../config/env');

/**
 * Check whether MSG91 credentials are fully configured in the environment
 */
function isSmsConfigured() {
  const diag = getEnvDiagnostics();
  return Boolean(diag.isMsg91Configured);
}

/**
 * Return MSG91 configuration status without leaking the secret AuthKey
 */
function getMsg91Status() {
  const diag = getEnvDiagnostics();
  const authKey = sanitizeEnvValue(process.env.MSG91_AUTH_KEY);
  const templateId = sanitizeEnvValue(process.env.MSG91_TEMPLATE_ID);
  const senderId = sanitizeEnvValue(process.env.MSG91_SENDER_ID);

  return {
    isConfigured: Boolean(diag.isMsg91Configured),
    authKeyMasked: authKey && authKey.length >= 8 ? authKey.slice(0, 4) + '••••••••' + authKey.slice(-4) : '',
    hasAuthKey: diag.hasAuthKey,
    authKeyLength: diag.authKeyLength,
    hasTemplateId: diag.hasTemplateId,
    templateIdLength: diag.templateIdLength,
    templateId: templateId || '',
    senderId: senderId || '',
    nodeEnv: diag.nodeEnv,
    diagnostics: {
      backendEnvExists: diag.backendEnvExists,
      backendEnvPath: diag.backendEnvPath,
      rootEnvExists: diag.rootEnvExists,
      rootEnvPath: diag.rootEnvPath,
      activeEnvFile: diag.activeEnvFile,
      hasAuthKey: diag.hasAuthKey,
      hasTemplateId: diag.hasTemplateId
    }
  };
}

/**
 * Send real 6-digit SMS OTP via MSG91 SendOTP API (v5)
 * Endpoint: POST https://control.msg91.com/api/v5/otp
 * @param {Object} opts
 * @param {string} opts.phone
 * @param {string} [opts.countryCode='+91']
 * @param {string} [opts.name='Traveler']
 * @param {string} [opts.otp] - 6-digit OTP code to send
 */
async function sendSmsOtp({ phone, countryCode = '+91', name = 'Traveler', otp }) {
  const formattedPhone = formatPhoneNumber(phone, countryCode);
  const msg91Mobile = formatMsg91Mobile(phone, countryCode);

  const e164Regex = /^\+[1-9]\d{7,14}$/;
  if (!e164Regex.test(formattedPhone)) {
    const err = new Error(`Invalid phone number format: "${formattedPhone}". Please enter a valid mobile number with country code.`);
    err.code = 'INVALID_PHONE_NUMBER';
    throw err;
  }

  // Automated test environment
  if (process.env.NODE_ENV === 'test') {
    const mockId = 'test_msg91_' + Date.now();
    return {
      success: true,
      channel: 'msg91',
      phone: formattedPhone,
      messageId: mockId,
      sid: mockId
    };
  }

  if (!isSmsConfigured()) {
    const err = new Error(
      'MSG91 SMS service is not configured. To receive real verification codes via SMS, please configure MSG91_AUTH_KEY and MSG91_TEMPLATE_ID in your backend .env file.'
    );
    err.code = 'SMS_PROVIDER_NOT_CONFIGURED';
    throw err;
  }

  const authKey = sanitizeEnvValue(process.env.MSG91_AUTH_KEY);
  const templateId = sanitizeEnvValue(process.env.MSG91_TEMPLATE_ID);
  const senderId = sanitizeEnvValue(process.env.MSG91_SENDER_ID);

  // MSG91 SendOTP v5 URL
  const queryParams = new URLSearchParams({
    template_id: templateId,
    mobile: msg91Mobile,
    otp_length: '6',
    otp_expiry: '5'
  });

  if (senderId) {
    queryParams.append('sender', senderId);
  }
  if (otp) {
    queryParams.append('otp', otp.toString());
  }

  const postBody = {};
  if (otp) {
    postBody.OTP = otp.toString();
    postBody.otp = otp.toString();
  }
  if (name) {
    postBody.name = name;
  }

  try {
    const response = await fetch(`https://control.msg91.com/api/v5/otp?${queryParams.toString()}`, {
      method: 'POST',
      headers: {
        'authkey': authKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(postBody)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.type === 'error') {
      const errMsg = data.message || `MSG91 OTP dispatch rejected (HTTP ${response.status})`;
      const err = new Error(errMsg);
      err.code = 'SMS_DELIVERY_FAILED';
      throw err;
    }

    return {
      success: true,
      channel: 'msg91',
      phone: formattedPhone,
      messageId: data.message || 'msg91_sent',
      sid: data.message || 'msg91_sent'
    };
  } catch (error) {
    if (error.code === 'SMS_DELIVERY_FAILED') throw error;
    const err = new Error(`MSG91 SMS Gateway unreachable: ${error.message}`);
    err.code = 'SMS_GATEWAY_UNREACHABLE';
    throw err;
  }
}

/**
 * Verify OTP entered by user with MSG91 Verify OTP API (v5)
 * Endpoint: GET https://control.msg91.com/api/v5/otp/verify?otp=...&mobile=...
 * @param {string} phone
 * @param {string} otp
 * @param {string} [countryCode='+91']
 */
async function verifyMsg91Otp(phone, otp, countryCode = '+91') {
  if (process.env.NODE_ENV === 'test') {
    return null; // fallback to backend bcrypt in automated test suite
  }

  if (!isSmsConfigured()) {
    const err = new Error('MSG91 SMS service is not configured. Please configure MSG91_AUTH_KEY in .env.');
    err.code = 'SMS_PROVIDER_NOT_CONFIGURED';
    throw err;
  }

  const authKey = sanitizeEnvValue(process.env.MSG91_AUTH_KEY);
  const msg91Mobile = formatMsg91Mobile(phone, countryCode);
  const cleanOtp = (otp || '').toString().trim();

  const queryParams = new URLSearchParams({
    otp: cleanOtp,
    mobile: msg91Mobile
  });

  try {
    const response = await fetch(`https://control.msg91.com/api/v5/otp/verify?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'authkey': authKey,
        'Accept': 'application/json'
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.type === 'error' || data.message === 'otp_not_verified') {
      const errMsg = data.message || 'Invalid or expired OTP code.';
      return {
        success: false,
        message: errMsg === 'otp_not_verified' ? 'Invalid verification code. Please check and try again.' : errMsg
      };
    }

    const isSuccess = data.type === 'success' ||
      (typeof data.message === 'string' && (data.message.toLowerCase().includes('success') || data.message.toLowerCase().includes('verified')));

    if (!isSuccess) {
      return {
        success: false,
        message: data.message || 'OTP verification failed'
      };
    }

    return {
      success: true,
      message: data.message || 'OTP verified successfully!'
    };
  } catch (netErr) {
    const err = new Error(`MSG91 verification service unreachable: ${netErr.message}`);
    err.code = 'SMS_GATEWAY_UNREACHABLE';
    throw err;
  }
}

module.exports = {
  formatPhoneNumber,
  formatMsg91Mobile,
  isSmsConfigured,
  getMsg91Status,
  sendSmsOtp,
  verifyMsg91Otp,
  sendOtpSms: (phone, otp, name) => sendSmsOtp({ phone, otp, name })
};
