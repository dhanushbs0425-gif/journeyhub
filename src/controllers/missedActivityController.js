const ItineraryActivity = require('../models/ItineraryActivity');
const Trip = require('../models/Trip');
const { findAvailableGapSlots, timeToMinutes } = require('../utils/conflictDetector');

/**
 * Mark an activity as missed and find intelligent reschedule recovery slots
 * POST /api/trips/:tripId/itinerary/:activityId/missed
 */
async function markActivityMissed(req, res, next) {
  try {
    const { tripId, activityId } = req.params;
    const { reason } = req.body;

    const activity = await ItineraryActivity.findOne({ _id: activityId, trip: tripId });
    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity not found.' });
    }

    // Save original schedule if not already saved
    if (!activity.isMissed) {
      activity.originalSchedule = {
        dayNumber: activity.dayNumber,
        date: activity.date,
        startTime: activity.startTime,
        endTime: activity.endTime
      };
    }

    activity.isMissed = true;
    activity.missedReason = reason || 'Delayed / Missed Schedule';
    await activity.save();

    // Fetch trip to know total days
    const trip = req.trip;
    const durationDays = trip.durationDays || 3;
    const activityDuration = activity.durationMinutes || (timeToMinutes(activity.endTime) - timeToMinutes(activity.startTime)) || 60;

    // Scan all days from the activity's dayNumber through the end of the trip
    const allActivities = await ItineraryActivity.find({ trip: tripId, isMissed: false });

    const recoverySuggestions = [];

    for (let day = activity.dayNumber; day <= durationDays; day++) {
      const dayActs = allActivities.filter(a => a.dayNumber === day && a._id.toString() !== activityId);
      const openSlots = findAvailableGapSlots(dayActs, activityDuration, '08:30', '21:00');

      if (openSlots.length > 0) {
        // Calculate date for this day
        const dayDate = new Date(trip.startDate);
        dayDate.setDate(dayDate.getDate() + (day - 1));

        recoverySuggestions.push({
          dayNumber: day,
          date: dayDate.toISOString().split('T')[0],
          availableSlotsCount: openSlots.length,
          slots: openSlots.map(s => ({
            suggestedStartTime: s.startTime,
            suggestedEndTime: s.endTime,
            windowStart: s.slotStart,
            windowEnd: s.slotEnd,
            gapDurationMinutes: s.gapDurationMinutes
          }))
        });
      }
    }

    res.json({
      success: true,
      message: `"${activity.title}" marked as missed. Suggested recovery slots generated.`,
      activity,
      recoverySuggestions
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reschedule a missed activity to an approved slot
 * POST /api/trips/:tripId/itinerary/:activityId/reschedule
 */
async function rescheduleMissedActivity(req, res, next) {
  try {
    const { tripId, activityId } = req.params;
    const { targetDayNumber, newStartTime, newEndTime } = req.body;

    if (!targetDayNumber || !newStartTime || !newEndTime) {
      return res.status(400).json({
        success: false,
        message: 'Target day number, start time, and end time are required.'
      });
    }

    const activity = await ItineraryActivity.findOne({ _id: activityId, trip: tripId });
    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity not found.' });
    }

    const trip = req.trip;
    const newDate = new Date(trip.startDate);
    newDate.setDate(newDate.getDate() + (Number(targetDayNumber) - 1));

    activity.dayNumber = Number(targetDayNumber);
    activity.date = newDate;
    activity.startTime = newStartTime;
    activity.endTime = newEndTime;
    activity.durationMinutes = timeToMinutes(newEndTime) - timeToMinutes(newStartTime);
    activity.isMissed = false; // Restored!
    activity.missedReason = `Rescheduled from Day ${activity.originalSchedule?.dayNumber || 1} to Day ${targetDayNumber}`;

    await activity.save();

    res.json({
      success: true,
      message: `"${activity.title}" successfully recovered and rescheduled to Day ${targetDayNumber} (${newStartTime} - ${newEndTime})!`,
      activity
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  markActivityMissed,
  rescheduleMissedActivity
};
