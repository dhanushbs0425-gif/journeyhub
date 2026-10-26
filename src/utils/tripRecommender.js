/**
 * Rule-Based Smart Trip Recommendation Engine
 * Evaluates published trips against traveler preferences (Destination, Budget, Duration, Interests)
 * using deterministic multi-factor scoring without requiring paid AI APIs.
 */

/**
 * Calculate trip duration in days
 * @param {Object} trip 
 * @returns {Number} Duration in days (minimum 1)
 */
function calculateTripDuration(trip) {
  if (trip.durationDays && Number(trip.durationDays) > 0) {
    return Math.max(1, Math.round(Number(trip.durationDays)));
  }
  if (trip.startDate && trip.endDate) {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs > 0) {
      return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    }
  }
  return 3; // sensible default
}

/**
 * Score a single trip against user criteria
 * @param {Object} trip 
 * @param {Object} criteria 
 * @returns {Object} { matchScore: Number, matchReasons: Array<String>, tripDays: Number, tripCost: Number }
 */
function scoreTrip(trip, criteria = {}) {
  const tripDays = calculateTripDuration(trip);
  const tripCost = Number(trip.price || trip.estimatedBudget || 0);
  const availableSeats = trip.availableSeats !== undefined ? Number(trip.availableSeats) : (Number(trip.capacity) || 10);
  const tripTags = Array.isArray(trip.tags) ? trip.tags : [];
  const searchableText = `${trip.title || ''} ${trip.destination || ''} ${trip.description || ''} ${tripTags.join(' ')}`.toLowerCase();

  let destinationPts = 0;
  let budgetPts = 0;
  let durationPts = 0;
  let interestPts = 0;
  let seatsBonus = 0;
  const matchReasons = [];

  // --- 1. Destination Matching (Weight: 35) ---
  const destQuery = (criteria.destination || '').trim().toLowerCase();
  if (destQuery) {
    const tripDest = (trip.destination || '').toLowerCase();
    const tripTitle = (trip.title || '').toLowerCase();

    if (tripDest === destQuery) {
      destinationPts = 35;
      matchReasons.push(`Destination exact match: "${trip.destination}"`);
    } else if (tripDest.includes(destQuery) || destQuery.includes(tripDest)) {
      destinationPts = 30;
      matchReasons.push(`Destination matches "${trip.destination}"`);
    } else if (tripTitle.includes(destQuery)) {
      destinationPts = 25;
      matchReasons.push(`Trip title matches "${trip.title}"`);
    } else if (searchableText.includes(destQuery)) {
      destinationPts = 15;
      matchReasons.push(`Mentions destination keyword`);
    } else {
      destinationPts = 0;
    }
  } else {
    // Neutral score when destination is not specified
    destinationPts = 20;
  }

  // --- 2. Budget Matching (Weight: 30) ---
  const maxBudget = Number(criteria.budget || criteria.maxBudget || 0);
  if (maxBudget > 0) {
    if (tripCost <= maxBudget) {
      budgetPts = 30;
      const savings = maxBudget - tripCost;
      if (savings > 0) {
        matchReasons.push(`Within budget: ₹${tripCost.toLocaleString('en-IN')} (saves ₹${savings.toLocaleString('en-IN')})`);
      } else {
        matchReasons.push(`Exact match for your ₹${maxBudget.toLocaleString('en-IN')} budget`);
      }
    } else if (tripCost <= maxBudget * 1.15) {
      budgetPts = 18;
      matchReasons.push(`Slight budget stretch (+${Math.round(((tripCost - maxBudget) / maxBudget) * 100)}%)`);
    } else if (tripCost <= maxBudget * 1.30) {
      budgetPts = 10;
      matchReasons.push(`Moderate budget stretch (+${Math.round(((tripCost - maxBudget) / maxBudget) * 100)}%)`);
    } else {
      budgetPts = 0;
    }
  } else {
    // Neutral score when budget is not specified
    budgetPts = 20;
  }

  // --- 3. Duration Matching (Weight: 20) ---
  const targetDuration = Number(criteria.duration || criteria.durationDays || 0);
  if (targetDuration > 0) {
    const diff = Math.abs(tripDays - targetDuration);
    if (diff === 0) {
      durationPts = 20;
      matchReasons.push(`Exact duration match: ${tripDays} days`);
    } else if (diff === 1) {
      durationPts = 15;
      matchReasons.push(`Duration: ${tripDays} days (1 day difference)`);
    } else if (diff === 2) {
      durationPts = 10;
      matchReasons.push(`Duration: ${tripDays} days (2 days difference)`);
    } else if (diff === 3) {
      durationPts = 5;
    } else {
      durationPts = 0;
    }
  } else {
    // Neutral score when duration is not specified
    durationPts = 15;
  }

  // --- 4. Interests / Category Matching (Weight: 15) ---
  let userInterests = [];
  if (Array.isArray(criteria.interests)) {
    userInterests = criteria.interests.map(i => (i || '').trim().toLowerCase()).filter(Boolean);
  } else if (typeof criteria.interests === 'string' && criteria.interests.trim()) {
    userInterests = criteria.interests.split(',').map(i => i.trim().toLowerCase()).filter(Boolean);
  }

  if (userInterests.length > 0) {
    const matched = userInterests.filter(interest => {
      // Check tags, title, destination and description
      const hasInTags = tripTags.some(t => (t || '').toLowerCase().includes(interest) || interest.includes((t || '').toLowerCase()));
      return hasInTags || searchableText.includes(interest);
    });

    if (matched.length >= 2) {
      interestPts = 15;
      matchReasons.push(`Matches interests: ${matched.slice(0, 2).map(capitalize).join(', ')}`);
    } else if (matched.length === 1) {
      interestPts = 10;
      matchReasons.push(`Matches interest: ${capitalize(matched[0])}`);
    } else {
      interestPts = 0;
    }
  } else {
    // Neutral score when interests are not specified
    interestPts = 10;
  }

  // --- 5. Seats Availability Bonus (5 bonus points) ---
  if (availableSeats > 0) {
    seatsBonus = 5;
    matchReasons.push(`${availableSeats} seat${availableSeats === 1 ? '' : 's'} available to join`);
  }

  // Calculate composite match score (capped at 100)
  const rawScore = destinationPts + budgetPts + durationPts + interestPts + seatsBonus;
  const matchScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  return {
    matchScore,
    matchReasons,
    tripDays,
    tripCost
  };
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Recommend trips based on user criteria
 * @param {Array<Object>} trips Candidate published trips
 * @param {Object} criteria { destination, budget, duration, interests, limit }
 * @returns {Array<Object>} Recommended trips sorted by match score descending
 */
function recommendTrips(trips = [], criteria = {}) {
  if (!Array.isArray(trips) || trips.length === 0) {
    return [];
  }

  const scoredTrips = trips.map(trip => {
    // Support mongoose document or plain object
    const tripObj = typeof trip.toObject === 'function' ? trip.toObject() : { ...trip };
    const scoreData = scoreTrip(tripObj, criteria);
    return {
      ...tripObj,
      matchScore: scoreData.matchScore,
      matchReasons: scoreData.matchReasons,
      tripDays: scoreData.tripDays,
      tripCost: scoreData.tripCost
    };
  });

  // Sort descending by match score, secondary sort by available seats
  scoredTrips.sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    return (b.availableSeats || 0) - (a.availableSeats || 0);
  });

  // If user provided specific destination or budget criteria, filter out non-matches (score < 40)
  const hasSpecificCriteria = Boolean(
    (criteria.destination && criteria.destination.trim()) ||
    (criteria.budget && Number(criteria.budget) > 0) ||
    (criteria.duration && Number(criteria.duration) > 0) ||
    (criteria.interests && (Array.isArray(criteria.interests) ? criteria.interests.length > 0 : criteria.interests.trim().length > 0))
  );

  const filtered = hasSpecificCriteria
    ? scoredTrips.filter(t => t.matchScore >= 40)
    : scoredTrips;

  const limit = Number(criteria.limit) > 0 ? Number(criteria.limit) : 20;
  return filtered.slice(0, limit);
}

module.exports = {
  scoreTrip,
  recommendTrips,
  calculateTripDuration
};
