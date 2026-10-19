const Trip = require('../models/Trip');
const TripMember = require('../models/TripMember');

/**
 * Validates that current user is a member of the trip in :tripId or req.body.tripId
 */
async function requireTripMember(req, res, next) {
  try {
    const tripId = req.params.tripId || req.body.trip || req.body.tripId || req.query.tripId;

    if (!tripId) {
      return res.status(400).json({
        success: false,
        message: 'Trip ID is required for this operation.'
      });
    }

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found.'
      });
    }

    // Check if user is trip creator or member
    let member = await TripMember.findOne({ trip: tripId, user: req.user._id });

    // Auto-create owner record if trip was created by user and member record missing
    if (!member && trip.createdBy.toString() === req.user._id.toString()) {
      member = await TripMember.create({
        trip: tripId,
        user: req.user._id,
        role: 'owner',
        status: 'accepted'
      });
    }

    if (!member) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not a member of this trip.'
      });
    }

    req.trip = trip;
    req.tripMember = member;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to verify trip membership.',
      error: error.message
    });
  }
}

/**
 * Enforces editor or owner permissions
 */
function requireTripEditor(req, res, next) {
  if (!req.tripMember) {
    return res.status(403).json({ success: false, message: 'Membership not verified.' });
  }

  if (req.tripMember.role !== 'owner' && req.tripMember.role !== 'editor') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Viewer role is view-only. Editor or Owner permissions required.'
    });
  }

  next();
}

/**
 * Enforces owner-only permissions
 */
function requireTripOwner(req, res, next) {
  if (!req.tripMember) {
    return res.status(403).json({ success: false, message: 'Membership not verified.' });
  }

  if (req.tripMember.role !== 'owner') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Only the trip owner can perform this action.'
    });
  }

  next();
}

module.exports = {
  requireTripMember,
  requireTripEditor,
  requireTripOwner
};
