const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip reference is required'],
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true
    },
    rating: {
      type: Number,
      required: [true, 'Please provide a star rating between 1 and 5'],
      min: [1, 'Rating must be at least 1 star'],
      max: [5, 'Rating cannot exceed 5 stars']
    },
    title: {
      type: String,
      trim: true,
      default: ''
    },
    comment: {
      type: String,
      required: [true, 'Please provide your review feedback'],
      trim: true,
      maxlength: [1000, 'Review comment cannot exceed 1000 characters']
    }
  },
  { timestamps: true }
);

// Strictly prevent duplicate reviews from the same user for the same trip
reviewSchema.index({ trip: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
