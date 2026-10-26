const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { protect } = require('../middleware/auth');

router.use(protect);

// Get complete wishlist (trips and destinations)
router.get('/', wishlistController.getWishlist);

// Trip wishlist endpoints
router.post('/trips/:tripId', wishlistController.toggleTripWishlist);
router.post('/trips/:tripId/toggle', wishlistController.toggleTripWishlist);
router.delete('/trips/:tripId', wishlistController.removeTripFromWishlist);

// Destination wishlist endpoints (backward compatibility)
router.post('/:destinationId', wishlistController.addToWishlist);
router.delete('/:destinationId', wishlistController.removeFromWishlist);

module.exports = router;
