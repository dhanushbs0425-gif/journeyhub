const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      default: null
    },
    destinationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Destination',
      default: null
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Unique compound indexes preventing duplicate saves
wishlistSchema.index(
  { userId: 1, tripId: 1 },
  { unique: true, partialFilterExpression: { tripId: { $type: 'objectId' } } }
);

wishlistSchema.index(
  { userId: 1, destinationId: 1 },
  { unique: true, partialFilterExpression: { destinationId: { $type: 'objectId' } } }
);

module.exports = mongoose.model('Wishlist', wishlistSchema);
