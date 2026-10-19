const rateLimit = require('express-rate-limit');

const isTest = process.env.NODE_ENV === 'test';

/**
 * Rate limiter for login requests
 * 15 attempts per 15 minutes
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.'
  }
});

/**
 * Rate limiter for registration requests
 * 10 attempts per 15 minutes
 */
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many registration attempts from this IP. Please try again after 15 minutes.'
  }
});

/**
 * Rate limiter for OTP resend and generation requests
 * 5 requests per 10 minutes
 */
const otpSendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: isTest ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many verification code requests. Please wait a few minutes before trying again.'
  }
});

/**
 * Rate limiter for OTP verification attempts
 * 10 attempts per 15 minutes
 */
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many verification attempts. Please request a new verification code.'
  }
});

/**
 * Rate limiter for password reset requests
 * 5 requests per 15 minutes
 */
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again later.'
  }
});

module.exports = {
  loginLimiter,
  registerLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
  passwordResetLimiter
};
