const mongoose = require('mongoose');

const tripMemberSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: ['owner', 'editor', 'viewer'],
      default: 'editor'
    },
    status: {
      type: String,
      enum: ['accepted', 'pending', 'declined'],
      default: 'accepted'
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    // Used by Group Availability Matcher
    availability: [{
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      note: { type: String, default: 'Available for travel' }
    }]
  },
  { timestamps: true }
);

// Ensure unique compound index on trip and user
tripMemberSchema.index({ trip: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('TripMember', tripMemberSchema);
