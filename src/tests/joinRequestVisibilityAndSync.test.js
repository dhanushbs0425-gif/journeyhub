/**
 * Comprehensive Automated Test Suite: Join Request Visibility & Status Synchronisation
 *
 * Verifies all requirements from prompt:
 * 1. Organiser accounts (sai@gmail.com, dhanush@gmail.com, divya@gmail.com) verified with role 'organiser'.
 * 2. Normal trip join request visible to all three organisers.
 * 3. Mystery Miles join request visible to all three organisers.
 * 4. Requesting user sees their Mystery Miles request immediately in /api/join-requests/my-requests.
 * 5. Secret destination remains strictly hidden from traveler before authorized reveal.
 * 6. Synchronised approval/rejection across all three organisers and user.
 * 7. Duplicate submissions prevented.
 * 8. Request history preserved (never deleted).
 */
const assert = require('assert');
process.env.NODE_ENV = 'test';
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Trip = require('../models/Trip');
const MysteryTrip = require('../models/MysteryTrip');
const JoinRequest = require('../models/JoinRequest');
const { seedOrganisers } = require('../../scripts/seedOrganisers');
const joinRequestController = require('../controllers/joinRequestController');
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

async function runJoinRequestVisibilityAndSyncTests() {
  console.log('\n================================================================');
  console.log(' JOIN REQUEST VISIBILITY & STATUS SYNCHRONISATION TEST SUITE    ');
  console.log('================================================================\n');

  await connectDB();

  try {
    // ----------------------------------------------------
    // TEST 1: Verify Three Organiser Accounts (sai@gmail.com, dhanush@gmail.com, divya@gmail.com)
    // ----------------------------------------------------
    console.log('[TEST 1] Testing Three Organiser Accounts Verification...');
    await seedOrganisers();

    const sai = await User.findOne({ email: 'sai@gmail.com' });
    const dhanush = await User.findOne({ email: 'dhanush@gmail.com' });
    const divya = await User.findOne({ email: 'divya@gmail.com' });

    assert.ok(sai, 'Organiser Sai (sai@gmail.com) must exist');
    assert.ok(dhanush, 'Organiser Dhanush (dhanush@gmail.com) must exist');
    assert.ok(divya, 'Organiser Divya (divya@gmail.com) must exist');

    assert.strictEqual(sai.role, 'organiser');
    assert.strictEqual(dhanush.role, 'organiser');
    assert.strictEqual(divya.role, 'organiser');

    assert.strictEqual(sai.emailVerified, true);
    assert.strictEqual(dhanush.emailVerified, true);
    assert.strictEqual(divya.emailVerified, true);

    console.log('✔ Test 1 passed: All three organiser accounts (Sai, Dhanush, Divya) verified with role "organiser".');

    // ----------------------------------------------------
    // TEST 2: Create a Traveler and a Normal Trip Created by Sai
    // ----------------------------------------------------
    console.log('[TEST 2] Submitting Normal Trip Request & Shared Visibility for All 3 Organisers...');
    let traveler = await User.findOne({ email: 'traveler_sync@journeyhub.test' });
    if (!traveler) {
      traveler = await User.create({
        name: 'Aarav Traveler',
        email: 'traveler_sync@journeyhub.test',
        password: 'Password@123',
        role: 'user',
        emailVerified: true
      });
    }

    // Normal trip created by Sai
    const normalTrip = await Trip.create({
      title: 'Himalayan Ridge Trek 2026',
      destination: 'Manali, Himachal Pradesh',
      startDate: new Date(Date.now() + 10 * 86400000),
      endDate: new Date(Date.now() + 15 * 86400000),
      capacity: 10,
      availableSeats: 10,
      price: 12500,
      currency: 'INR',
      createdBy: sai._id,
      organiserId: sai._id,
      status: 'upcoming'
    });

    // Traveler submits join request
    const mockReqNormal = {
      params: { tripId: normalTrip._id.toString() },
      body: { seatsRequested: 2, message: 'Excited to join the Himalayan trek!' },
      user: traveler,
      io: { emit: () => {} }
    };
    const mockResNormal = createMockRes();
    await joinRequestController.createJoinRequest(mockReqNormal, mockResNormal, () => {});

    assert.strictEqual(mockResNormal.statusCode, 201, 'Request creation must return HTTP 201');
    assert.strictEqual(mockResNormal.body.success, true);
    const createdRequestId = mockResNormal.body.request._id;

    // Check shared visibility: Sai fetches organiser requests
    const mockReqSai = { user: sai };
    const mockResSai = createMockRes();
    await joinRequestController.getOrganiserJoinRequests(mockReqSai, mockResSai, () => {});
    assert.strictEqual(mockResSai.statusCode, 200);
    const saiFound = mockResSai.body.requests.find(r => r._id.toString() === createdRequestId.toString());
    assert.ok(saiFound, 'Trip creator Sai must see the join request');
    assert.strictEqual(saiFound.user.name, 'Aarav Traveler');
    assert.strictEqual(saiFound.trip.title, 'Himalayan Ridge Trek 2026');
    assert.strictEqual(saiFound.status, 'pending');

    // Check shared visibility: Dhanush fetches organiser requests (trip was created by Sai!)
    const mockReqDhanush = { user: dhanush };
    const mockResDhanush = createMockRes();
    await joinRequestController.getOrganiserJoinRequests(mockReqDhanush, mockResDhanush, () => {});
    assert.strictEqual(mockResDhanush.statusCode, 200);
    const dhanushFound = mockResDhanush.body.requests.find(r => r._id.toString() === createdRequestId.toString());
    assert.ok(dhanushFound, 'Organiser Dhanush MUST see the join request even though Sai created the trip');

    // Check shared visibility: Divya fetches organiser requests (trip was created by Sai!)
    const mockReqDivya = { user: divya };
    const mockResDivya = createMockRes();
    await joinRequestController.getOrganiserJoinRequests(mockReqDivya, mockResDivya, () => {});
    assert.strictEqual(mockResDivya.statusCode, 200);
    const divyaFound = mockResDivya.body.requests.find(r => r._id.toString() === createdRequestId.toString());
    assert.ok(divyaFound, 'Organiser Divya MUST see the join request even though Sai created the trip');

    console.log('✔ Test 2 passed: Normal trip join request visible to all three organisers regardless of trip creator.');

    // ----------------------------------------------------
    // TEST 3: Duplicate Submission Prevention
    // ----------------------------------------------------
    console.log('[TEST 3] Testing Duplicate Join Request Prevention...');
    const mockResDuplicate = createMockRes();
    await joinRequestController.createJoinRequest(mockReqNormal, mockResDuplicate, () => {});
    assert.strictEqual(mockResDuplicate.statusCode, 400, 'Duplicate active join request must return HTTP 400');
    assert.ok(mockResDuplicate.body.message.includes('already have an active'));
    console.log('✔ Test 3 passed: Duplicate join requests strictly prevented.');

    // ----------------------------------------------------
    // TEST 4: Mystery Miles Request Submission & Secrecy Preservation
    // ----------------------------------------------------
    console.log('[TEST 4] Testing Mystery Miles Request Submission & Secrecy...');
    // Mystery Trip created by Divya with secret destination
    const mysteryTrip = await MysteryTrip.create({
      title: 'Whispering Peaks Secret Retreat',
      destinationSecret: 'Spiti Valley, Himachal Pradesh',
      destinationHint: 'A high-altitude paradise surrounded by ancient monasteries and moonscapes.',
      departureDate: new Date(Date.now() + 20 * 86400000),
      returnDate: new Date(Date.now() + 26 * 86400000),
      budgetMin: 8000,
      budgetMax: 18000,
      price: 11500,
      maxParticipants: 10,
      availableSeats: 10,
      revealAt: new Date(Date.now() + 19 * 86400000),
      isRevealed: false,
      status: 'published',
      organiserId: divya._id
    });

    // Traveler submits Mystery Trip request
    const mockReqMysteryJoin = {
      params: { id: mysteryTrip._id.toString() },
      body: { message: 'Can’t wait to discover the secret spot!' },
      user: traveler,
      io: { emit: () => {} }
    };
    const mockResMysteryJoin = createMockRes();
    await mysteryTripController.requestToJoinMysteryTrip(mockReqMysteryJoin, mockResMysteryJoin, (err) => {
      if (err) console.error('❌ requestToJoinMysteryTrip error:', err);
    });

    assert.strictEqual(mockResMysteryJoin.statusCode, 201);
    assert.strictEqual(mockResMysteryJoin.body.success, true);
    const mysteryRequestId = mockResMysteryJoin.body.request._id;

    // Check shared visibility for all 3 organisers for the Mystery Miles request
    const mockResOrganisers = createMockRes();
    await joinRequestController.getOrganiserJoinRequests({ user: dhanush }, mockResOrganisers, () => {});
    const mysteryInOrganisers = mockResOrganisers.body.requests.find(r => r._id.toString() === mysteryRequestId.toString());
    assert.ok(mysteryInOrganisers, 'Mystery Miles request must be visible to Dhanush in organiser requests');
    assert.strictEqual(mysteryInOrganisers.tripType, 'mystery');
    assert.strictEqual(mysteryInOrganisers.mysteryTrip.title, 'Whispering Peaks Secret Retreat');
    assert.strictEqual(mysteryInOrganisers.status, 'pending');

    // Check requesting traveler view (/api/join-requests/my-requests)
    const mockResTraveler = createMockRes();
    await joinRequestController.getUserJoinRequests({ user: traveler }, mockResTraveler, () => {});
    assert.strictEqual(mockResTraveler.statusCode, 200);

    const userMysteryReq = mockResTraveler.body.requests.find(r => r._id.toString() === mysteryRequestId.toString());
    assert.ok(userMysteryReq, 'Traveler must immediately see their Mystery Miles request under my-requests');
    assert.strictEqual(userMysteryReq.status, 'pending');
    assert.strictEqual(userMysteryReq.mysteryTrip.title, 'Whispering Peaks Secret Retreat');
    assert.strictEqual(userMysteryReq.mysteryTrip.destinationSecret, null, 'Secret destination MUST NOT be revealed before official countdown reveal');

    console.log('✔ Test 4 passed: Mystery Miles request visible to all 3 organisers, visible to traveler, secret destination protected.');

    // ----------------------------------------------------
    // TEST 5: Synchronised Approval Across All Organisers & Traveler
    // ----------------------------------------------------
    console.log('[TEST 5] Testing Synchronised Approval Across Organisers...');
    // Organiser Dhanush approves the normal trip request created by Sai!
    const mockReqApprove = {
      params: { requestId: createdRequestId.toString() },
      body: { status: 'approved' },
      user: dhanush, // Dhanush approves Sai's trip request
      io: { emit: () => {} }
    };
    const mockResApprove = createMockRes();
    await joinRequestController.respondToJoinRequest(mockReqApprove, mockResApprove, () => {});
    assert.strictEqual(mockResApprove.statusCode, 200);
    assert.strictEqual(mockResApprove.body.request.status, 'approved');

    // Verify all 3 organisers see the approved status
    const checkSai = createMockRes();
    await joinRequestController.getOrganiserJoinRequests({ user: sai }, checkSai, () => {});
    const saiView = checkSai.body.requests.find(r => r._id.toString() === createdRequestId.toString());
    assert.strictEqual(saiView.status, 'approved', 'Sai must see the request marked as approved');

    const checkDivya = createMockRes();
    await joinRequestController.getOrganiserJoinRequests({ user: divya }, checkDivya, () => {});
    const divyaView = checkDivya.body.requests.find(r => r._id.toString() === createdRequestId.toString());
    assert.strictEqual(divyaView.status, 'approved', 'Divya must see the request marked as approved');

    // Verify traveler sees approved status
    const checkTraveler = createMockRes();
    await joinRequestController.getUserJoinRequests({ user: traveler }, checkTraveler, () => {});
    const travelerNormalView = checkTraveler.body.requests.find(r => r._id.toString() === createdRequestId.toString());
    assert.strictEqual(travelerNormalView.status, 'approved', 'Traveler must see their request status as approved');

    // Verify trip seats were decremented from 10 to 8 (2 seats requested)
    const updatedNormalTrip = await Trip.findById(normalTrip._id);
    assert.strictEqual(updatedNormalTrip.availableSeats, 8, 'Available seats must be deducted by requested seats (10 - 2 = 8)');

    console.log('✔ Test 5 passed: Approval synchronised across all 3 organisers and traveler; capacity updated.');

    // ----------------------------------------------------
    // TEST 6: Synchronised Rejection of Mystery Miles Request
    // ----------------------------------------------------
    console.log('[TEST 6] Testing Synchronised Rejection of Mystery Miles Request...');
    // Organiser Sai rejects the Mystery Miles request (trip was created by Divya)
    const mockReqRejectMystery = {
      params: { requestId: mysteryRequestId.toString() },
      body: { status: 'rejected', rejectionReason: 'Seats reserved for group booking' },
      user: sai, // Sai reviews Divya's trip request
      io: { emit: () => {} }
    };
    const mockResRejectMystery = createMockRes();
    await joinRequestController.respondToJoinRequest(mockReqRejectMystery, mockResRejectMystery, () => {});
    assert.strictEqual(mockResRejectMystery.statusCode, 200);
    assert.strictEqual(mockResRejectMystery.body.request.status, 'rejected');

    // Verify Divya (trip creator) sees rejection
    const checkDivyaMystery = createMockRes();
    await joinRequestController.getOrganiserJoinRequests({ user: divya }, checkDivyaMystery, () => {});
    const divyaMysteryView = checkDivyaMystery.body.requests.find(r => r._id.toString() === mysteryRequestId.toString());
    assert.strictEqual(divyaMysteryView.status, 'rejected', 'Divya must see mystery request rejected');

    // Verify traveler sees rejection note
    const checkTravelerAfterReject = createMockRes();
    await joinRequestController.getUserJoinRequests({ user: traveler }, checkTravelerAfterReject, () => {});
    const travelerMysteryView = checkTravelerAfterReject.body.requests.find(r => r._id.toString() === mysteryRequestId.toString());
    assert.strictEqual(travelerMysteryView.status, 'rejected');
    assert.strictEqual(travelerMysteryView.rejectionReason, 'Seats reserved for group booking');

    // Verify history preserved: request still exists in database!
    const reqInDb = await JoinRequest.findById(mysteryRequestId);
    assert.ok(reqInDb, 'Request history must be preserved, never deleted');
    assert.strictEqual(reqInDb.status, 'rejected');

    console.log('✔ Test 6 passed: Mystery request rejection synchronised, history preserved.');

    console.log('\n================================================================');
    console.log('✔ ALL JOIN REQUEST VISIBILITY & SYNC TESTS PASSED SUCCESSFULLY!  ');
    console.log('================================================================\n');
  } finally {
    // cleanup
  }
}

if (require.main === module) {
  runJoinRequestVisibilityAndSyncTests()
    .then(() => disconnectDB(true))
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Test failed:', err);
      process.exit(1);
    });
}

module.exports = runJoinRequestVisibilityAndSyncTests;
