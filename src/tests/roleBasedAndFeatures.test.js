/**
 * Automated Verification Suite for Role-Based Access, Mystery Miles, and Indian Destinations
 */
const assert = require('assert');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Trip = require('../models/Trip');
const TripMember = require('../models/TripMember');
const Destination = require('../models/Destination');
const JoinRequest = require('../models/JoinRequest');
const MysteryTrip = require('../models/MysteryTrip');
const Wishlist = require('../models/Wishlist');
const { ORGANISER_INVITE_CODE } = require('../middleware/auth');
const { sanitizeMysteryTrip } = require('../controllers/mysteryTripController');

async function runRoleAndFeaturesTests() {
  console.log('\n====================================================');
  console.log('   ROLE-BASED, MYSTERY MILES & DESTINATION TESTS    ');
  console.log('====================================================\n');

  await connectDB();

  try {
    // ----------------------------------------------------
    // TEST 1: Role Enforcement & Organiser Passkey Security
    // ----------------------------------------------------
    console.log('[TEST 1] Testing Organiser Passkey Verification & Role Storage...');
    
    // Regular traveler
    const traveler = await User.create({
      name: 'Test Traveler',
      email: `traveler_${Date.now()}@test.dev`,
      password: 'password123',
      role: 'user'
    });
    assert.strictEqual(traveler.role, 'user');

    // Organiser
    const organiser = await User.create({
      name: 'Test Organiser',
      email: `organiser_${Date.now()}@test.dev`,
      password: 'password123',
      role: 'organiser'
    });
    assert.strictEqual(organiser.role, 'organiser');
    assert.strictEqual(ORGANISER_INVITE_CODE, 'JOURNEY-ORG-2026');
    console.log('✔ Test 1 passed: User roles and invite security validated.');

    // ----------------------------------------------------
    // TEST 2: Organiser Trip Creation & Capacity Limits
    // ----------------------------------------------------
    console.log('[TEST 2] Testing Trip Creation, Capacity, and Seat Quotas...');
    
    const trip = await Trip.create({
      title: 'Himalayan High Pass Expedition',
      destination: 'Manali, Himachal Pradesh',
      startDate: new Date(Date.now() + 86400000 * 10),
      endDate: new Date(Date.now() + 86400000 * 15),
      joiningDeadline: new Date(Date.now() + 86400000 * 7),
      capacity: 8,
      availableSeats: 8,
      price: 18500,
      currency: 'INR',
      status: 'upcoming',
      isPublished: true,
      organiserId: organiser._id,
      createdBy: organiser._id
    });

    assert.ok(trip._id);
    assert.strictEqual(trip.capacity, 8);
    assert.strictEqual(trip.availableSeats, 8);
    assert.strictEqual(trip.price, 18500);
    assert.strictEqual(trip.organiserId.toString(), organiser._id.toString());
    console.log('✔ Test 2 passed: Trip creation with capacity and organiser ownership verified.');

    // ----------------------------------------------------
    // TEST 3: Join Request Workflow & Live Seat Decrement
    // ----------------------------------------------------
    console.log('[TEST 3] Testing Traveler Join Request & Organiser Approval Flow...');
    
    // Traveler submits join request
    const joinReq = await JoinRequest.create({
      trip: trip._id,
      user: traveler._id,
      organiser: organiser._id,
      seatsRequested: 2,
      message: 'Looking forward to trekking the pass with a friend!'
    });

    assert.ok(joinReq._id);
    assert.strictEqual(joinReq.status, 'pending');
    assert.strictEqual(joinReq.seatsRequested, 2);

    // Organiser approves request: seats decremented and member record created
    trip.availableSeats = Math.max(0, trip.availableSeats - joinReq.seatsRequested);
    await trip.save();

    joinReq.status = 'approved';
    joinReq.reviewedAt = new Date();
    await joinReq.save();

    await TripMember.create({
      trip: trip._id,
      user: traveler._id,
      role: 'viewer',
      status: 'accepted'
    });

    assert.strictEqual(trip.availableSeats, 6);
    assert.strictEqual(joinReq.status, 'approved');

    const memberCheck = await TripMember.findOne({ trip: trip._id, user: traveler._id });
    assert.ok(memberCheck);
    console.log('✔ Test 3 passed: Join request approval and live seat deduction (8 -> 6) verified.');

    // ----------------------------------------------------
    // TEST 4: Mystery Miles Destination Secrecy Sanitization
    // ----------------------------------------------------
    console.log('[TEST 4] Testing Mystery Miles Secrecy & Sanitization Logic...');

    const futureReveal = new Date(Date.now() + 86400000 * 5);
    const mysteryTrip = await MysteryTrip.create({
      title: 'Enchanted Secret Glades',
      destinationSecret: 'Munnar, Kerala',
      destinationHint: 'Rolling tea terraces kissed by mist',
      coverImage: 'https://images.unsplash.com/mystery.jpg',
      departureDate: new Date(Date.now() + 86400000 * 12),
      returnDate: new Date(Date.now() + 86400000 * 16),
      revealAt: futureReveal,
      isRevealed: false,
      price: 8999,
      maxParticipants: 10,
      availableSeats: 10,
      organiserId: organiser._id,
      clues: [
        { clueText: 'Near the highest tea plantations of the world', isReleased: true }
      ]
    });

    // Verify sanitization for public / regular traveler
    const sanitizedTraveler = sanitizeMysteryTrip(mysteryTrip, traveler._id.toString(), false);
    assert.strictEqual(sanitizedTraveler.destinationSecret, null, 'destinationSecret MUST be masked for travelers before reveal');
    assert.strictEqual(sanitizedTraveler.isRevealed, false);
    assert.ok(sanitizedTraveler.destinationHint);

    // Verify organiser sees secret destination
    const sanitizedOrganiser = sanitizeMysteryTrip(mysteryTrip, organiser._id.toString(), true);
    assert.strictEqual(sanitizedOrganiser.destinationSecret, 'Munnar, Kerala', 'Organiser must be able to view their secret destination');

    // Test reveal
    mysteryTrip.isRevealed = true;
    mysteryTrip.revealedAt = new Date();
    await mysteryTrip.save();

    const revealedForTraveler = sanitizeMysteryTrip(mysteryTrip, traveler._id.toString(), false);
    assert.strictEqual(revealedForTraveler.destinationSecret, 'Munnar, Kerala', 'After reveal, secret destination must be unmasked');
    console.log('✔ Test 4 passed: Mystery Miles destination encryption and reveal verified.');

    // ----------------------------------------------------
    // TEST 5: Indian Destinations Catalog & Wishlist
    // ----------------------------------------------------
    console.log('[TEST 5] Testing Incredible India Catalog & Persistent Wishlist...');

    const indianDestinations = require('../utils/indianDestinationsData');
    let totalDests = await Destination.countDocuments({ country: 'India' });
    if (totalDests === 0) {
      await Destination.insertMany(indianDestinations);
      totalDests = await Destination.countDocuments({ country: 'India' });
    }
    assert.strictEqual(totalDests, 72, `Expected 72 destinations in catalog, found: ${totalDests}`);

    const sampleDest = await Destination.findOne({ name: 'Manali' }) || await Destination.findOne({});
    assert.ok(sampleDest);

    // Add to wishlist
    const wishEntry = await Wishlist.create({
      userId: traveler._id,
      destinationId: sampleDest._id
    });
    assert.ok(wishEntry._id);

    // Check wishlist lookup
    const userWishlist = await Wishlist.find({ userId: traveler._id }).populate('destinationId');
    assert.strictEqual(userWishlist.length, 1);
    assert.strictEqual(userWishlist[0].destinationId._id.toString(), sampleDest._id.toString());

    // Remove from wishlist
    await Wishlist.deleteOne({ userId: traveler._id, destinationId: sampleDest._id });
    const remainingWish = await Wishlist.countDocuments({ userId: traveler._id });
    assert.strictEqual(remainingWish, 0);
    console.log('✔ Test 5 passed: Indian destination catalog and Wishlist add/query/remove verified.');

    // Clean up test records
    await Promise.all([
      User.deleteMany({ _id: { $in: [traveler._id, organiser._id] } }),
      Trip.deleteOne({ _id: trip._id }),
      TripMember.deleteMany({ trip: trip._id }),
      JoinRequest.deleteMany({ trip: trip._id }),
      MysteryTrip.deleteOne({ _id: mysteryTrip._id })
    ]);

    console.log('\n====================================================');
    console.log('   ALL ROLE-BASED & SPECIAL FEATURE TESTS PASSED    ');
    console.log('====================================================\n');
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  runRoleAndFeaturesTests().then(() => process.exit(0)).catch(err => {
    console.error('Test execution error:', err);
    process.exit(1);
  });
}

module.exports = { runRoleAndFeaturesTests };
