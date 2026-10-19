const mongoose = require('mongoose');

const changeRequestSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Change request title is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Please explain the reason for this change']
    },
    proposedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    changeType: {
      type: String,
      enum: ['add_activity', 'modify_activity', 'remove_activity', 'change_dates', 'budget_update'],
      required: true
    },
    currentValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    proposedValue: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
    },
    reviewNote: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChangeRequest', changeRequestSchema);
