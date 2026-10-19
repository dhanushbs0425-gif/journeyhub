const ItineraryActivity = require('../models/ItineraryActivity');
const Trip = require('../models/Trip');
const { detectConflicts, checkActivityConflict, timeToMinutes } = require('../utils/conflictDetector');

/**
 * Get all activities for a trip, grouped day-wise and sorted chronologically
 * GET /api/trips/:tripId/itinerary
 */
async function getItinerary(req, res, next) {
  try {
    const tripId = req.params.tripId;

    const activities = await ItineraryActivity.find({ trip: tripId })
      .populate('assignedTo', 'name email avatar')
      .sort({ dayNumber: 1, orderIndex: 1, startTime: 1 });

    // Detect all conflicts across active activities
    const conflicts = detectConflicts(activities);

    // Group activities by dayNumber
    const groupedDays = {};
    activities.forEach(act => {
      const day = act.dayNumber;
      if (!groupedDays[day]) {
        groupedDays[day] = [];
      }
      groupedDays[day].push(act);
    });

    res.json({
      success: true,
      count: activities.length,
      conflicts,
      hasConflicts: conflicts.length > 0,
      groupedDays,
      activities
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add a new activity to itinerary
 * POST /api/trips/:tripId/itinerary
 */
async function addActivity(req, res, next) {
  try {
    const tripId = req.params.tripId;
    const {
      dayNumber,
      date,
      title,
      description,
      location,
      coordinates,
      startTime,
      endTime,
      estimatedCost,
      category,
      assignedTo,
      bookingReference,
      notes
    } = req.body;

    if (!dayNumber || !startTime || !endTime || !title) {
      return res.status(400).json({
        success: false,
        message: 'Day number, title, start time, and end time are required.'
      });
    }

    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);

    if (endMins <= startMins) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time.'
      });
    }

    const durationMinutes = endMins - startMins;

    // Check for conflicts with existing activities on this day
    const existingActivities = await ItineraryActivity.find({ trip: tripId, dayNumber });
    const conflicts = checkActivityConflict({ dayNumber, startTime, endTime, title }, existingActivities);

    // Get next order index
    const count = await ItineraryActivity.countDocuments({ trip: tripId, dayNumber });

    // Derive date from trip start date if not explicitly provided
    let activityDate = date;
    if (!activityDate) {
      const trip = req.trip || await Trip.findById(tripId);
      const start = new Date(trip.startDate);
      start.setDate(start.getDate() + (Number(dayNumber) - 1));
      activityDate = start;
    }

    const activity = await ItineraryActivity.create({
      trip: tripId,
      dayNumber: Number(dayNumber),
      date: activityDate,
      title,
      description: description || '',
      location: location || '',
      coordinates: coordinates || null,
      startTime,
      endTime,
      durationMinutes,
      estimatedCost: Number(estimatedCost) || 0,
      category: category || 'Sightseeing',
      assignedTo: assignedTo || [],
      orderIndex: count,
      bookingReference: bookingReference || '',
      notes: notes || ''
    });

    res.status(201).json({
      success: true,
      message: conflicts.length > 0
        ? `Activity added with schedule conflict warning: ${conflicts[0].message}`
        : 'Activity added successfully!',
      conflicts,
      hasConflicts: conflicts.length > 0,
      activity
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update an existing activity
 * PUT /api/trips/:tripId/itinerary/:activityId
 */
async function updateActivity(req, res, next) {
  try {
    const { tripId, activityId } = req.params;
    const {
      dayNumber,
      date,
      title,
      description,
      location,
      coordinates,
      startTime,
      endTime,
      estimatedCost,
      category,
      assignedTo,
      bookingReference,
      notes
    } = req.body;

    const activity = await ItineraryActivity.findOne({ _id: activityId, trip: tripId });
    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity not found.' });
    }

    if (title) activity.title = title;
    if (dayNumber !== undefined) activity.dayNumber = Number(dayNumber);
    if (date) activity.date = date;
    if (description !== undefined) activity.description = description;
    if (location !== undefined) activity.location = location;
    if (coordinates) activity.coordinates = coordinates;
    if (category) activity.category = category;
    if (estimatedCost !== undefined) activity.estimatedCost = Number(estimatedCost);
    if (assignedTo) activity.assignedTo = assignedTo;
    if (bookingReference !== undefined) activity.bookingReference = bookingReference;
    if (notes !== undefined) activity.notes = notes;

    if (startTime) activity.startTime = startTime;
    if (endTime) activity.endTime = endTime;

    const startMins = timeToMinutes(activity.startTime);
    const endMins = timeToMinutes(activity.endTime);
    if (endMins <= startMins) {
      return res.status(400).json({ success: false, message: 'End time must be after start time.' });
    }
    activity.durationMinutes = endMins - startMins;

    // Check for conflict
    const existing = await ItineraryActivity.find({ trip: tripId, dayNumber: activity.dayNumber });
    const conflicts = checkActivityConflict(activity, existing, activity._id);

    await activity.save();

    res.json({
      success: true,
      message: conflicts.length > 0
        ? `Activity updated with conflict warning: ${conflicts[0].message}`
        : 'Activity updated successfully!',
      conflicts,
      hasConflicts: conflicts.length > 0,
      activity
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete activity
 * DELETE /api/trips/:tripId/itinerary/:activityId
 */
async function deleteActivity(req, res, next) {
  try {
    const { tripId, activityId } = req.params;
    const activity = await ItineraryActivity.findOneAndDelete({ _id: activityId, trip: tripId });

    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity not found.' });
    }

    res.json({
      success: true,
      message: 'Activity deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reorder activities on a day
 * POST /api/trips/:tripId/itinerary/reorder
 */
async function reorderActivities(req, res, next) {
  try {
    const { tripId } = req.params;
    const { orderedActivityIds } = req.body; // Array of IDs in target order

    if (!Array.isArray(orderedActivityIds)) {
      return res.status(400).json({ success: false, message: 'orderedActivityIds must be an array.' });
    }

    await Promise.all(
      orderedActivityIds.map((id, index) =>
        ItineraryActivity.updateOne({ _id: id, trip: tripId }, { orderIndex: index })
      )
    );

    res.json({
      success: true,
      message: 'Activities reordered successfully.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getItinerary,
  addActivity,
  updateActivity,
  deleteActivity,
  reorderActivities
};
