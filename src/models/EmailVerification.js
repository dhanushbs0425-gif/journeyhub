const mongoose = require('mongoose');

const emailVerificationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email address is required'],
      lowercase: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      default: 'Traveler',
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    verificationMethod: {
      type: String,
      enum: ['email', 'phone'],
      default: 'email'
    },
    hashedOtp: {
      type: String,
      required: [true, 'Hashed OTP is required']
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // Document auto-expires after expiresAt
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0
    },
    resendAvailableAt: {
      type: Date,
      default: () => new Date(Date.now() + 60 * 1000) // 60s cooldown
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

emailVerificationSchema.index({ email: 1, isVerified: 1 });

module.exports = mongoose.model('EmailVerification', emailVerificationSchema);
