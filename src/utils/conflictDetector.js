/**
 * JourneyHub Conflict Detector Utility
 * Detects schedule overlaps between itinerary activities and identifies
 * open gap slots for the Missed-Activity Recovery engine.
 */

/**
 * Convert time string "HH:MM" (24-hour) to minutes from midnight
 * @param {String} timeStr 
 * @returns {Number} minutes
 */
function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Convert minutes from midnight back to "HH:MM" format
 * @param {Number} minutes 
 * @returns {String} "HH:MM"
 */
function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Check if two time intervals overlap
 * Overlap condition: max(start1, start2) < min(end1, end2)
 */
function doIntervalsOverlap(start1, end1, start2, end2) {
  return Math.max(start1, start2) < Math.min(end1, end2);
}

/**
 * Detect all pairwise conflicts within a list of activities
 * @param {Array} activities 
 * @returns {Array} List of conflict objects
 */
function detectConflicts(activities = []) {
  const conflicts = [];
  // Group activities by day/date
  const byDay = {};

  activities.forEach(act => {
    // Only check active (non-missed) activities
    if (act.isMissed) return;

    const dayKey = act.dayNumber || (act.date ? new Date(act.date).toISOString().split('T')[0] : 'default');
    if (!byDay[dayKey]) byDay[dayKey] = [];
    byDay[dayKey].push(act);
  });

  Object.entries(byDay).forEach(([dayKey, dayActs]) => {
    for (let i = 0; i < dayActs.length; i++) {
      for (let j = i + 1; j < dayActs.length; j++) {
        const a1 = dayActs[i];
        const a2 = dayActs[j];

        const start1 = timeToMinutes(a1.startTime);
        const end1 = timeToMinutes(a1.endTime);
        const start2 = timeToMinutes(a2.startTime);
        const end2 = timeToMinutes(a2.endTime);

        if (doIntervalsOverlap(start1, end1, start2, end2)) {
          conflicts.push({
            day: dayKey,
            activity1: {
              id: a1._id || a1.id,
              title: a1.title,
              startTime: a1.startTime,
              endTime: a1.endTime
            },
            activity2: {
              id: a2._id || a2.id,
              title: a2.title,
              startTime: a2.startTime,
              endTime: a2.endTime
            },
            overlapMinutes: Math.min(end1, end2) - Math.max(start1, start2),
            message: `"${a1.title}" (${a1.startTime}-${a1.endTime}) conflicts with "${a2.title}" (${a2.startTime}-${a2.endTime})`
          });
        }
      }
    }
  });

  return conflicts;
}

/**
 * Check if a new or updated activity conflicts with existing scheduled activities
 * @param {Object} newActivity 
 * @param {Array} existingActivities 
 * @param {String} excludeActivityId Optional ID to exclude (e.g. during edit)
 * @returns {Array} List of conflicts
 */
function checkActivityConflict(newActivity, existingActivities = [], excludeActivityId = null) {
  const targetDay = newActivity.dayNumber;
  const start = timeToMinutes(newActivity.startTime);
  const end = timeToMinutes(newActivity.endTime);

  const conflicts = [];

  existingActivities.forEach(act => {
    if (excludeActivityId && (act._id?.toString() === excludeActivityId?.toString())) return;
    if (act.isMissed) return; // Ignore missed activities
    if (Number(act.dayNumber) !== Number(targetDay)) return;

    const actStart = timeToMinutes(act.startTime);
    const actEnd = timeToMinutes(act.endTime);

    if (doIntervalsOverlap(start, end, actStart, actEnd)) {
      conflicts.push({
        conflictingWith: act.title,
        startTime: act.startTime,
        endTime: act.endTime,
        overlapMinutes: Math.min(end, actEnd) - Math.max(start, actStart),
        message: `Overlaps with "${act.title}" scheduled for ${act.startTime} - ${act.endTime}`
      });
    }
  });

  return conflicts;
}

/**
 * Find available time slots for rescheduling (Missed-Activity Recovery)
 * Looks for gaps in the day that can fit an activity of duration `durationMinutes`
 * @param {Array} dayActivities All activities on that day
 * @param {Number} durationMinutes Required duration
 * @param {String} dayStart Default "08:00"
 * @param {String} dayEnd Default "21:00"
 * @returns {Array} List of open slot objects [{ startTime, endTime, durationMinutes }]
 */
function findAvailableGapSlots(dayActivities = [], durationMinutes = 60, dayStart = "08:00", dayEnd = "21:00") {
  const minStart = timeToMinutes(dayStart);
  const maxEnd = timeToMinutes(dayEnd);

  // Filter active activities and sort chronologically
  const activeActs = dayActivities
    .filter(a => !a.isMissed)
    .map(a => ({
      start: timeToMinutes(a.startTime),
      end: timeToMinutes(a.endTime),
      title: a.title
    }))
    .sort((a, b) => a.start - b.start);

  const openSlots = [];
  let currentTime = minStart;

  activeActs.forEach(act => {
    if (act.start > currentTime) {
      const gapDuration = act.start - currentTime;
      if (gapDuration >= durationMinutes) {
        openSlots.push({
          startTime: minutesToTime(currentTime),
          endTime: minutesToTime(currentTime + durationMinutes),
          slotStart: minutesToTime(currentTime),
          slotEnd: minutesToTime(act.start),
          gapDurationMinutes: gapDuration
        });
      }
    }
    currentTime = Math.max(currentTime, act.end);
  });

  // Check remaining gap until dayEnd
  if (currentTime < maxEnd) {
    const gapDuration = maxEnd - currentTime;
    if (gapDuration >= durationMinutes) {
      openSlots.push({
        startTime: minutesToTime(currentTime),
        endTime: minutesToTime(currentTime + durationMinutes),
        slotStart: minutesToTime(currentTime),
        slotEnd: minutesToTime(maxEnd),
        gapDurationMinutes: gapDuration
      });
    }
  }

  return openSlots;
}

module.exports = {
  timeToMinutes,
  minutesToTime,
  doIntervalsOverlap,
  detectConflicts,
  checkActivityConflict,
  findAvailableGapSlots
};
