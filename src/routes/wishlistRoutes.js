const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', wishlistController.getWishlist);
router.post('/:destinationId', wishlistController.addToWishlist);
router.delete('/:destinationId', wishlistController.removeFromWishlist);

module.exports = router;
