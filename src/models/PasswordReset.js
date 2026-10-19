const mongoose = require('mongoose');

const passwordResetSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email address is required'],
      lowercase: true,
      trim: true,
      index: true
    },
    hashedOtp: {
      type: String,
      required: [true, 'Hashed OTP is required']
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // MongoDB TTL index
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0
    },
    used: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PasswordReset', passwordResetSchema);
