const mongoose = require('mongoose');

const joinRequestSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: false
    },
    mysteryTrip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MysteryTrip',
      required: false
    },
    tripType: {
      type: String,
      enum: ['normal', 'mystery'],
      default: 'normal'
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    organiser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending'
    },
    seatsRequested: {
      type: Number,
      default: 1,
      min: 1
    },
    message: {
      type: String,
      trim: true,
      default: 'Hello! I would love to join this journey.'
    },
    rejectionReason: {
      type: String,
      trim: true
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    reviewedAt: {
      type: Date
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

// Ensure at least one trip reference exists
joinRequestSchema.pre('validate', function (next) {
  if (!this.trip && !this.mysteryTrip) {
    this.invalidate('trip', 'Either a regular Trip or a Mystery Trip must be associated.');
  }
  if (this.mysteryTrip && !this.tripType) {
    this.tripType = 'mystery';
  }
  next();
});

// Indexes for fast lookups and duplicate prevention
joinRequestSchema.index({ trip: 1, user: 1 });
joinRequestSchema.index({ mysteryTrip: 1, user: 1 });
joinRequestSchema.index({ organiser: 1, status: 1 });
joinRequestSchema.index({ user: 1, status: 1 });
joinRequestSchema.index({ status: 1, requestedAt: -1 });
joinRequestSchema.index({ tripType: 1, status: 1 });

module.exports = mongoose.model('JoinRequest', joinRequestSchema);
