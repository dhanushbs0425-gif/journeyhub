const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  loginLimiter,
  registerLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
  passwordResetLimiter
} = require('../middleware/rateLimiter');

// Gmail Email OTP Verification & Registration
router.post('/send-email-otp', otpSendLimiter, authController.sendEmailOtp);
router.post('/send-otp', otpSendLimiter, authController.sendEmailOtp);
router.post('/verify-email-otp', otpVerifyLimiter, authController.verifyEmailOtp);
router.post('/verify-otp', otpVerifyLimiter, authController.verifyEmailOtp);
router.post('/register', registerLimiter, authController.register);

// Standard Login & Logout (No OTP required for normal login)
router.post('/login', loginLimiter, authController.login);
router.post('/logout', authController.logout);

// Password Recovery with Email OTP
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, authController.resetPassword);

// Safe SMTP Status Diagnostics
router.get('/email-status', authController.getEmailStatus);
router.get('/msg91-status', authController.getEmailStatus); // compatibility alias

// Authenticated User routes
router.get('/me', protect, authController.getMe);
router.put('/profile', protect, authController.updateProfile);
router.put('/change-password', protect, authController.changePassword);

module.exports = router;
