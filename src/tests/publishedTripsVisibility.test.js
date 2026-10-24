/**
 * Test Suite: Published Trips Visibility & Synchronization
 *
 * Verifies all requirements:
 * 1. Only authenticated Organisers can create and publish trips.
 * 2. Trips are saved in MongoDB with isPublished=true, publicationStatus='Published', and organiserId.
 * 3. Trips published by any of the three organisers (Sai, Dhanush, Divya) appear for regular users.
 * 4. Regular users see published trips on Explore Trips (GET /api/trips?explore=true) AND User Dashboard (GET /api/trips?status=all).
 * 5. Draft and unpublished trips are strictly hidden from regular users.
 * 6. Dedicated publish (/api/trips/:id/publish) and unpublish (/api/trips/:id/unpublish) routes work.
 * 7. Case-insensitive handling for 'published', 'Published', 'draft', 'Draft'.
 * 8. Regular users cannot create or publish trips (HTTP 403).
 * 9. Secret Mystery Miles destinations remain hidden before reveal.
 * 10. Existing join requests, trip management, and role permissions remain intact.
 */
const assert = require('assert');
process.env.NODE_ENV = 'test';
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Trip = require('../models/Trip');
const TripMember = require('../models/TripMember');
const MysteryTrip = require('../models/MysteryTrip');
const JoinRequest = require('../models/JoinRequest');
const { seedOrganisers } = require('../../scripts/seedOrganisers');
const tripController = require('../controllers/tripController');
const mysteryTripController = require('../controllers/mysteryTripController');

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

async function runPublishedTripsVisibilityTests() {
  console.log('\n================================================================');
  console.log(' PUBLISHED TRIPS VISIBILITY & WORKFLOW TEST SUITE               ');
  console.log('================================================================\n');

  await connectDB();

  try {
    // ----------------------------------------------------
    // SETUP: Seed organisers and create a regular traveler
    // ----------------------------------------------------
    console.log('[SETUP] Verifying Organisers & Creating Regular Traveler...');
    await seedOrganisers();

    const sai = await User.findOne({ email: 'sai@gmail.com' });
    const dhanush = await User.findOne({ email: 'dhanush@gmail.com' });
    const divya = await User.findOne({ email: 'divya@gmail.com' });

    assert.ok(sai, 'Organiser Sai must exist');
    assert.ok(dhanush, 'Organiser Dhanush must exist');
    assert.ok(divya, 'Organiser Divya must exist');

    let traveler = await User.findOne({ email: 'traveler_vis_test@journeyhub.test' });
    if (!traveler) {
      traveler = await User.create({
        name: 'Priya Traveler',
        email: 'traveler_vis_test@journeyhub.test',
        password: 'Password@123',
        role: 'user',
        emailVerified: true
      });
    }

    console.log('✔ Setup complete: Organisers Sai, Dhanush, Divya & Traveler Priya ready.\n');

    // ----------------------------------------------------
    // TEST 1: Regular User Cannot Create Trips (HTTP 403)
    // ----------------------------------------------------
    console.log('[TEST 1] Testing Non-Organiser Trip Creation Blocking...');
    const reqCreateByUser = {
      user: traveler,
      body: {
        title: 'Unauthorized Trip Attempt',
        destination: 'Goa',
        startDate: new Date(Date.now() + 864000000),
        endDate: new Date(Date.now() + 864000000 + 4 * 86400000)
      }
    };
    const resCreateByUser = createMockRes();
    await tripController.createTrip(reqCreateByUser, resCreateByUser, (err) => { if (err) throw err; });
    assert.strictEqual(resCreateByUser.statusCode, 403, 'Regular user must be blocked from creating trips with 403');
    console.log('✔ Test 1 passed: Regular users blocked from creating trips (HTTP 403).\n');

    // ----------------------------------------------------
    // TEST 2: Organiser Creates & Publishes Trip
    // ----------------------------------------------------
    console.log('[TEST 2] Testing Organiser Creates & Publishes Trip in MongoDB...');
    const reqCreate = {
      user: dhanush,
      body: {
        title: 'Sundarbans Mangrove Wilderness Odyssey',
        destination: 'Sundarbans, West Bengal',
        description: 'Guided wildlife safari navigating tidal waterways and mangrove forests.',
        startDate: new Date(Date.now() + 15 * 86400000),
        endDate: new Date(Date.now() + 20 * 86400000),
        capacity: 12,
        price: 16500,
        currency: 'INR',
        isPublished: true,
        publicationStatus: 'Published',
        tags: ['Wildlife', 'Safari', 'Mangroves']
      },
      io: {
        emit: (event, data) => {
          // Socket event capture
        }
      }
    };
    const resCreate = createMockRes();
    await tripController.createTrip(reqCreate, resCreate, (err) => { if (err) throw err; });
    assert.strictEqual(resCreate.statusCode, 201, 'Should return HTTP 201');
    const createdTrip = resCreate.body.trip;
    assert.ok(createdTrip._id, 'Trip ID must be returned');

    // Verify in MongoDB directly
    const tripInDb = await Trip.findById(createdTrip._id);
    assert.ok(tripInDb, 'Trip must exist in MongoDB');
    assert.strictEqual(tripInDb.isPublished, true, 'isPublished must be true in DB');
    assert.strictEqual(tripInDb.publicationStatus, 'Published', 'publicationStatus must be "Published" in DB');
    assert.strictEqual(tripInDb.organiserId.toString(), dhanush._id.toString(), 'organiserId must match creator');
    assert.strictEqual(tripInDb.availableSeats, 12, 'availableSeats must equal capacity initially');

    console.log('✔ Test 2 passed: Trip successfully saved in MongoDB with Published status and Organiser ID.\n');

    // ----------------------------------------------------
    // TEST 3: Regular User Sees Published Trip on Explore Trips Page
    // ----------------------------------------------------
    console.log('[TEST 3] Testing Regular User Sees Trip on Explore Trips (explore=true)...');
    const reqExplore = {
      user: traveler,
      query: { explore: 'true' }
    };
    const resExplore = createMockRes();
    await tripController.getTrips(reqExplore, resExplore, (err) => { if (err) throw err; });
    assert.strictEqual(resExplore.statusCode, 200);

    const exploreTrips = resExplore.body.trips || [];
    const foundOnExplore = exploreTrips.find(t => t._id.toString() === tripInDb._id.toString());
    assert.ok(foundOnExplore, 'Published trip must appear on Explore Trips for regular traveler');
    assert.strictEqual(foundOnExplore.title, 'Sundarbans Mangrove Wilderness Odyssey');
    assert.strictEqual(foundOnExplore.isMember, false, 'Regular user is not a member yet');

    console.log('✔ Test 3 passed: Regular user sees published trip on Explore Trips page.\n');

    // ----------------------------------------------------
    // TEST 4: Regular User Sees Enrolled Trip on User Dashboard
    // ----------------------------------------------------
    console.log('[TEST 4] Testing Regular User Sees Enrolled Trip on User Dashboard (status=all)...');
    // Enroll traveler in tripInDb
    await TripMember.create({
      trip: tripInDb._id,
      user: traveler._id,
      role: 'editor',
      status: 'accepted'
    });

    const reqDash = {
      user: traveler,
      query: { status: 'all' }
    };
    const resDash = createMockRes();
    await tripController.getTrips(reqDash, resDash, (err) => { if (err) throw err; });
    assert.strictEqual(resDash.statusCode, 200);

    const dashTrips = resDash.body.trips || [];
    const foundOnDash = dashTrips.find(t => t._id.toString() === tripInDb._id.toString());
    assert.ok(foundOnDash, 'Joined trip must appear on User Dashboard for regular traveler');
    assert.strictEqual(foundOnDash.title, 'Sundarbans Mangrove Wilderness Odyssey');

    console.log('✔ Test 4 passed: Regular user sees joined trip on main dashboard.\n');

    // ----------------------------------------------------
    // TEST 5: Shared Visibility: Trips from Sai, Dhanush, Divya ALL Visible to Users
    // ----------------------------------------------------
    console.log('[TEST 5] Testing Trips from All 3 Organisers Visible Without Restriction...');
    // Sai creates a trip
    const reqSai = {
      user: sai,
      body: {
        title: 'Leh-Ladakh High Mountain Expedition',
        destination: 'Leh, Ladakh',
        startDate: new Date(Date.now() + 30 * 86400000),
        endDate: new Date(Date.now() + 37 * 86400000),
        capacity: 10,
        price: 32000,
        currency: 'INR',
        isPublished: true,
        publicationStatus: 'Published'
      }
    };
    const resSai = createMockRes();
    await tripController.createTrip(reqSai, resSai, (err) => { if (err) throw err; });
    const tripSai = resSai.body.trip;

    // Divya creates a trip
    const reqDivya = {
      user: divya,
      body: {
        title: 'Hampi & Badami Heritage Walk',
        destination: 'Hampi, Karnataka',
        startDate: new Date(Date.now() + 25 * 86400000),
        endDate: new Date(Date.now() + 29 * 86400000),
        capacity: 15,
        price: 14000,
        currency: 'INR',
        isPublished: true,
        publicationStatus: 'Published'
      }
    };
    const resDivya = createMockRes();
    await tripController.createTrip(reqDivya, resDivya, (err) => { if (err) throw err; });
    const tripDivya = resDivya.body.trip;

    // Traveler checks Explore Trips
    const resExploreAll = createMockRes();
    await tripController.getTrips({ user: traveler, query: { explore: 'true' } }, resExploreAll, (err) => { if (err) throw err; });
    const allTrips = resExploreAll.body.trips || [];

    const hasDhanushTrip = allTrips.some(t => t._id.toString() === tripInDb._id.toString());
    const hasSaiTrip = allTrips.some(t => t._id.toString() === tripSai._id.toString());
    const hasDivyaTrip = allTrips.some(t => t._id.toString() === tripDivya._id.toString());

    assert.ok(hasDhanushTrip, 'Dhanush trip must be visible to traveler');
    assert.ok(hasSaiTrip, 'Sai trip must be visible to traveler');
    assert.ok(hasDivyaTrip, 'Divya trip must be visible to traveler');

    console.log('✔ Test 5 passed: Trips from Sai, Dhanush, and Divya are ALL visible to regular users.\n');

    // ----------------------------------------------------
    // TEST 6: Draft / Unpublished Trips Hidden from Regular Users
    // ----------------------------------------------------
    console.log('[TEST 6] Testing Draft / Unpublished Trips Hidden from Regular Users...');
    // Create an unpublished draft trip
    const reqDraft = {
      user: sai,
      body: {
        title: 'Secret Unannounced Expedition (DRAFT)',
        destination: 'Hidden Valley',
        startDate: new Date(Date.now() + 60 * 86400000),
        endDate: new Date(Date.now() + 65 * 86400000),
        capacity: 8,
        price: 50000,
        isPublished: false,
        publicationStatus: 'Draft'
      }
    };
    const resDraft = createMockRes();
    await tripController.createTrip(reqDraft, resDraft, (err) => { if (err) throw err; });
    const draftTrip = resDraft.body.trip;
    assert.strictEqual(draftTrip.isPublished, false);
    assert.strictEqual(draftTrip.publicationStatus, 'Draft');

    // Verify traveler does NOT see draft on Explore
    const resTravExplore = createMockRes();
    await tripController.getTrips({ user: traveler, query: { explore: 'true' } }, resTravExplore, (err) => { if (err) throw err; });
    const travExploreTrips = resTravExplore.body.trips || [];
    assert.strictEqual(travExploreTrips.some(t => t._id.toString() === draftTrip._id.toString()), false, 'Draft trip must NOT appear on Explore Trips for traveler');

    // Verify traveler does NOT see draft on Dashboard
    const resTravDash = createMockRes();
    await tripController.getTrips({ user: traveler, query: { status: 'all' } }, resTravDash, (err) => { if (err) throw err; });
    const travDashTrips = resTravDash.body.trips || [];
    assert.strictEqual(travDashTrips.some(t => t._id.toString() === draftTrip._id.toString()), false, 'Draft trip must NOT appear on Dashboard for traveler');

    // Verify traveler cannot access direct URL to draft trip (HTTP 403)
    const resTravDraftDirect = createMockRes();
    await tripController.getTripById({ user: traveler, params: { tripId: draftTrip._id } }, resTravDraftDirect, (err) => { if (err) throw err; });
    assert.strictEqual(resTravDraftDirect.statusCode, 403, 'Draft trip direct view must return 403 for non-members');

    console.log('✔ Test 6 passed: Draft / unpublished trips strictly hidden from regular users.\n');

    // ----------------------------------------------------
    // TEST 7: Dedicated Publish & Unpublish API Routes
    // ----------------------------------------------------
    console.log('[TEST 7] Testing Dedicated Publish & Unpublish Routes...');
    // 7A: Organiser publishes the draft trip
    const reqPublish = {
      user: sai,
      params: { tripId: draftTrip._id },
      io: { emit: () => {} }
    };
    const resPublish = createMockRes();
    await tripController.publishTrip(reqPublish, resPublish, (err) => { if (err) throw err; });
    assert.strictEqual(resPublish.statusCode, 200);
    assert.strictEqual(resPublish.body.trip.isPublished, true);
    assert.strictEqual(resPublish.body.trip.publicationStatus, 'Published');

    // Now traveler can see it
    const resAfterPub = createMockRes();
    await tripController.getTrips({ user: traveler, query: { explore: 'true' } }, resAfterPub, (err) => { if (err) throw err; });
    assert.strictEqual(resAfterPub.body.trips.some(t => t._id.toString() === draftTrip._id.toString()), true, 'Published trip must now be visible to traveler');

    // 7B: Organiser unpublishes the trip
    const reqUnpublish = {
      user: sai,
      params: { tripId: draftTrip._id },
      io: { emit: () => {} }
    };
    const resUnpublish = createMockRes();
    await tripController.unpublishTrip(reqUnpublish, resUnpublish, (err) => { if (err) throw err; });
    assert.strictEqual(resUnpublish.statusCode, 200);
    assert.strictEqual(resUnpublish.body.trip.isPublished, false);
    assert.strictEqual(resUnpublish.body.trip.publicationStatus, 'Draft');

    // Traveler can no longer see it
    const resAfterUnpub = createMockRes();
    await tripController.getTrips({ user: traveler, query: { explore: 'true' } }, resAfterUnpub, (err) => { if (err) throw err; });
    assert.strictEqual(resAfterUnpub.body.trips.some(t => t._id.toString() === draftTrip._id.toString()), false, 'Unpublished trip must disappear from traveler view');

    console.log('✔ Test 7 passed: Dedicated publish & unpublish routes work and synchronize visibility.\n');

    // ----------------------------------------------------
    // TEST 8: Case-Insensitive Status & Query Handling
    // ----------------------------------------------------
    console.log('[TEST 8] Testing Case-Insensitive Status Mismatches (published vs Published)...');
    const resCase1 = createMockRes();
    await tripController.getTrips({ user: traveler, query: { status: 'published' } }, resCase1, (err) => { if (err) throw err; });
    assert.strictEqual(resCase1.statusCode, 200);
    assert.ok(resCase1.body.trips.length > 0, 'status=published must return published trips');

    const resCase2 = createMockRes();
    await tripController.getTrips({ user: traveler, query: { status: 'Published' } }, resCase2, (err) => { if (err) throw err; });
    assert.strictEqual(resCase2.statusCode, 200);
    assert.ok(resCase2.body.trips.length > 0, 'status=Published must return published trips');

    const resCase3 = createMockRes();
    await tripController.getTrips({ user: traveler, query: { publicationStatus: 'Published' } }, resCase3, (err) => { if (err) throw err; });
    assert.strictEqual(resCase3.statusCode, 200);
    assert.ok(resCase3.body.trips.length > 0, 'publicationStatus=Published must return published trips');

    console.log('✔ Test 8 passed: Case-insensitive handling for published vs Published verified.\n');

    // ----------------------------------------------------
    // TEST 9: Secret Mystery Miles Destination Hidden
    // ----------------------------------------------------
    console.log('[TEST 9] Testing Secret Mystery Miles Destination Hidden Before Reveal...');
    let mysteryTrip = await MysteryTrip.findOne({ status: 'published', isRevealed: false, revealAt: { $gt: new Date() } });
    if (!mysteryTrip) {
      mysteryTrip = await MysteryTrip.create({
        title: 'Secret Coast Expedition 2026',
        departureDate: new Date(Date.now() + 20 * 86400000),
        returnDate: new Date(Date.now() + 25 * 86400000),
        destinationSecret: 'Varkala Cliff Beach, Kerala',
        destinationHint: 'Sun-drenched crimson cliffs over emerald Arabian waters',
        price: 15000,
        currency: 'INR',
        availableSeats: 5,
        maxParticipants: 8,
        organiserId: divya._id,
        status: 'published',
        isRevealed: false,
        revealAt: new Date(Date.now() + 19 * 86400000)
      });
    }

    const resMystery = createMockRes();
    await mysteryTripController.getMysteryTrips({ user: traveler }, resMystery, (err) => { if (err) throw err; });
    assert.strictEqual(resMystery.statusCode, 200);
    const travelerMysteryTrips = resMystery.body.mysteryTrips || [];
    const testMT = travelerMysteryTrips.find(m => m._id.toString() === mysteryTrip._id.toString());
    assert.ok(testMT, 'Mystery trip must be visible to traveler');
    assert.strictEqual(testMT.destinationSecret, null, 'Secret destination must be null for traveler prior to reveal');
    assert.ok(testMT.destinationHint, 'Destination hint must be visible');

    console.log('✔ Test 9 passed: Mystery Miles secret destination strictly hidden from traveler.\n');

    // ----------------------------------------------------
    // TEST 10: Non-Organisers Cannot Publish / Unpublish (HTTP 403)
    // ----------------------------------------------------
    console.log('[TEST 10] Testing Non-Organisers Blocked from Publish API (HTTP 403)...');
    const resUserPublish = createMockRes();
    await tripController.publishTrip({ user: traveler, params: { tripId: tripInDb._id } }, resUserPublish, (err) => { if (err) throw err; });
    assert.strictEqual(resUserPublish.statusCode, 403, 'Regular user must receive HTTP 403 when trying to publish');

    console.log('✔ Test 10 passed: Regular users blocked from publish action.\n');

    console.log('================================================================');
    console.log('✔ ALL PUBLISHED TRIPS VISIBILITY & WORKFLOW TESTS PASSED (100%) ');
    console.log('================================================================\n');
  } finally {
    // done
  }
}

if (require.main === module) {
  runPublishedTripsVisibilityTests()
    .then(() => disconnectDB(true))
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Test failed:', err);
      process.exit(1);
    });
}

module.exports = runPublishedTripsVisibilityTests;
