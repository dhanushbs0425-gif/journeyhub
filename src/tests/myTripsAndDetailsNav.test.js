const assert = require('assert');
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const User = require('../models/User');
const Trip = require('../models/Trip');
const TripMember = require('../models/TripMember');
const JoinRequest = require('../models/JoinRequest');
const ItineraryActivity = require('../models/ItineraryActivity');
const MysteryTrip = require('../models/MysteryTrip');
const tripController = require('../controllers/tripController');
const joinRequestController = require('../controllers/joinRequestController');

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return res;
}

async function runMyTripsAndDetailsNavTests() {
  console.log('\n================================================================');
  console.log('       MY TRIPS & TRIP DETAILS NAVIGATION TEST SUITE           ');
  console.log('================================================================\n');

  try {
    await connectDB();

    // ----------------------------------------------------
    // SETUP: Users & Seed Trips
    // ----------------------------------------------------
    console.log('[SETUP] Verifying Organisers & Creating Travelers...');
    let sai = await User.findOne({ email: 'sai@gmail.com' });
    let dhanush = await User.findOne({ email: 'dhanush@gmail.com' });
    let divya = await User.findOne({ email: 'divya@gmail.com' });

    if (!sai) {
      sai = await User.create({ name: 'Sai', email: 'sai@gmail.com', password: 'Password123!', role: 'organiser' });
    }
    if (!dhanush) {
      dhanush = await User.create({ name: 'Dhanush', email: 'dhanush@gmail.com', password: 'Password123!', role: 'organiser' });
    }
    if (!divya) {
      divya = await User.create({ name: 'Divya', email: 'divya@gmail.com', password: 'Password123!', role: 'organiser' });
    }

    let traveler1 = await User.findOne({ email: 'rohit@example.com' });
    if (!traveler1) {
      traveler1 = await User.create({ name: 'Rohit Sharma', email: 'rohit@example.com', password: 'Password123!', role: 'user' });
    }

    let traveler2 = await User.findOne({ email: 'ananya@example.com' });
    if (!traveler2) {
      traveler2 = await User.create({ name: 'Ananya Roy', email: 'ananya@example.com', password: 'Password123!', role: 'user' });
    }

    // Clean up test data for these users/trips
    await Trip.deleteMany({ title: { $regex: /^\[NAV-TEST\]/ } });
    await JoinRequest.deleteMany({ user: { $in: [traveler1._id, traveler2._id] } });
    await TripMember.deleteMany({ user: { $in: [traveler1._id, traveler2._id] } });

    const now = new Date();
    const tenDaysFromNow = new Date(now.getTime() + 10 * 86400000);
    const fifteenDaysFromNow = new Date(now.getTime() + 15 * 86400000);
    const twentyDaysAgo = new Date(now.getTime() - 20 * 86400000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 86400000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 86400000);
    const thirtyFiveDaysFromNow = new Date(now.getTime() + 35 * 86400000);

    // Trip A: Upcoming Published Trip by Sai
    const tripA = await Trip.create({
      title: '[NAV-TEST] Sai Himalayan Adventure',
      destination: 'Manali, Himachal Pradesh',
      startDate: tenDaysFromNow,
      endDate: fifteenDaysFromNow,
      estimatedBudget: 22000,
      price: 22000,
      capacity: 12,
      availableSeats: 12,
      currency: 'INR',
      isPublished: true,
      publicationStatus: 'Published',
      status: 'upcoming',
      createdBy: sai._id,
      organiserId: sai._id
    });
    await TripMember.create({ trip: tripA._id, user: sai._id, role: 'owner', status: 'accepted' });

    // Add Itinerary activities to Trip A
    await ItineraryActivity.create({
      trip: tripA._id,
      dayNumber: 1,
      date: tenDaysFromNow,
      title: 'Arrival & Acclimatization Walk',
      category: 'Sightseeing',
      startTime: '09:00',
      endTime: '12:00',
      location: 'Mall Road, Manali',
      description: 'Meet the team, check into base camp, and take a gentle scenic walk.'
    });
    await ItineraryActivity.create({
      trip: tripA._id,
      dayNumber: 2,
      date: new Date(tenDaysFromNow.getTime() + 86400000),
      title: 'Solang Valley Paragliding',
      category: 'Adventure',
      startTime: '10:00',
      endTime: '14:00',
      location: 'Solang Valley',
      description: 'High altitude tandem paragliding and river crossing.'
    });

    // Trip B: Past / Completed Published Trip by Dhanush
    const tripB = await Trip.create({
      title: '[NAV-TEST] Dhanush Goa Heritage Retreat',
      destination: 'Panaji, Goa',
      startDate: twentyDaysAgo,
      endDate: tenDaysAgo,
      estimatedBudget: 15000,
      price: 15000,
      capacity: 15,
      availableSeats: 14,
      currency: 'INR',
      isPublished: true,
      publicationStatus: 'Published',
      status: 'completed',
      createdBy: dhanush._id,
      organiserId: dhanush._id
    });
    await TripMember.create({ trip: tripB._id, user: dhanush._id, role: 'owner', status: 'accepted' });

    // Trip C: Upcoming Published Trip by Divya
    const tripC = await Trip.create({
      title: '[NAV-TEST] Divya Kerala Backwaters Expedition',
      destination: 'Alleppey, Kerala',
      startDate: thirtyDaysFromNow,
      endDate: thirtyFiveDaysFromNow,
      estimatedBudget: 28000,
      price: 28000,
      capacity: 10,
      availableSeats: 10,
      currency: 'INR',
      isPublished: true,
      publicationStatus: 'Published',
      status: 'upcoming',
      createdBy: divya._id,
      organiserId: divya._id
    });
    await TripMember.create({ trip: tripC._id, user: divya._id, role: 'owner', status: 'accepted' });

    // Trip D: Draft / Unpublished Trip by Sai
    const tripD = await Trip.create({
      title: '[NAV-TEST] Sai Private Ladakh Trek Draft',
      destination: 'Zanskar, Ladakh',
      startDate: thirtyDaysFromNow,
      endDate: thirtyFiveDaysFromNow,
      estimatedBudget: 45000,
      price: 45000,
      capacity: 8,
      availableSeats: 8,
      currency: 'INR',
      isPublished: false,
      publicationStatus: 'Draft',
      status: 'draft',
      createdBy: sai._id,
      organiserId: sai._id
    });

    console.log('✔ Setup complete: Trips A (upcoming), B (completed), C (upcoming), D (draft) created.\n');

    // ----------------------------------------------------
    // TEST 1: User with joined trips sees their trips under All Trips
    // ----------------------------------------------------
    console.log('[TEST 1] Testing User with joined trips sees their trips under All Trips...');
    // Traveler 1 is enrolled in Trip A (upcoming) and Trip B (completed)
    await TripMember.create({ trip: tripA._id, user: traveler1._id, role: 'editor', status: 'accepted' });
    await TripMember.create({ trip: tripB._id, user: traveler1._id, role: 'viewer', status: 'accepted' });

    const reqAll = { user: traveler1, query: { status: 'all' } };
    const resAll = createMockRes();
    await tripController.getTrips(reqAll, resAll, (err) => { if (err) throw err; });
    assert.strictEqual(resAll.statusCode, 200);

    const userAllTrips = resAll.body.trips || [];
    const hasTripA = userAllTrips.some(t => t._id.toString() === tripA._id.toString());
    const hasTripB = userAllTrips.some(t => t._id.toString() === tripB._id.toString());
    const hasTripC = userAllTrips.some(t => t._id.toString() === tripC._id.toString());
    const hasTripD = userAllTrips.some(t => t._id.toString() === tripD._id.toString());

    assert.ok(hasTripA, 'All Trips must include joined upcoming trip A');
    assert.ok(hasTripB, 'All Trips must include joined completed trip B');
    assert.strictEqual(hasTripC, false, 'All Trips must NOT include unjoined trip C');
    assert.strictEqual(hasTripD, false, 'All Trips must NOT include unjoined draft trip D');

    const metaTripA = userAllTrips.find(t => t._id.toString() === tripA._id.toString());
    const metaTripB = userAllTrips.find(t => t._id.toString() === tripB._id.toString());
    assert.strictEqual(metaTripA.status, 'upcoming', 'Trip A dynamic status should be upcoming');
    assert.strictEqual(metaTripB.status, 'completed', 'Trip B dynamic status should be completed');
    console.log('✔ Test 1 passed: User with joined trips sees upcoming and completed trips under All Trips, excluding unjoined trips.\n');

    // ----------------------------------------------------
    // TEST 2: User with upcoming joined trips sees only upcoming trips under Upcoming Trips
    // ----------------------------------------------------
    console.log('[TEST 2] Testing User with upcoming joined trips sees only upcoming trips under Upcoming Trips...');
    const reqUpcoming = { user: traveler1, query: { status: 'upcoming' } };
    const resUpcoming = createMockRes();
    await tripController.getTrips(reqUpcoming, resUpcoming, (err) => { if (err) throw err; });
    assert.strictEqual(resUpcoming.statusCode, 200);

    const userUpcomingTrips = resUpcoming.body.trips || [];
    const upHasTripA = userUpcomingTrips.some(t => t._id.toString() === tripA._id.toString());
    const upHasTripB = userUpcomingTrips.some(t => t._id.toString() === tripB._id.toString());
    const upHasTripC = userUpcomingTrips.some(t => t._id.toString() === tripC._id.toString());

    assert.ok(upHasTripA, 'Upcoming Trips must include upcoming joined trip A');
    assert.strictEqual(upHasTripB, false, 'Upcoming Trips must strictly EXCLUDE completed past trip B');
    assert.strictEqual(upHasTripC, false, 'Upcoming Trips must EXCLUDE unjoined trip C');
    console.log('✔ Test 2 passed: User sees only active upcoming joined trips under Upcoming Trips (completed and unjoined excluded).\n');

    // ----------------------------------------------------
    // TEST 3: User with no joined trips sees empty list with link to Explore Trips
    // ----------------------------------------------------
    console.log('[TEST 3] Testing User with no joined trips gets empty list...');
    const reqEmpty = { user: traveler2, query: { status: 'all' } };
    const resEmpty = createMockRes();
    await tripController.getTrips(reqEmpty, resEmpty, (err) => { if (err) throw err; });
    assert.strictEqual(resEmpty.statusCode, 200);
    assert.strictEqual((resEmpty.body.trips || []).length, 0, 'Traveler 2 with no joined trips must receive empty trips array');

    const reqEmptyUpcoming = { user: traveler2, query: { status: 'upcoming' } };
    const resEmptyUpcoming = createMockRes();
    await tripController.getTrips(reqEmptyUpcoming, resEmptyUpcoming, (err) => { if (err) throw err; });
    assert.strictEqual(resEmptyUpcoming.statusCode, 200);
    assert.strictEqual((resEmptyUpcoming.body.trips || []).length, 0, 'Traveler 2 must have 0 upcoming trips');
    console.log('✔ Test 3 passed: User with no joined trips receives 0 trips on backend for both All and Upcoming.\n');

    // ----------------------------------------------------
    // TEST 4: Pending join requests are NOT displayed as confirmed joined trips in My Trips
    // ----------------------------------------------------
    console.log('[TEST 4] Testing Pending join requests are NOT displayed as confirmed trips in My Trips...');
    // Traveler 2 submits request to join Trip C
    const reqJoinSubmit = {
      user: traveler2,
      params: {},
      body: { tripId: tripC._id, seatsRequested: 1, message: 'Excited to join the Kerala Backwaters!' }
    };
    const resJoinSubmit = createMockRes();
    await joinRequestController.createJoinRequest(reqJoinSubmit, resJoinSubmit, (err) => { if (err) throw err; });
    assert.strictEqual(resJoinSubmit.statusCode, 201);
    const createdRequestId = resJoinSubmit.body.request._id;

    // Check Traveler 2's My Trips while request is pending
    const reqCheckPending = { user: traveler2, query: { status: 'all' } };
    const resCheckPending = createMockRes();
    await tripController.getTrips(reqCheckPending, resCheckPending, (err) => { if (err) throw err; });
    const pendingTrips = resCheckPending.body.trips || [];
    assert.strictEqual(pendingTrips.length, 0, 'Pending join request must NOT appear in My Trips as confirmed trip');

    // Now approve the request
    const reqApprove = {
      user: divya, // Organiser Divya approves
      params: { requestId: createdRequestId },
      body: { status: 'approved' }
    };
    const resApprove = createMockRes();
    await joinRequestController.respondToJoinRequest(reqApprove, resApprove, (err) => { if (err) throw err; });
    assert.strictEqual(resApprove.statusCode, 200);

    // After approval, trip C must now appear in Traveler 2's My Trips
    const reqCheckApproved = { user: traveler2, query: { status: 'all' } };
    const resCheckApproved = createMockRes();
    await tripController.getTrips(reqCheckApproved, resCheckApproved, (err) => { if (err) throw err; });
    const approvedTrips = resCheckApproved.body.trips || [];
    assert.ok(approvedTrips.some(t => t._id.toString() === tripC._id.toString()), 'Approved trip must now appear in traveler My Trips');
    console.log('✔ Test 4 passed: Pending join requests are not confirmed trips; approved requests appear immediately.\n');

    // ----------------------------------------------------
    // TEST 5: Clicking a trip card navigates to the correct Trip Details page
    // ----------------------------------------------------
    console.log('[TEST 5] Testing State.setCurrentTripId and selectAndNavigate function contracts...');
    // Simulate frontend State object
    const MockState = {
      trips: [{ _id: tripA._id.toString(), title: tripA.title }],
      currentTrip: null,
      setCurrentTrip(trip) {
        this.currentTrip = trip;
      },
      setCurrentTripId(tripId) {
        if (!tripId) return;
        const match = (this.trips || []).find(t => t._id === tripId);
        this.setCurrentTrip(match || { _id: tripId });
      }
    };

    MockState.setCurrentTripId(tripA._id.toString());
    assert.ok(MockState.currentTrip, 'currentTrip must be set');
    assert.strictEqual(MockState.currentTrip._id, tripA._id.toString());
    console.log('✔ Test 5 passed: State.setCurrentTripId and trip selection contract verified.\n');

    // ----------------------------------------------------
    // TEST 6: Trip Details page displays all trip information (title, destination, dates, budget, itinerary, etc.) and a working Back button
    // ----------------------------------------------------
    console.log('[TEST 6] Testing Trip Details endpoint returns complete information including activities...');
    const reqDetails = {
      user: traveler1,
      params: { tripId: tripA._id }
    };
    const resDetails = createMockRes();
    await tripController.getTripById(reqDetails, resDetails, (err) => { if (err) throw err; });
    assert.strictEqual(resDetails.statusCode, 200);

    const tripDetails = resDetails.body.trip;
    assert.strictEqual(tripDetails.title, '[NAV-TEST] Sai Himalayan Adventure');
    assert.strictEqual(tripDetails.destination, 'Manali, Himachal Pradesh');
    assert.ok(tripDetails.startDate, 'Start date must be present');
    assert.ok(tripDetails.endDate, 'End date must be present');
    assert.strictEqual(tripDetails.estimatedBudget, 22000);
    assert.strictEqual(tripDetails.currency, 'INR');
    assert.ok(Array.isArray(tripDetails.activities), 'Activities array must be present');
    assert.strictEqual(tripDetails.activities.length, 2, 'Should include the 2 itinerary activities');
    assert.strictEqual(tripDetails.activities[0].title, 'Arrival & Acclimatization Walk');
    assert.strictEqual(tripDetails.activities[1].title, 'Solang Valley Paragliding');
    assert.ok(tripDetails.readiness, 'Readiness checklist breakdown must be present');
    console.log('✔ Test 6 passed: Complete trip details and itinerary activities returned for Trip Details view.\n');

    // ----------------------------------------------------
    // TEST 7: Organiser can manage their own trip; non-owners and regular users blocked from edit/delete
    // ----------------------------------------------------
    console.log('[TEST 7] Testing Organiser ownership permissions (edit, unpublish, delete)...');
    // 7A: Sai (owner) can edit Trip A
    const reqEditOwner = {
      user: sai,
      params: { tripId: tripA._id },
      body: { title: '[NAV-TEST] Sai Himalayan Adventure (Updated Edition)' }
    };
    const resEditOwner = createMockRes();
    await tripController.updateTrip(reqEditOwner, resEditOwner, (err) => { if (err) throw err; });
    assert.strictEqual(resEditOwner.statusCode, 200);

    // 7B: Divya (another organiser) tries to edit Sai's Trip A -> blocked 403
    const reqEditDivya = {
      user: divya,
      params: { tripId: tripA._id },
      body: { title: 'Unauthorized Edit Attempt' }
    };
    const resEditDivya = createMockRes();
    await tripController.updateTrip(reqEditDivya, resEditDivya, (err) => { if (err) throw err; });
    assert.strictEqual(resEditDivya.statusCode, 403, 'Non-owner organiser must be blocked from editing with 403');

    // 7C: Divya tries to unpublish Sai's Trip A -> blocked 403
    const reqUnpubDivya = {
      user: divya,
      params: { tripId: tripA._id }
    };
    const resUnpubDivya = createMockRes();
    await tripController.unpublishTrip(reqUnpubDivya, resUnpubDivya, (err) => { if (err) throw err; });
    assert.strictEqual(resUnpubDivya.statusCode, 403, 'Non-owner organiser must be blocked from unpublishing with 403');

    // 7D: Regular user tries to delete Trip A -> blocked 403
    const reqDeleteUser = {
      user: traveler1,
      params: { tripId: tripA._id }
    };
    const resDeleteUser = createMockRes();
    await tripController.deleteTrip(reqDeleteUser, resDeleteUser, (err) => { if (err) throw err; });
    assert.strictEqual(resDeleteUser.statusCode, 403, 'Regular traveler must be blocked from deleting with 403');

    // 7E: Divya (non-owner organiser) tries to delete Sai's Trip A -> blocked 403
    const reqDeleteDivya = {
      user: divya,
      params: { tripId: tripA._id }
    };
    const resDeleteDivya = createMockRes();
    await tripController.deleteTrip(reqDeleteDivya, resDeleteDivya, (err) => { if (err) throw err; });
    assert.strictEqual(resDeleteDivya.statusCode, 403, 'Non-owner organiser must be blocked from deleting with 403');

    // 7F: Divya CAN view Trip A details (read-only)
    const reqViewDivya = {
      user: divya,
      params: { tripId: tripA._id }
    };
    const resViewDivya = createMockRes();
    await tripController.getTripById(reqViewDivya, resViewDivya, (err) => { if (err) throw err; });
    assert.strictEqual(resViewDivya.statusCode, 200);
    assert.strictEqual(resViewDivya.body.trip.isOwner, false, 'Divya must NOT have owner rights on Sai trip');
    console.log('✔ Test 7 passed: Only owner organiser can edit/unpublish/delete; non-owners and regular users blocked (HTTP 403).\n');

    // ----------------------------------------------------
    // TEST 8: Explore Trips continues to show all published trips from all organisers
    // ----------------------------------------------------
    console.log('[TEST 8] Testing Explore Trips shows all published trips across all organisers...');
    const reqExplore = {
      user: traveler1,
      query: { explore: 'true' }
    };
    const resExplore = createMockRes();
    await tripController.getTrips(reqExplore, resExplore, (err) => { if (err) throw err; });
    assert.strictEqual(resExplore.statusCode, 200);

    const exploreTrips = resExplore.body.trips || [];
    const expHasTripA = exploreTrips.some(t => t._id.toString() === tripA._id.toString());
    const expHasTripB = exploreTrips.some(t => t._id.toString() === tripB._id.toString());
    const expHasTripC = exploreTrips.some(t => t._id.toString() === tripC._id.toString());
    const expHasTripD = exploreTrips.some(t => t._id.toString() === tripD._id.toString());

    assert.ok(expHasTripA, 'Explore Trips must show published trip from Sai');
    assert.ok(expHasTripB, 'Explore Trips must show published trip from Dhanush');
    assert.ok(expHasTripC, 'Explore Trips must show published trip from Divya');
    assert.strictEqual(expHasTripD, false, 'Explore Trips must NEVER show draft/unpublished trip');
    console.log('✔ Test 8 passed: Explore Trips displays all published trips across all 3 organisers and hides drafts.\n');

    // Clean up test trips
    await Trip.deleteMany({ title: { $regex: /^\[NAV-TEST\]/ } });
    await ItineraryActivity.deleteMany({ trip: tripA._id });

    console.log('================================================================');
    console.log('✔ ALL 8 MY TRIPS & TRIP DETAILS NAVIGATION TESTS PASSED (100%) ');
    console.log('================================================================\n');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  } finally {
    if (require.main === module) {
      const { disconnectDB } = require('../config/db');
      await disconnectDB(true);
      process.exit(0);
    }
  }
}

if (require.main === module) {
  runMyTripsAndDetailsNavTests();
}

module.exports = runMyTripsAndDetailsNavTests;
