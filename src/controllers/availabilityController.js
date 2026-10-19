const TripMember = require('../models/TripMember');
const Trip = require('../models/Trip');
const { calculateBestTravelDates } = require('../utils/availabilityMatcher');

/**
 * Get group availability analysis and ranking for a trip
 * GET /api/trips/:tripId/availability
 */
async function getAvailability(req, res, next) {
  try {
    const tripId = req.params.tripId;
    const durationDays = Number(req.query.duration) || req.trip.durationDays || 5;

    const members = await TripMember.find({ trip: tripId, status: 'accepted' })
      .populate('user', 'name email avatar');

    const memberAvailabilities = members.map(m => ({
      memberId: m.user._id,
      name: m.user.name,
      avatar: m.user.avatar,
      intervals: m.availability || []
    }));

    const result = calculateBestTravelDates(memberAvailabilities, durationDays);

    res.json({
      success: true,
      analysis: result,
      members: memberAvailabilities
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update current user's availability intervals for this trip
 * POST /api/trips/:tripId/availability
 */
async function setMyAvailability(req, res, next) {
  try {
    const tripId = req.params.tripId;
    const { intervals } = req.body; // [{ startDate, endDate, note }]

    if (!Array.isArray(intervals)) {
      return res.status(400).json({ success: false, message: 'intervals must be an array of date ranges.' });
    }

    const member = await TripMember.findOne({ trip: tripId, user: req.user._id });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Trip membership not found.' });
    }

    member.availability = intervals.map(inv => ({
      startDate: new Date(inv.startDate),
      endDate: new Date(inv.endDate),
      note: inv.note || 'Available'
    }));

    await member.save();

    res.json({
      success: true,
      message: 'Your travel availability has been updated!',
      availability: member.availability
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Apply the winning matched date window to the live trip
 * POST /api/trips/:tripId/availability/apply
 */
async function applyMatchedDates(req, res, next) {
  try {
    const tripId = req.params.tripId;
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate are required.' });
    }

    const trip = req.trip;
    trip.startDate = new Date(startDate);
    trip.endDate = new Date(endDate);
    await trip.save();

    res.json({
      success: true,
      message: `Trip dates updated to optimal group window (${startDate} to ${endDate})!`,
      trip
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAvailability,
  setMyAvailability,
  applyMatchedDates
};
