const Wishlist = require('../models/Wishlist');
const Destination = require('../models/Destination');
const Trip = require('../models/Trip');

/**
 * Get current user's complete wishlist (both saved trips and destinations)
 * GET /api/wishlist
 */
async function getWishlist(req, res, next) {
  try {
    const items = await Wishlist.find({ userId: req.user._id })
      .populate({
        path: 'tripId',
        populate: [
          { path: 'organiserId', select: 'name email avatar' },
          { path: 'createdBy', select: 'name email avatar' }
        ]
      })
      .populate('destinationId')
      .sort({ addedAt: -1 });

    const destinations = items
      .filter(item => item.destinationId)
      .map(item => ({
        ...item.destinationId.toJSON(),
        wishlistId: item._id,
        wishlistAddedAt: item.addedAt
      }));

    const trips = items
      .filter(item => item.tripId)
      .map(item => ({
        ...item.tripId.toJSON(),
        wishlistId: item._id,
        wishlistAddedAt: item.addedAt
      }));

    const destinationIds = destinations.map(d => d._id.toString());
    const tripIds = trips.map(t => t._id.toString());

    res.json({
      success: true,
      count: items.length,
      tripCount: trips.length,
      destinationCount: destinations.length,
      wishlistIds: destinationIds, // backward compatibility
      wishlistTripIds: tripIds,
      wishlistDestinationIds: destinationIds,
      trips,
      destinations,
      wishlist: items // raw populated items
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Toggle trip in wishlist (save if not present, remove if already present)
 * POST /api/wishlist/trips/:tripId/toggle or POST /api/wishlist/trips/:tripId
 */
async function toggleTripWishlist(req, res, next) {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found.' });
    }

    const existing = await Wishlist.findOne({
      userId: req.user._id,
      tripId
    });

    if (existing) {
      await Wishlist.findByIdAndDelete(existing._id);
      return res.json({
        success: true,
        saved: false,
        message: `Removed "${trip.title}" from your wishlist.`,
        tripId
      });
    }

    const item = await Wishlist.create({
      userId: req.user._id,
      tripId,
      addedAt: new Date()
    });

    res.status(201).json({
      success: true,
      saved: true,
      message: `"${trip.title}" saved to your wishlist!`,
      wishlistId: item._id,
      trip
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Remove trip from wishlist
 * DELETE /api/wishlist/trips/:tripId
 */
async function removeTripFromWishlist(req, res, next) {
  try {
    const { tripId } = req.params;

    await Wishlist.findOneAndDelete({
      userId: req.user._id,
      tripId
    });

    res.json({
      success: true,
      saved: false,
      message: 'Trip removed from your wishlist.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add destination to wishlist
 * POST /api/wishlist/:destinationId
 */
async function addToWishlist(req, res, next) {
  try {
    const { destinationId } = req.params;

    const dest = await Destination.findById(destinationId);
    if (!dest) {
      return res.status(404).json({ success: false, message: 'Destination not found.' });
    }

    const item = await Wishlist.findOneAndUpdate(
      { userId: req.user._id, destinationId },
      { addedAt: new Date() },
      { upsert: true, new: true }
    );

    res.status(201).json({
      success: true,
      message: `"${dest.name}" saved to your wishlist!`,
      wishlistId: item._id,
      destination: dest
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Remove destination from wishlist
 * DELETE /api/wishlist/:destinationId
 */
async function removeFromWishlist(req, res, next) {
  try {
    const { destinationId } = req.params;

    await Wishlist.findOneAndDelete({
      userId: req.user._id,
      destinationId
    });

    res.json({
      success: true,
      message: 'Removed from your wishlist.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getWishlist,
  toggleTripWishlist,
  removeTripFromWishlist,
  addToWishlist,
  removeFromWishlist
};
