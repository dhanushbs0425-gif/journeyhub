const mongoose = require('mongoose');

const tripScenarioSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: [true, 'Scenario name is required'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['draft', 'applied', 'discarded'],
      default: 'draft'
    },
    simulatedActivities: [{
      dayNumber: Number,
      date: Date,
      title: String,
      description: String,
      location: String,
      startTime: String,
      endTime: String,
      estimatedCost: Number,
      category: String,
      isCustomNew: Boolean,
      isRemoved: Boolean
    }],
    simulatedBudget: {
      type: Number,
      default: 0
    },
    deltaCost: {
      type: Number,
      default: 0 // positive = increase, negative = savings
    },
    deltaDurationMinutes: {
      type: Number,
      default: 0
    },
    conflictCount: {
      type: Number,
      default: 0
    },
    conflicts: [{
      message: String,
      day: Number,
      startTime: String,
      endTime: String
    }],
    appliedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('TripScenario', tripScenarioSchema);
