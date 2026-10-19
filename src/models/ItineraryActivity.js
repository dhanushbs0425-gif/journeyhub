const mongoose = require('mongoose');

const itineraryActivitySchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true
    },
    dayNumber: {
      type: Number,
      required: true,
      min: 1
    },
    date: {
      type: Date,
      required: true
    },
    title: {
      type: String,
      required: [true, 'Activity title is required'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    location: {
      type: String,
      default: ''
    },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required (HH:MM)'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please use 24-hour HH:MM format']
    },
    endTime: {
      type: String,
      required: [true, 'End time is required (HH:MM)'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please use 24-hour HH:MM format']
    },
    durationMinutes: {
      type: Number,
      default: 60
    },
    estimatedCost: {
      type: Number,
      default: 0,
      min: 0
    },
    category: {
      type: String,
      enum: ['Sightseeing', 'Food & Dining', 'Adventure', 'Travel & Transit', 'Leisure', 'Culture', 'Shopping', 'Other'],
      default: 'Sightseeing'
    },
    assignedTo: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    orderIndex: {
      type: Number,
      default: 0
    },
    // Distinctive Feature: Missed Activity Recovery
    isMissed: {
      type: Boolean,
      default: false
    },
    missedReason: {
      type: String,
      default: ''
    },
    originalSchedule: {
      dayNumber: Number,
      date: Date,
      startTime: String,
      endTime: String
    },
    bookingReference: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

itineraryActivitySchema.index({ trip: 1, dayNumber: 1, startTime: 1 });

module.exports = mongoose.model('ItineraryActivity', itineraryActivitySchema);
