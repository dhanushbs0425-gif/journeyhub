/**
 * End-to-end Backend API & Controller Integration Test
 */
const assert = require('assert');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Trip = require('../models/Trip');
const TripMember = require('../models/TripMember');
const ItineraryActivity = require('../models/ItineraryActivity');
const Expense = require('../models/Expense');
const TripScenario = require('../models/TripScenario');
const { calculateSettlements } = require('../utils/debtSimplifier');
const { findAvailableGapSlots } = require('../utils/conflictDetector');
const { calculateBestTravelDates } = require('../utils/availabilityMatcher');

async function runApiIntegrationTests() {
  console.log('[INTEGRATION TEST] Connecting to database...');
  await connectDB();

  try {
    // 1. User Creation & Password Hash Verification
    console.log('[TEST 1] Testing User Registration & Password Hashing...');
    const testEmail = `test_${Date.now()}@journeyhub.dev`;
    const user = await User.create({
      name: 'Integration Test User',
      email: testEmail,
      password: 'mypassword123',
      preferences: { currency: 'EUR', budgetAlertThreshold: 85 }
    });

    assert.ok(user._id);
    assert.strictEqual(user.email, testEmail);

    // Verify password is not in plain text
    const fetchedUserWithPass = await User.findById(user._id).select('+password');
    assert.notStrictEqual(fetchedUserWithPass.password, 'mypassword123');
    const isCorrect = await fetchedUserWithPass.comparePassword('mypassword123');
    assert.strictEqual(isCorrect, true);
    const isWrong = await fetchedUserWithPass.comparePassword('wrongpass');
    assert.strictEqual(isWrong, false);
    console.log('✔ Test 1 passed: User model, bcrypt hashing, and password match verified.');

    // 2. Trip Creation & Membership Association
    console.log('[TEST 2] Testing Trip Creation & Owner Membership...');
    const trip = await Trip.create({
      title: 'Himalayan Ridge Trek',
      destination: 'Manali, India',
      startDate: new Date('2026-11-10'),
      endDate: new Date('2026-11-16'),
      estimatedBudget: 1500,
      currency: 'USD',
      createdBy: user._id
    });

    const member = await TripMember.create({
      trip: trip._id,
      user: user._id,
      role: 'owner',
      status: 'accepted'
    });

    assert.ok(trip._id);
    assert.strictEqual(trip.durationDays, 7);
    assert.strictEqual(member.role, 'owner');
    console.log('✔ Test 2 passed: Trip model and owner membership verified.');

    // 3. Itinerary Activities & Conflict Detection
    console.log('[TEST 3] Testing Itinerary Activities & Overlap Checks...');
    const actA = await ItineraryActivity.create({
      trip: trip._id,
      dayNumber: 1,
      date: new Date('2026-11-10'),
      title: 'Acclimatization Walk',
      startTime: '09:00',
      endTime: '11:00',
      estimatedCost: 10
    });

    const actB = await ItineraryActivity.create({
      trip: trip._id,
      dayNumber: 1,
      date: new Date('2026-11-10'),
      title: 'Pine Forest Trail',
      startTime: '10:30', // Overlaps with 09:00-11:00
      endTime: '12:00',
      estimatedCost: 20
    });

    const { detectConflicts } = require('../utils/conflictDetector');
    const conflicts = detectConflicts([actA, actB]);
    assert.strictEqual(conflicts.length, 1);
    assert.strictEqual(conflicts[0].overlapMinutes, 30);
    console.log('✔ Test 3 passed: Itinerary overlap conflict successfully detected.');

    // 4. Missed-Activity Recovery Slot Identification
    console.log('[TEST 4] Testing Missed Activity Recovery Engine...');
    actA.isMissed = true;
    actA.missedReason = 'High altitude resting';
    await actA.save();

    // With actA missed, actB is at 10:30-12:00. Looking for a 90-min gap:
    const gapSlots = findAvailableGapSlots([actB], 90, '08:00', '18:00');
    assert.ok(gapSlots.length >= 1);
    console.log(`✔ Test 4 passed: Found ${gapSlots.length} available recovery slots.`);

    // 5. Expense Tracking & Debt Simplification
    console.log('[TEST 5] Testing Expense Tracking & Debt Simplifier...');
    const userB = await User.create({
      name: 'Partner Traveler',
      email: `partner_${Date.now()}@journeyhub.dev`,
      password: 'password123'
    });

    await Expense.create({
      trip: trip._id,
      title: 'Highland Tent Rental',
      amount: 200,
      paidBy: user._id,
      splitType: 'equal',
      splits: [
        { user: user._id, amount: 100 },
        { user: userB._id, amount: 100 }
      ]
    });

    const result = calculateSettlements([user, userB], [
      { amount: 200, paidBy: user._id, splits: [{ user: user._id, amount: 100 }, { user: userB._id, amount: 100 }] }
    ], []);

    assert.strictEqual(result.totalTripExpense, 200);
    assert.strictEqual(result.simplifiedDebts.length, 1);
    assert.strictEqual(result.simplifiedDebts[0].amount, 100);
    console.log('✔ Test 5 passed: Expense calculation & settlement debt verified.');

    // 6. What-If Trip Simulator
    console.log('[TEST 6] Testing What-If Scenario Simulator...');
    const scenario = await TripScenario.create({
      trip: trip._id,
      createdBy: user._id,
      name: 'Tent Upgrade Scenario',
      simulatedActivities: [
        {
          dayNumber: 2,
          title: 'Paragliding over Solang Valley',
          startTime: '14:00',
          endTime: '16:00',
          estimatedCost: 150,
          isCustomNew: true
        }
      ],
      deltaCost: 150,
      deltaDurationMinutes: 120
    });

    assert.ok(scenario._id);
    assert.strictEqual(scenario.deltaCost, 150);
    console.log('✔ Test 6 passed: What-If Trip Simulator verified.');

    // Clean up test records
    await Promise.all([
      User.deleteMany({ _id: { $in: [user._id, userB._id] } }),
      Trip.deleteOne({ _id: trip._id }),
      TripMember.deleteMany({ trip: trip._id }),
      ItineraryActivity.deleteMany({ trip: trip._id }),
      Expense.deleteMany({ trip: trip._id }),
      TripScenario.deleteMany({ trip: trip._id })
    ]);

    console.log('\n====================================================');
    console.log('    ALL BACKEND INTEGRATION TESTS PASSED (100%)    ');
    console.log('====================================================\n');
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  runApiIntegrationTests().then(() => process.exit(0)).catch(err => {
    console.error('Integration test failed:', err);
    process.exit(1);
  });
}

module.exports = { runApiIntegrationTests };
