/**
 * JourneyHub Group Availability Matcher Utility
 * Computes calendar date overlaps across group members to discover
 * the optimal travel window with maximum member participation.
 */

/**
 * Format a Date object to "YYYY-MM-DD"
 */
function toDateKey(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Add days to a Date
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Compute group availability match
 * @param {Array} memberAvailabilities - Array of { memberId, name, intervals: [{ startDate, endDate }] }
 * @param {Number} targetDurationDays - Desired trip length in days (e.g. 5)
 * @returns {Object} { bestWindow, rankedWindows, dailyHeatMap, totalMembers }
 */
function calculateBestTravelDates(memberAvailabilities = [], targetDurationDays = 5) {
  if (!memberAvailabilities || memberAvailabilities.length === 0) {
    return {
      bestWindow: null,
      rankedWindows: [],
      dailyHeatMap: [],
      totalMembers: 0
    };
  }

  const totalMembers = memberAvailabilities.length;
  let minDate = null;
  let maxDate = null;

  // Flatten member availability into a map of dateKey -> Set of available memberIds
  const dateToMemberMap = new Map();
  const memberInfoMap = new Map();

  memberAvailabilities.forEach(mem => {
    const memberId = mem.memberId || mem._id || mem.id;
    memberInfoMap.set(memberId.toString(), {
      id: memberId.toString(),
      name: mem.name || 'Group Member',
      avatar: mem.avatar || ''
    });

    if (Array.isArray(mem.intervals)) {
      mem.intervals.forEach(inv => {
        const start = new Date(inv.startDate);
        const end = new Date(inv.endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

        if (!minDate || start < minDate) minDate = new Date(start);
        if (!maxDate || end > maxDate) maxDate = new Date(end);

        let curr = new Date(start);
        while (curr <= end) {
          const key = toDateKey(curr);
          if (!dateToMemberMap.has(key)) {
            dateToMemberMap.set(key, new Set());
          }
          dateToMemberMap.get(key).add(memberId.toString());
          curr = addDays(curr, 1);
        }
      });
    }
  });

  if (!minDate || !maxDate) {
    return {
      bestWindow: null,
      rankedWindows: [],
      dailyHeatMap: [],
      totalMembers
    };
  }

  // Generate daily heat map from minDate to maxDate
  const dailyHeatMap = [];
  let runner = new Date(minDate);
  const allDateKeys = [];

  while (runner <= maxDate) {
    const key = toDateKey(runner);
    allDateKeys.push(key);
    const availableSet = dateToMemberMap.get(key) || new Set();
    const availableMembers = [];
    const unavailableMembers = [];

    memberInfoMap.forEach((info, id) => {
      if (availableSet.has(id)) {
        availableMembers.push(info);
      } else {
        unavailableMembers.push(info);
      }
    });

    dailyHeatMap.push({
      date: key,
      availableCount: availableSet.size,
      totalMembers,
      percentage: Math.round((availableSet.size / totalMembers) * 100),
      availableMembers,
      unavailableMembers
    });

    runner = addDays(runner, 1);
  }

  // Compute sliding window of length targetDurationDays
  const candidateWindows = [];
  const duration = Math.max(1, targetDurationDays);

  for (let i = 0; i <= allDateKeys.length - duration; i++) {
    const windowDateKeys = allDateKeys.slice(i, i + duration);
    const startDate = windowDateKeys[0];
    const endDate = windowDateKeys[windowDateKeys.length - 1];

    // Find members who are available on EVERY day in this window
    const windowAvailableMemberIds = new Set(memberInfoMap.keys());

    windowDateKeys.forEach(dateKey => {
      const dailySet = dateToMemberMap.get(dateKey) || new Set();
      for (const id of windowAvailableMemberIds) {
        if (!dailySet.has(id)) {
          windowAvailableMemberIds.delete(id);
        }
      }
    });

    const fullyAvailable = [];
    const partialOrUnavailable = [];

    memberInfoMap.forEach((info, id) => {
      if (windowAvailableMemberIds.has(id)) {
        fullyAvailable.push(info);
      } else {
        partialOrUnavailable.push(info);
      }
    });

    const score = Math.round((fullyAvailable.length / totalMembers) * 100);

    candidateWindows.push({
      startDate,
      endDate,
      durationDays: duration,
      availableCount: fullyAvailable.length,
      totalMembers,
      matchPercentage: score,
      availableMembers: fullyAvailable,
      unavailableMembers: partialOrUnavailable
    });
  }

  // Sort candidate windows descending by matchPercentage, then earlier start dates
  candidateWindows.sort((a, b) => {
    if (b.matchPercentage !== a.matchPercentage) {
      return b.matchPercentage - a.matchPercentage;
    }
    return new Date(a.startDate) - new Date(b.startDate);
  });

  const bestWindow = candidateWindows.length > 0 ? candidateWindows[0] : null;

  return {
    bestWindow,
    rankedWindows: candidateWindows.slice(0, 10), // Top 10 windows
    dailyHeatMap,
    totalMembers
  };
}

module.exports = {
  calculateBestTravelDates,
  toDateKey,
  addDays
};
