const mongoose = require('mongoose');

const travelDiaryEntrySchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    dayNumber: {
      type: Number,
      default: 1
    },
    date: {
      type: Date,
      default: Date.now
    },
    title: {
      type: String,
      required: [true, 'Diary entry title is required'],
      trim: true
    },
    notes: {
      type: String,
      required: [true, 'Please write your diary reflection or memories']
    },
    memorablePlaces: [{
      type: String,
      trim: true
    }],
    photos: [{
      url: { type: String, required: true },
      caption: { type: String, default: '' }
    }],
    mood: {
      type: String,
      enum: ['Amazing', 'Exciting', 'Relaxing', 'Adventurous', 'Tiring', 'Chaotic'],
      default: 'Amazing'
    },
    weather: {
      type: String,
      default: 'Sunny'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    actualExpenses: {
      type: Number,
      default: 0
    },
    highlights: [{
      type: String,
      trim: true
    }]
  },
  { timestamps: true }
);

travelDiaryEntrySchema.index({ trip: 1, date: -1 });

module.exports = mongoose.model('TravelDiaryEntry', travelDiaryEntrySchema);
