const Wishlist = require('../models/Wishlist');
const Destination = require('../models/Destination');

/**
 * Get current user's wishlist
 * GET /api/wishlist
 */
async function getWishlist(req, res, next) {
  try {
    const items = await Wishlist.find({ userId: req.user._id })
      .populate('destinationId')
      .sort({ addedAt: -1 });

    const destinations = items
      .filter(item => item.destinationId)
      .map(item => ({
        ...item.destinationId.toJSON(),
        wishlistId: item._id,
        wishlistAddedAt: item.addedAt
      }));

    const destinationIds = destinations.map(d => d._id.toString());

    res.json({
      success: true,
      count: destinations.length,
      wishlistIds: destinationIds,
      destinations
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
  addToWishlist,
  removeFromWishlist
};
