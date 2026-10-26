/**
 * Smart Trip Suggestions & Recommendation Engine Automated Test Suite
 * Tests Feature 1:
 *  - Rule-based multi-factor scoring (Destination, Budget, Duration, Interests)
 *  - Recommendation ranking and explanations
 *  - API endpoint: GET /api/trips/recommendations
 *  - Active Test User verification: Kavya Raman (kavya@journeyhub.dev)
 */
const assert = require('assert');
const { scoreTrip, recommendTrips, calculateTripDuration } = require('../utils/tripRecommender');
const tripController = require('../controllers/tripController');
const authController = require('../controllers/authController');
const User = require('../models/User');

async function runSmartTripSuggestionsTests() {
  console.log('\n====================================================');
  console.log('   FEATURE 1: SMART TRIP SUGGESTIONS & TEST USER    ');
  console.log('====================================================');

  // --- SUB-TEST 1: Verify New User Credentials ---
  console.log('\n[TEST 1] Verifying Newly Created Test User Credentials...');
  const user = await User.findOne({ email: 'kavya@journeyhub.dev' }).select('+password');
  assert(user, 'User kavya@journeyhub.dev must exist in MongoDB');
  assert.strictEqual(user.role, 'user', 'Role must be user');
  assert.strictEqual(user.status, 'active', 'Status must be active');
  assert.strictEqual(user.emailVerified, true, 'Email must be verified');

  // Test email login
  let loginRes1 = null;
  await authController.login(
    { body: { identifier: 'kavya@journeyhub.dev', password: 'Traveler@2026!' } },
    { status(c) { this.code = c; return this; }, json(d) { loginRes1 = d; return this; } },
    (e) => { if (e) throw e; }
  );
  assert(loginRes1.success, 'Login via email must succeed');
  assert(loginRes1.token, 'Session token must be generated');

  // Test phone login
  let loginRes2 = null;
  await authController.login(
    { body: { identifier: '9876500001', password: 'Traveler@2026!' } },
    { status(c) { this.code = c; return this; }, json(d) { loginRes2 = d; return this; } },
    (e) => { if (e) throw e; }
  );
  assert(loginRes2.success, 'Login via mobile phone number must succeed');
  console.log('✔ Test 1 passed: User "Kavya Raman" verified with email & phone login.');

  // --- SUB-TEST 2: Rule-Based Multi-Factor Scoring Unit Tests ---
  console.log('\n[TEST 2] Testing Multi-Factor Scoring Engine...');
  const sampleTripA = {
    _id: 'sample_goa',
    title: 'Goa Coastal Adventure & Sunsets',
    destination: 'Goa',
    description: 'Beach hopping, water sports and seafood feasts in North and South Goa.',
    startDate: new Date('2026-11-15'),
    endDate: new Date('2026-11-19'), // 4 days
    price: 13500,
    tags: ['Beaches & Coastal', 'Adventure'],
    availableSeats: 5,
    capacity: 10
  };

  const sampleTripB = {
    _id: 'sample_manali',
    title: 'Himalayan Ridge & Solang Explorer',
    destination: 'Manali, Himachal Pradesh',
    description: 'Snow peaks, pine forests, and high pass mountain drives.',
    startDate: new Date('2026-11-20'),
    endDate: new Date('2026-11-26'), // 6 days
    price: 24000,
    tags: ['Mountains', 'Adventure', 'Trekking'],
    availableSeats: 3,
    capacity: 8
  };

  // Test destination scoring
  const scoreDestA = scoreTrip(sampleTripA, { destination: 'Goa' });
  const scoreDestB = scoreTrip(sampleTripB, { destination: 'Goa' });
  assert(scoreDestA.matchScore > scoreDestB.matchScore, 'Goa trip must outscore Manali trip when searching Goa');
  assert(scoreDestA.matchReasons.some(r => r.includes('Goa')), 'Reasons must cite destination');

  // Test budget proximity scoring
  const scoreBudgetA = scoreTrip(sampleTripA, { budget: 15000 }); // 13500 <= 15000
  const scoreBudgetB = scoreTrip(sampleTripB, { budget: 15000 }); // 24000 > 15000
  assert(scoreBudgetA.matchScore > scoreBudgetB.matchScore, 'Trip within budget must score higher');

  // Test duration scoring
  const scoreDurA = scoreTrip(sampleTripA, { duration: 4 });
  assert(scoreDurA.matchReasons.some(r => r.includes('4 days')), 'Reasons must cite exact duration');

  // Test interest scoring
  const scoreInterest = scoreTrip(sampleTripB, { interests: ['Mountains', 'Trekking'] });
  assert(scoreInterest.matchReasons.some(r => r.toLowerCase().includes('interests')), 'Reasons must cite matched interests');
  console.log('✔ Test 2 passed: Multi-factor scoring (destination, budget, duration, interests) verified.');

  // --- SUB-TEST 3: Smart Trip Suggestions API Integration ---
  console.log('\n[TEST 3] Testing GET /api/trips/recommendations Endpoint...');
  let apiRes1 = null;
  const mockReq1 = {
    query: {
      destination: 'Manali',
      budget: '30000',
      duration: '6',
      interests: 'Mountains,Adventure',
      limit: '10'
    }
  };
  const mockRes1 = {
    status(c) { this.code = c; return this; },
    json(d) { apiRes1 = d; return this; }
  };

  await tripController.getRecommendations(mockReq1, mockRes1, (e) => { if (e) throw e; });
  assert(apiRes1.success, 'Recommendation API must return success: true');
  assert(Array.isArray(apiRes1.recommendations), 'Recommendations must be an array');
  assert(apiRes1.count > 0, 'Must return at least 1 recommendation for Manali');

  const topRec = apiRes1.recommendations[0];
  assert(topRec.matchScore >= 80, `Top recommendation match score must be >= 80%, got ${topRec.matchScore}%`);
  assert(Array.isArray(topRec.matchReasons) && topRec.matchReasons.length > 0, 'Must include explanation reasons');
  assert(topRec.destination.toLowerCase().includes('manali'), `Top trip must match Manali destination, got ${topRec.destination}`);
  console.log(`✔ Test 3 passed: Top recommendation "${topRec.title}" (${topRec.matchScore}% Match, ₹${topRec.tripCost}, ${topRec.tripDays} days).`);

  // --- SUB-TEST 4: Default / Broad Recommendations (No tight constraints) ---
  console.log('\n[TEST 4] Testing Default Recommendations with General Preferences...');
  let apiRes2 = null;
  const mockReq2 = {
    query: {
      budget: '50000',
      limit: '5'
    }
  };
  const mockRes2 = {
    status(c) { this.code = c; return this; },
    json(d) { apiRes2 = d; return this; }
  };

  await tripController.getRecommendations(mockReq2, mockRes2, (e) => { if (e) throw e; });
  assert(apiRes2.success, 'API must return success');
  assert(apiRes2.recommendations.length > 0, 'Must return recommended trips within budget');
  assert(apiRes2.recommendations[0].matchScore >= 60, 'Should have positive match score');
  console.log(`✔ Test 4 passed: General preferences returned ${apiRes2.recommendations.length} curated trips.`);

  console.log('====================================================');
  console.log('✔ ALL SMART TRIP SUGGESTIONS & USER TESTS PASSED!   ');
  console.log('====================================================\n');
}

module.exports = { runSmartTripSuggestionsTests };

if (require.main === module) {
  require('dotenv').config();
  const { connectDB, disconnectDB } = require('../config/db');
  (async () => {
    try {
      await connectDB();
      await runSmartTripSuggestionsTests();
      await disconnectDB(true);
      process.exit(0);
    } catch (err) {
      console.error('❌ Tests failed:', err);
      process.exit(1);
    }
  })();
}
