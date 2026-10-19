const mongoose = require('mongoose');

const phoneVerificationSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: [true, 'Mobile phone number is required'],
      trim: true,
      index: true
    },
    countryCode: {
      type: String,
      default: '+91',
      trim: true
    },
    hashedOtp: {
      type: String,
      required: [true, 'Hashed OTP is required']
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // TTL index: auto-deletes when expired
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0
    },
    resendAvailableAt: {
      type: Date,
      default: () => new Date(Date.now() + 45 * 1000) // 45-second cooldown
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    channel: {
      type: String,
      enum: ['msg91', 'test'],
      default: 'msg91'
    },
    verifiedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

phoneVerificationSchema.index({ phone: 1, isVerified: 1 });

module.exports = mongoose.model('PhoneVerification', phoneVerificationSchema);
