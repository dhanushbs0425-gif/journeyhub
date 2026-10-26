const express = require('express');
const router = express.Router({ mergeParams: true });
const reviewController = require('../controllers/reviewController');
const { protect, optionalAuth } = require('../middleware/auth');

// Public route: anyone can view reviews
router.get('/', optionalAuth, reviewController.getTripReviews);

// Protected routes: submit and delete review
router.post('/', protect, reviewController.createReview);
router.delete('/:reviewId', protect, reviewController.deleteReview);

module.exports = router;
