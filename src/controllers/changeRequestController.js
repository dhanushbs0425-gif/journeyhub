const ChangeRequest = require('../models/ChangeRequest');
const ItineraryActivity = require('../models/ItineraryActivity');
const Trip = require('../models/Trip');
const Notification = require('../models/Notification');

/**
 * Get all change requests for a trip
 * GET /api/trips/:tripId/change-requests
 */
async function getChangeRequests(req, res, next) {
  try {
    const tripId = req.params.tripId;

    const requests = await ChangeRequest.find({ trip: tripId })
      .populate('proposedBy', 'name email avatar')
      .populate('reviewedBy', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: requests.length,
      changeRequests: requests
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Submit a new change request
 * POST /api/trips/:tripId/change-requests
 */
async function submitChangeRequest(req, res, next) {
  try {
    const tripId = req.params.tripId;
    const { title, description, changeType, currentValue, proposedValue } = req.body;

    if (!title || !description || !changeType || !proposedValue) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, changeType, and proposedValue are required.'
      });
    }

    const cr = await ChangeRequest.create({
      trip: tripId,
      title,
      description,
      proposedBy: req.user._id,
      changeType,
      currentValue: currentValue || null,
      proposedValue,
      status: 'pending'
    });

    // Notify trip owner
    const trip = req.trip;
    await Notification.create({
      user: trip.createdBy,
      trip: tripId,
      title: 'New Itinerary Change Request',
      message: `${req.user.name} submitted a change request: "${title}"`,
      type: 'change_request',
      link: `#/trips/${tripId}/collaboration`
    });

    const populated = await ChangeRequest.findById(cr._id).populate('proposedBy', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Change request submitted for group review.',
      changeRequest: populated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Review change request (Approve or Reject)
 * PUT /api/trips/:tripId/change-requests/:requestId/review
 */
async function reviewChangeRequest(req, res, next) {
  try {
    const { tripId, requestId } = req.params;
    const { status, reviewNote } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected.' });
    }

    const cr = await ChangeRequest.findOne({ _id: requestId, trip: tripId });
    if (!cr) {
      return res.status(404).json({ success: false, message: 'Change request not found.' });
    }

    if (cr.status !== 'pending') {
      return res.status(400).json({ success: false, message: `This change request has already been ${cr.status}.` });
    }

    cr.status = status;
    cr.reviewedBy = req.user._id;
    cr.reviewedAt = new Date();
    cr.reviewNote = reviewNote || '';

    // If approved, apply the changes automatically!
    if (status === 'approved') {
      if (cr.changeType === 'add_activity') {
        const val = cr.proposedValue;
        await ItineraryActivity.create({
          trip: tripId,
          dayNumber: val.dayNumber || 1,
          date: val.date || req.trip.startDate,
          title: val.title,
          description: val.description || '',
          location: val.location || '',
          startTime: val.startTime || '10:00',
          endTime: val.endTime || '12:00',
          estimatedCost: val.estimatedCost || 0,
          category: val.category || 'Sightseeing'
        });
      } else if (cr.changeType === 'modify_activity' && cr.proposedValue.activityId) {
        await ItineraryActivity.findByIdAndUpdate(cr.proposedValue.activityId, cr.proposedValue.updates);
      } else if (cr.changeType === 'remove_activity' && cr.proposedValue.activityId) {
        await ItineraryActivity.findByIdAndDelete(cr.proposedValue.activityId);
      } else if (cr.changeType === 'budget_update' && cr.proposedValue.estimatedBudget) {
        await Trip.findByIdAndUpdate(tripId, { estimatedBudget: cr.proposedValue.estimatedBudget });
      }
    }

    await cr.save();

    // Notify the proposer
    await Notification.create({
      user: cr.proposedBy,
      trip: tripId,
      title: `Change Request ${status.toUpperCase()}`,
      message: `Your request "${cr.title}" was ${status} by ${req.user.name}. ${reviewNote ? `Note: ${reviewNote}` : ''}`,
      type: 'change_request',
      link: `#/trips/${tripId}/collaboration`
    });

    const populated = await ChangeRequest.findById(cr._id)
      .populate('proposedBy', 'name email avatar')
      .populate('reviewedBy', 'name email avatar');

    res.json({
      success: true,
      message: `Change request has been ${status}.`,
      changeRequest: populated
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getChangeRequests,
  submitChangeRequest,
  reviewChangeRequest
};
