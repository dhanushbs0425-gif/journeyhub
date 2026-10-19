const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const EmailVerification = require('../models/EmailVerification');
const PasswordReset = require('../models/PasswordReset');
const emailService = require('../services/emailService');
const { generateToken } = require('../middleware/auth');

/**
 * Step 1: Send Gmail Email OTP
 * POST /api/auth/send-email-otp (or /api/auth/send-otp)
 */
async function sendEmailOtp(req, res, next) {
  try {
    const { email, name = 'Traveler' } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address format. Please enter a valid email.'
      });
    }

    // Prevent duplicate accounts
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in.'
      });
    }

    // Check if Gmail SMTP provider is configured
    if (!emailService.isSmtpConfigured() && process.env.NODE_ENV !== 'test') {
      const diag = require('../config/env').getEnvDiagnostics();
      return res.status(503).json({
        success: false,
        code: 'SMTP_NOT_CONFIGURED',
        message: 'Gmail SMTP is not configured. To receive real verification codes, please configure SMTP_USER and SMTP_PASS (your 16-character Google App Password) in your backend .env file.',
        diagnostics: {
          hasSmtpUser: diag.hasSmtpUser,
          hasSmtpPass: diag.hasSmtpPass,
          activeEnvFile: diag.activeEnvFile,
          backendEnvPath: diag.backendEnvPath
        }
      });
    }

    // Rate-limit resend cooldown (60 seconds)
    const existingPending = await EmailVerification.findOne({ email: cleanEmail });
    if (existingPending && existingPending.resendAvailableAt > new Date()) {
      const waitSeconds = Math.ceil((existingPending.resendAvailableAt.getTime() - Date.now()) / 1000);
      return res.status(429).json({
        success: false,
        message: `An OTP was recently sent. Please wait ${waitSeconds} seconds before requesting a new code.`,
        cooldown: waitSeconds
      });
    }

    // Generate cryptographically secure 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = await bcrypt.hash(rawOtp, 10);

    // Attempt real Gmail SMTP dispatch
    try {
      await emailService.sendEmailOtp({
        to: cleanEmail,
        name: name || 'Traveler',
        otp: rawOtp
      });

      // ONLY save to DB and set cooldown IF dispatch succeeded
      await EmailVerification.findOneAndUpdate(
        { email: cleanEmail },
        {
          email: cleanEmail,
          name: name || 'Traveler',
          hashedOtp,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes validity
          attempts: 0,
          resendAvailableAt: new Date(Date.now() + 60 * 1000), // 60s cooldown
          isVerified: false
        },
        { upsert: true, new: true }
      );

      return res.json({
        success: true,
        message: `A 6-digit verification code has been dispatched to ${cleanEmail}. Please check your Gmail inbox.`,
        email: cleanEmail,
        cooldown: 60
      });
    } catch (mailErr) {
      // If delivery failed, ensure NO cooldown is stored for this email
      await EmailVerification.deleteMany({ email: cleanEmail });

      if (mailErr.code === 'SMTP_NOT_CONFIGURED') {
        return res.status(503).json({
          success: false,
          code: mailErr.code,
          message: mailErr.message
        });
      }

      return res.status(400).json({
        success: false,
        code: mailErr.code || 'EMAIL_DELIVERY_FAILED',
        message: `Failed to deliver verification email to ${cleanEmail}: ${mailErr.message}`
      });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Step 2: Verify Gmail Email OTP
 * POST /api/auth/verify-email-otp (or /api/auth/verify-otp)
 */
async function verifyEmailOtp(req, res, next) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both your email address and the 6-digit verification code.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();
    if (cleanOtp.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Verification code must be exactly 6 digits.'
      });
    }

    const pending = await EmailVerification.findOne({ email: cleanEmail });
    if (!pending) {
      return res.status(400).json({
        success: false,
        message: 'No pending verification found for this email address. Please click "Send OTP" first.'
      });
    }

    // Check expiry
    if (pending.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.'
      });
    }

    // Check attempt threshold (limit to 5 attempts)
    if (pending.attempts >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. Please request a fresh OTP.'
      });
    }

    // Compare bcrypt hash
    const isMatch = await bcrypt.compare(cleanOtp, pending.hashedOtp);

    if (!isMatch) {
      pending.attempts += 1;
      await pending.save();
      const remaining = Math.max(0, 5 - pending.attempts);
      return res.status(400).json({
        success: false,
        message: `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
      });
    }

    // Mark as verified
    pending.isVerified = true;
    pending.verifiedAt = new Date();
    await pending.save();

    res.json({
      success: true,
      message: 'Email address verified successfully!',
      email: cleanEmail,
      isVerified: true
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Step 3: Complete User Registration (Only after Email OTP Verification succeeds)
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { name, email, password, confirmPassword, phone } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Full name must be at least 2 characters.'
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.'
      });
    }

    // Verify that the email was successfully verified via OTP
    const verifiedRecord = await EmailVerification.findOne({
      email: cleanEmail,
      isVerified: true
    });

    if (!verifiedRecord) {
      return res.status(400).json({
        success: false,
        message: 'Please send and verify the OTP for your email address before completing registration.'
      });
    }

    // Allow 30 minutes from verification to finish registration
    if (verifiedRecord.verifiedAt && Date.now() - verifiedRecord.verifiedAt.getTime() > 30 * 60 * 1000) {
      return res.status(400).json({
        success: false,
        message: 'Email verification has expired. Please verify your email address again.'
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.'
      });
    }

    // Prevent duplicate email accounts
    const existingEmailUser = await User.findOne({ email: cleanEmail });
    if (existingEmailUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please log in.'
      });
    }

    // Clean optional phone number if provided
    let cleanPhone = '';
    if (phone && phone.trim()) {
      cleanPhone = phone.trim();
    }

    // Create real User record with role 'user' and emailVerified: true
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      password, // User pre-save hook handles bcrypt hashing
      role: 'user', // Public registration ALWAYS assigns role 'user'
      emailVerified: true,
      phoneVerified: false,
      verificationMethod: 'email',
      status: 'active',
      profile: {
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
        phone: cleanPhone,
        bio: 'Passionate globetrotter exploring new horizons.',
        homeCity: '',
        budgetPreference: 'Moderate',
        preferredCategories: []
      },
      preferences: {
        currency: 'INR',
        budgetAlertThreshold: 80,
        emailNotifications: true,
        theme: 'navy'
      }
    });

    // Delete verification record so OTP cannot be reused
    await EmailVerification.deleteOne({ _id: verifiedRecord._id });

    // Issue authenticated session token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to JourneyHub.',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        emailVerified: user.emailVerified,
        avatar: user.avatar,
        profile: user.profile,
        preferences: user.preferences
      },
      requiresProfileSetup: true
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Standard Login (No OTP required for ordinary login)
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, identifier, phone, password } = req.body;
    const loginTarget = (identifier || email || phone || '').toString().trim();

    if (!loginTarget || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your email (or username) and password.'
      });
    }

    const lower = loginTarget.toLowerCase();
    let user = await User.findOne({ email: lower }).select('+password');

    // If not found and input does not contain '@', check if it matches an organiser name or prefix
    if (!user && !lower.includes('@')) {
      user = await User.findOne({
        role: 'organiser',
        $or: [
          { name: new RegExp(`^${lower}$`, 'i') },
          { email: new RegExp(`^${lower}@`, 'i') }
        ]
      }).select('+password');
    }

    // Fallback: check phone
    if (!user) {
      user = await User.findOne({
        $or: [
          { phone: loginTarget },
          { 'profile.phone': loginTarget }
        ]
      }).select('+password');
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Verify password against stored bcrypt hash
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Issue session token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || user.profile?.phone || '',
        role: user.role,
        emailVerified: user.emailVerified,
        avatar: user.avatar || user.profile?.avatar,
        profile: user.profile,
        preferences: user.preferences
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Safe Status Endpoint
 * GET /api/auth/email-status
 */
function getEmailStatus(req, res) {
  const status = emailService.getSmtpStatus();
  res.json({
    success: true,
    ...status
  });
}

/**
 * Logout
 * POST /api/auth/logout
 */
function logout(req, res) {
  res.json({
    success: true,
    message: 'Logged out successfully.'
  });
}

/**
 * Get Authenticated User Profile
 * GET /api/auth/me
 */
async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.'
      });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || user.profile?.phone || '',
        role: user.role,
        emailVerified: user.emailVerified,
        avatar: user.avatar || user.profile?.avatar,
        profile: user.profile,
        preferences: user.preferences
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update Profile
 * PUT /api/auth/profile
 */
async function updateProfile(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { name, bio, homeCity, budgetPreference, preferredCategories, phone, avatar } = req.body;

    if (name) user.name = name.trim();
    if (!user.profile) user.profile = {};

    if (bio !== undefined) user.profile.bio = bio;
    if (homeCity !== undefined) user.profile.homeCity = homeCity;
    if (budgetPreference) user.profile.budgetPreference = budgetPreference;
    if (preferredCategories) user.profile.preferredCategories = preferredCategories;
    if (phone !== undefined) {
      user.phone = phone.trim();
      user.profile.phone = phone.trim();
    }
    if (avatar) {
      user.avatar = avatar;
      user.profile.avatar = avatar;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        profile: user.profile,
        preferences: user.preferences
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Change Password
 * PUT /api/auth/change-password
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current and new passwords.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match.'
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Forgot Password via Email OTP
 * POST /api/auth/forgot-password
 */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your registered email address.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    const genericSuccess = {
      success: true,
      message: 'If an account exists with this email address, a password reset code has been sent.'
    };

    if (!user) {
      return res.json(genericSuccess);
    }

    if (!emailService.isSmtpConfigured() && process.env.NODE_ENV !== 'test') {
      return res.status(503).json({
        success: false,
        code: 'SMTP_NOT_CONFIGURED',
        message: 'Gmail SMTP service is not configured. Please configure SMTP_USER and SMTP_PASS in your .env file.'
      });
    }

    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = await bcrypt.hash(rawOtp, 10);

    await PasswordReset.findOneAndUpdate(
      { email: user.email },
      {
        email: user.email,
        phone: user.phone || '',
        hashedOtp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        attempts: 0,
        used: false
      },
      { upsert: true, new: true }
    );

    await emailService.sendPasswordResetOtp({
      to: user.email,
      name: user.name,
      otp: rawOtp
    });

    res.json(genericSuccess);
  } catch (error) {
    next(error);
  }
}

/**
 * Reset Password with Email OTP
 * POST /api/auth/reset-password
 */
async function resetPassword(req, res, next) {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email address, verification code, and new password.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    const record = await PasswordReset.findOne({
      email: cleanEmail,
      used: false
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'No active password reset request found. Please request a new code.'
      });
    }

    if (record.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Reset code has expired. Please request a fresh code.'
      });
    }

    if (record.attempts >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. Please request a new code.'
      });
    }

    const isMatch = await bcrypt.compare(cleanOtp, record.hashedOtp);
    if (!isMatch) {
      record.attempts += 1;
      await record.save();
      const remaining = Math.max(0, 5 - record.attempts);
      return res.status(400).json({
        success: false,
        message: `Invalid reset code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
      });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Account not found.'
      });
    }

    user.password = newPassword;
    await user.save();

    record.used = true;
    await record.save();

    res.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  sendEmailOtp,
  verifyEmailOtp,
  register,
  login,
  logout,
  getMe,
  getEmailStatus,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword,
  // Convenience aliases for backward compatibility
  sendPhoneOtp: sendEmailOtp,
  verifyPhoneOtp: verifyEmailOtp,
  getMsg91Status: getEmailStatus
};
