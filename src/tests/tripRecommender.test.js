/**
 * Unit Tests for Rule-Based Smart Trip Recommendation Engine
 */
const assert = require('assert');
const { scoreTrip, recommendTrips, calculateTripDuration } = require('../utils/tripRecommender');

function runAll() {
  console.log('Running Smart Trip Recommender Unit Tests...');

  const mockTrips = [
    {
      _id: 'trip_goa_beach',
      title: 'Sun & Sand Goa Retreat',
      destination: 'Goa',
      description: 'Relax on the beaches of North Goa with water sports and shacks.',
      startDate: new Date('2026-11-01'),
      endDate: new Date('2026-11-05'), // 4 days
      price: 12000,
      tags: ['Beaches & Coastal', 'Adventure', 'Nightlife'],
      availableSeats: 6,
      capacity: 10,
      isPublished: true
    },
    {
      _id: 'trip_manali_trek',
      title: 'Manali Snow & Trek Expedition',
      destination: 'Manali, Himachal Pradesh',
      description: 'High altitude Himalayan trekking and camping adventure.',
      startDate: new Date('2026-11-10'),
      endDate: new Date('2026-11-17'), // 7 days
      price: 24000,
      tags: ['Mountains', 'Adventure', 'Trekking'],
      availableSeats: 4,
      capacity: 8,
      isPublished: true
    },
    {
      _id: 'trip_kerala_backwaters',
      title: 'Enchanted Kerala Backwaters',
      destination: 'Alleppey & Munnar, Kerala',
      description: 'Serene houseboat cruise and aromatic tea plantations.',
      startDate: new Date('2026-12-01'),
      endDate: new Date('2026-12-05'), // 4 days
      price: 15000,
      tags: ['Beaches & Coastal', 'Cultural', 'Nature'],
      availableSeats: 8,
      capacity: 12,
      isPublished: true
    },
    {
      _id: 'trip_jaipur_heritage',
      title: 'Royal Rajasthan Heritage Explorer',
      destination: 'Jaipur, Rajasthan',
      description: 'Grand palaces, historic forts, and traditional bazaars.',
      startDate: new Date('2026-11-15'),
      endDate: new Date('2026-11-18'), // 3 days
      price: 9500,
      tags: ['Heritage & Historical', 'Cultural'],
      availableSeats: 10,
      capacity: 15,
      isPublished: true
    }
  ];

  // Test 1: Duration calculation
  const dur1 = calculateTripDuration(mockTrips[0]);
  assert.strictEqual(dur1, 4, 'Goa trip should calculate to 4 days');
  const dur2 = calculateTripDuration(mockTrips[1]);
  assert.strictEqual(dur2, 7, 'Manali trip should calculate to 7 days');
  console.log('✔ calculateTripDuration verified');

  // Test 2: Destination exact and partial match
  const scoreGoa = scoreTrip(mockTrips[0], { destination: 'Goa' });
  const scoreManali = scoreTrip(mockTrips[1], { destination: 'Goa' });
  assert(scoreGoa.matchScore > scoreManali.matchScore, 'Goa trip must score higher for destination Goa');
  assert(scoreGoa.matchReasons.some(r => r.includes('Goa')), 'Must explain destination match');
  console.log('✔ Destination matching score verified');

  // Test 3: Budget cutoff
  const scoreBudgetOk = scoreTrip(mockTrips[0], { budget: 15000 }); // cost 12000 <= 15000
  const scoreBudgetExceeded = scoreTrip(mockTrips[1], { budget: 15000 }); // cost 24000 > 15000 (1.6x)
  assert(scoreBudgetOk.matchScore > scoreBudgetExceeded.matchScore, 'Trip within budget must score higher');
  console.log('✔ Budget proximity scoring verified');

  // Test 4: Duration matching
  const scoreDurMatch = scoreTrip(mockTrips[0], { duration: 4 }); // 4 days exact
  const scoreDurDiff = scoreTrip(mockTrips[1], { duration: 4 }); // 7 days (diff 3)
  assert(scoreDurMatch.matchScore > scoreDurDiff.matchScore, 'Exact duration match must score higher');
  console.log('✔ Duration proximity scoring verified');

  // Test 5: Tag & Interest matching
  const scoreInterests = scoreTrip(mockTrips[1], { interests: ['Trekking', 'Mountains'] });
  assert(scoreInterests.matchReasons.some(r => r.toLowerCase().includes('interests')), 'Must list matched interests');
  console.log('✔ Interest / Tag matching verified');

  // Test 6: Composite recommendation ordering
  // Traveler wanting Beach & Budget <= 14000 & 4 days duration
  const recommendations = recommendTrips(mockTrips, {
    destination: 'Goa',
    budget: 14000,
    duration: 4,
    interests: ['Beaches']
  });
  assert(recommendations.length > 0, 'Should find recommendations');
  assert.strictEqual(recommendations[0]._id, 'trip_goa_beach', 'Top recommendation must be Goa trip');
  assert(recommendations[0].matchScore >= 90, `Top recommendation match score should be >= 90%, got ${recommendations[0].matchScore}%`);
  console.log(`✔ Top recommendation for Goa Beach (Score: ${recommendations[0].matchScore}%): ${recommendations[0].title}`);

  // Test 7: Multi-criteria with Heritage & Jaipur
  const recsJaipur = recommendTrips(mockTrips, {
    destination: 'Jaipur',
    budget: 10000,
    duration: 3,
    interests: ['Heritage']
  });
  assert.strictEqual(recsJaipur[0]._id, 'trip_jaipur_heritage', 'Top recommendation must be Jaipur trip');
  assert(recsJaipur[0].matchScore >= 90, `Jaipur score should be >= 90%, got ${recsJaipur[0].matchScore}%`);
  console.log(`✔ Top recommendation for Jaipur Heritage (Score: ${recsJaipur[0].matchScore}%): ${recsJaipur[0].title}`);

  console.log('All Smart Trip Recommender Unit Tests Passed!\n');
}

module.exports = { runAll };

if (require.main === module) {
  runAll();
}
