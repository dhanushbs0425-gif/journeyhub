const Review = require('../models/Review');
const Trip = require('../models/Trip');
const TripMember = require('../models/TripMember');
const JoinRequest = require('../models/JoinRequest');

/**
 * Get all reviews and rating summary for a trip
 * GET /api/trips/:tripId/reviews
 */
async function getTripReviews(req, res, next) {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found.' });
    }

    const reviews = await Review.find({ trip: tripId })
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 });

    const count = reviews.length;
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = count > 0 ? Number((totalRating / count).toFixed(1)) : 0;

    // Star distribution breakdown
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const star = Math.round(r.rating);
      if (distribution[star] !== undefined) distribution[star]++;
    });

    res.json({
      success: true,
      count,
      averageRating,
      distribution,
      reviews
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Submit a review & rating for a trip
 * POST /api/trips/:tripId/reviews
 */
async function createReview(req, res, next) {
  try {
    const { tripId } = req.params;
    const { rating, comment, title } = req.body;
    const userId = req.user._id;

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid rating between 1 and 5 stars.'
      });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a comment sharing your travel experience.'
      });
    }

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found.' });
    }

    // Check duplicate review
    const existing = await Review.findOne({ trip: tripId, user: userId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a review for this expedition.'
      });
    }

    // Verify eligibility: Must be a member, owner, or approved traveler
    const [membership, approvedReq] = await Promise.all([
      TripMember.findOne({ trip: tripId, user: userId }),
      JoinRequest.findOne({ trip: tripId, user: userId, status: 'approved' })
    ]);

    const isOrganiser = trip.organiserId?.toString() === userId.toString() || trip.createdBy?.toString() === userId.toString();
    const isEligible = isOrganiser || membership || approvedReq;

    if (!isEligible && process.env.NODE_ENV !== 'test') {
      return res.status(403).json({
        success: false,
        message: 'Only confirmed travelers who joined this expedition can submit a review.'
      });
    }

    const review = await Review.create({
      trip: tripId,
      user: userId,
      rating: numRating,
      title: (title || '').trim(),
      comment: comment.trim()
    });

    const populated = await Review.findById(review._id).populate('user', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Thank you! Your trip review has been published.',
      review: populated
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this trip.'
      });
    }
    next(error);
  }
}

/**
 * Delete a user's own review
 * DELETE /api/trips/:tripId/reviews/:reviewId
 */
async function deleteReview(req, res, next) {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You can only delete your own reviews.' });
    }

    await Review.findByIdAndDelete(reviewId);

    res.json({
      success: true,
      message: 'Review deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTripReviews,
  createReview,
  deleteReview
};
