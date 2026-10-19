const mongoose = require('mongoose');

const mysteryTripSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a mystery trip title'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    destinationSecret: {
      type: String,
      required: [true, 'Please specify the secret destination (only revealed when scheduled or manually unlocked)'],
      trim: true
    },
    destinationHint: {
      type: String,
      trim: true,
      default: 'A hidden haven of untamed beauty waiting to be unveiled.'
    },
    coverImage: {
      type: String,
      default: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80'
    },
    revealedCoverImage: {
      type: String,
      default: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80'
    },
    departureDate: {
      type: Date,
      required: [true, 'Please specify the departure date']
    },
    returnDate: {
      type: Date,
      required: [true, 'Please specify the return date']
    },
    budgetMin: {
      type: Number,
      required: true,
      default: 5000
    },
    budgetMax: {
      type: Number,
      required: true,
      default: 15000
    },
    maxParticipants: {
      type: Number,
      default: 12,
      min: 1
    },
    availableSeats: {
      type: Number,
      default: 12,
      min: 0
    },
    price: {
      type: Number,
      default: 9500
    },
    currency: {
      type: String,
      default: 'INR'
    },
    organiserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    revealAt: {
      type: Date,
      required: [true, 'Please configure the surprise reveal date/time']
    },
    revealedAt: {
      type: Date
    },
    isRevealed: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'upcoming_reveal', 'revealed', 'cancelled'],
      default: 'published'
    },
    clues: [{
      clueText: { type: String, required: true },
      releaseDate: { type: Date, default: Date.now },
      isReleased: { type: Boolean, default: true }
    }],
    itinerary: [{
      dayNumber: Number,
      title: String,
      description: String,
      time: String
    }],
    travelInstructions: {
      type: String,
      default: 'Pack light layers, comfortable hiking footwear, and your camera. Meet at the designated hub for boarding.'
    },
    accommodationDetails: {
      type: String,
      default: 'Boutique heritage stay with panoramic sunrise views and local dining experiences.'
    },
    participants: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      message: String,
      requestedAt: { type: Date, default: Date.now },
      approvedAt: Date
    }]
  },
  { timestamps: true }
);

mysteryTripSchema.index({ organiserId: 1 });
mysteryTripSchema.index({ status: 1, revealAt: 1 });

module.exports = mongoose.model('MysteryTrip', mysteryTripSchema);
