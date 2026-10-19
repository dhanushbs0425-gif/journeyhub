const mongoose = require('mongoose');

const destinationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Destination name is required'],
      trim: true
    },
    state: {
      type: String,
      trim: true,
      default: 'India'
    },
    city: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      required: true,
      trim: true,
      default: 'India'
    },
    description: {
      type: String,
      required: true
    },
    imageUrl: {
      type: String,
      required: true
    },
    gallery: [{
      type: String
    }],
    coordinates: {
      lat: { type: Number, default: 20.5937 },
      lng: { type: Number, default: 78.9629 }
    },
    category: {
      type: String,
      default: 'Mountains and Hill Stations'
    },
    estimatedBudgetMin: {
      type: Number,
      default: 4000
    },
    estimatedBudgetMax: {
      type: Number,
      default: 18000
    },
    averageDailyCost: {
      type: Number,
      default: 2500
    },
    recommendedDuration: {
      type: String,
      default: '3-4 Days'
    },
    bestSeason: {
      type: String,
      default: 'October to March'
    },
    bestTimeToVisit: {
      type: String,
      default: 'October to March'
    },
    activities: [{
      type: String
    }],
    popularActivities: [{
      type: String
    }],
    attractions: [{
      type: String
    }],
    foodRecommendations: [{
      type: String
    }],
    itinerary: [{
      dayNumber: Number,
      title: String,
      activities: [String]
    }],
    travelTips: [{
      type: String
    }],
    nearbyDestinations: [{
      type: String
    }],
    popularity: {
      type: Number,
      default: 4.8
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 4.8
    },
    isFeatured: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

destinationSchema.index({ name: 'text', state: 'text', country: 'text', city: 'text', description: 'text', category: 'text' });
destinationSchema.index({ category: 1, state: 1, popularity: -1 });

module.exports = mongoose.model('Destination', destinationSchema);
