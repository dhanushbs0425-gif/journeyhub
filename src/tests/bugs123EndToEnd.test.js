/**
 * End-to-End Test Suite for Bug 1, Bug 2, and Bug 3
 * 
 * Verifies:
 * - Bug 1: User join requests reach the correct organiser, save to MongoDB, and duplicate requests are handled.
 * - Bug 2: Organiser actions work (Accept, Reject, Delete, Clear All), with proper error handling and organiser isolation.
 * - Bug 3: Published trips appear on the user side, drafts remain hidden, and publish/unpublish toggles visibility.
 */
const assert = require('assert');
process.env.NODE_ENV = 'test';
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Trip = require('../models/Trip');
const MysteryTrip = require('../models/MysteryTrip');
const JoinRequest = require('../models/JoinRequest');
const TripMember = require('../models/TripMember');
const Notification = require('../models/Notification');
const { seedOrganisers } = require('../../scripts/seedOrganisers');
const joinRequestController = require('../controllers/joinRequestController');
const tripController = require('../controllers/tripController');

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

async function runBugs123Tests() {
  console.log('\n================================================================');
  console.log('      BUG 1, 2, AND 3 COMPREHENSIVE END-TO-END VERIFICATION    ');
  console.log('================================================================\n');

  await connectDB();

  try {
    // ----------------------------------------------------
    // SETUP: Predefined Organisers & Test Travelers
    // ----------------------------------------------------
    console.log('[SETUP] Verifying Organisers & Test Users in MongoDB...');
    await seedOrganisers();

    const dhanush = await User.findOne({ email: 'dhanush@gmail.com' });
    const sai = await User.findOne({ email: 'sai@gmail.com' });
    const divya = await User.findOne({ email: 'divya@gmail.com' });

    assert.ok(dhanush, 'Organiser Dhanush must exist');
    assert.ok(sai, 'Organiser Sai must exist');
    assert.ok(divya, 'Organiser Divya must exist');

    let traveler1 = await User.findOne({ email: 'traveler_b1@journeyhub.test' });
    if (!traveler1) {
      traveler1 = await User.create({
        name: 'Rohan Sharma',
        email: 'traveler_b1@journeyhub.test',
        password: 'Password@123',
        role: 'user',
        emailVerified: true
      });
    }

    let traveler2 = await User.findOne({ email: 'traveler_b2@journeyhub.test' });
    if (!traveler2) {
      traveler2 = await User.create({
        name: 'Ananya Sen',
        email: 'traveler_b2@journeyhub.test',
        password: 'Password@123',
        role: 'user',
        emailVerified: true
      });
    }

    console.log('✔ Setup complete: Organisers Dhanush, Sai, Divya & Travelers ready.\n');

    // ----------------------------------------------------
    // BUG 3: Published Trips Appear on User Side
    // ----------------------------------------------------
    console.log('--- TESTING BUG 3: PUBLISHED TRIPS ON USER SIDE ---');

    // 1. Organiser Dhanush creates and publishes a new expedition
    const createReq = {
      body: {
        title: 'Goa Coastal Heritage & Spice Route',
        destination: 'Panaji, Goa',
        startDate: new Date(Date.now() + 14 * 86400000),
        endDate: new Date(Date.now() + 19 * 86400000),
        capacity: 12,
        price: 16500,
        currency: 'INR',
        description: 'Explore the Portuguese heritage and pristine beaches of South Goa.',
        isPublished: true,
        publicationStatus: 'Published'
      },
      user: dhanush,
      io: { emit: () => {} }
    };
    const createRes = createMockRes();
    await tripController.createTrip(createReq, createRes, () => {});

    assert.strictEqual(createRes.statusCode, 201, 'Trip creation must return 201');
    assert.strictEqual(createRes.body.success, true);
    const createdTrip = createRes.body.trip;
    assert.ok(createdTrip._id, 'Created trip must have an _id');
    assert.strictEqual(createdTrip.isPublished, true);
    assert.strictEqual(createdTrip.publicationStatus, 'Published');
    assert.strictEqual(createdTrip.status, 'upcoming');
    assert.strictEqual(createdTrip.capacity, 12);
    assert.strictEqual(createdTrip.availableSeats, 12);

    console.log('✔ Bug 3.1 passed: Trip created in MongoDB with Published status and capacity.');

    // 2. Regular user searches trips on Explore Trips (explore=true)
    const exploreReq = {
      query: { explore: 'true' },
      user: traveler1
    };
    const exploreRes = createMockRes();
    await tripController.getTrips(exploreReq, exploreRes, () => {});

    assert.strictEqual(exploreRes.statusCode, 200);
    const foundTrip = exploreRes.body.trips.find(t => t._id.toString() === createdTrip._id.toString());
    assert.ok(foundTrip, 'Created trip MUST appear on public Explore Trips for regular users');
    assert.strictEqual(foundTrip.title, 'Goa Coastal Heritage & Spice Route');
    assert.strictEqual(foundTrip.availableSeats, 12);

    console.log('✔ Bug 3.2 passed: Published trip appears immediately on user Explore Trips.');

    // 3. Organiser unpublishes trip -> moves to Draft -> hidden from explore
    const unpublishReq = {
      params: { tripId: createdTrip._id.toString() },
      user: dhanush,
      io: { emit: () => {} }
    };
    const unpublishRes = createMockRes();
    await tripController.unpublishTrip(unpublishReq, unpublishRes, () => {});
    assert.strictEqual(unpublishRes.statusCode, 200);

    const exploreAfterUnpublishRes = createMockRes();
    await tripController.getTrips(exploreReq, exploreAfterUnpublishRes, () => {});
    const hiddenTrip = exploreAfterUnpublishRes.body.trips.find(t => t._id.toString() === createdTrip._id.toString());
    assert.strictEqual(hiddenTrip, undefined, 'Unpublished trip MUST NOT appear on Explore Trips');

    // Re-publish the trip for subsequent join request tests
    const publishReq = {
      params: { tripId: createdTrip._id.toString() },
      user: dhanush,
      io: { emit: () => {} }
    };
    const publishRes = createMockRes();
    await tripController.publishTrip(publishReq, publishRes, () => {});
    assert.strictEqual(publishRes.statusCode, 200);

    console.log('✔ Bug 3.3 passed: Publish and unpublish toggle visibility cleanly.\n');

    // ----------------------------------------------------
    // BUG 1: User Join Requests Reach Organiser & Save in DB
    // ----------------------------------------------------
    console.log('--- TESTING BUG 1: USER JOIN REQUESTS REACH ORGANISER ---');

    // 1. Traveler Rohan submits join request
    const joinReq1 = {
      params: { tripId: createdTrip._id.toString() },
      body: { seatsRequested: 2, message: 'Looking forward to the Goa expedition!' },
      user: traveler1,
      io: { emit: () => {} }
    };
    const joinRes1 = createMockRes();
    await joinRequestController.createJoinRequest(joinReq1, joinRes1, () => {});

    assert.strictEqual(joinRes1.statusCode, 201, 'Join request submission must return 201');
    assert.strictEqual(joinRes1.body.success, true);
    const savedRequest1 = joinRes1.body.request;
    assert.ok(savedRequest1._id, 'Join request must be saved with an _id');
    assert.strictEqual(savedRequest1.status, 'pending');
    assert.strictEqual(savedRequest1.seatsRequested, 2);

    // Verify saved in MongoDB
    const reqInDb = await JoinRequest.findById(savedRequest1._id);
    assert.ok(reqInDb, 'Join request must exist in MongoDB collection joinrequests');
    assert.strictEqual(reqInDb.user.toString(), traveler1._id.toString());
    assert.strictEqual(reqInDb.organiser.toString(), dhanush._id.toString());
    assert.strictEqual(reqInDb.status, 'pending');

    console.log('✔ Bug 1.1 passed: Join request saved in MongoDB with user, trip, and organiser IDs.');

    // 2. Duplicate request prevention
    const duplicateRes = createMockRes();
    await joinRequestController.createJoinRequest(joinReq1, duplicateRes, () => {});
    assert.strictEqual(duplicateRes.statusCode, 400, 'Duplicate active join request must be rejected with 400');
    assert.ok(duplicateRes.body.message.includes('already have an active'));

    console.log('✔ Bug 1.2 passed: Duplicate active join requests strictly rejected.');

    // 3. Organiser Dhanush fetches requests -> sees Rohan's request
    const orgReqsRes = createMockRes();
    await joinRequestController.getOrganiserJoinRequests({ user: dhanush }, orgReqsRes, () => {});
    assert.strictEqual(orgReqsRes.statusCode, 200);
    const orgFound = orgReqsRes.body.requests.find(r => r._id.toString() === savedRequest1._id.toString());
    assert.ok(orgFound, 'Trip organiser Dhanush MUST see the join request in their portal');
    assert.strictEqual(orgFound.user.name, 'Rohan Sharma');
    assert.strictEqual(orgFound.status, 'pending');
    assert.strictEqual(orgFound.seatsRequested, 2);

    console.log('✔ Bug 1.3 passed: Request reaches organiser portal with accurate counters & details.\n');

    // ----------------------------------------------------
    // BUG 2: Organiser Join Request Actions (Accept, Reject, Delete, Clear All)
    // ----------------------------------------------------
    console.log('--- TESTING BUG 2: ORGANISER JOIN REQUEST ACTIONS ---');

    // 1. Organiser Dhanush accepts Rohan's request
    const acceptReq = {
      params: { requestId: savedRequest1._id.toString() },
      body: { status: 'approved' },
      user: dhanush,
      io: { emit: () => {} }
    };
    const acceptRes = createMockRes();
    await joinRequestController.respondToJoinRequest(acceptReq, acceptRes, () => {});

    assert.strictEqual(acceptRes.statusCode, 200, 'Accepting request must return 200');
    assert.strictEqual(acceptRes.body.success, true);
    assert.strictEqual(acceptRes.body.request.status, 'approved');

    // Verify seats decremented in MongoDB (12 - 2 = 10)
    const tripAfterAccept = await Trip.findById(createdTrip._id);
    assert.strictEqual(tripAfterAccept.availableSeats, 10, 'Trip available seats must decrement to 10');

    // Verify TripMember created
    const memberDoc = await TripMember.findOne({ trip: createdTrip._id, user: traveler1._id });
    assert.ok(memberDoc, 'Traveler must be added to tripmembers collection');
    assert.strictEqual(memberDoc.status, 'accepted');

    console.log('✔ Bug 2.1 passed: Accept updates status, decrements seats (12 -> 10), and adds trip member.');

    // 2. Traveler 2 submits request for the same trip
    const joinReq2 = {
      params: { tripId: createdTrip._id.toString() },
      body: { seatsRequested: 1, message: 'Solo traveler wanting to join.' },
      user: traveler2,
      io: { emit: () => {} }
    };
    const joinRes2 = createMockRes();
    await joinRequestController.createJoinRequest(joinReq2, joinRes2, () => {});
    assert.strictEqual(joinRes2.statusCode, 201);
    const savedRequest2 = joinRes2.body.request;

    // Organiser Dhanush rejects Traveler 2's request with reason
    const rejectReq = {
      params: { requestId: savedRequest2._id.toString() },
      body: { status: 'rejected', rejectionReason: 'Trip requires intermediate group experience.' },
      user: dhanush,
      io: { emit: () => {} }
    };
    const rejectRes = createMockRes();
    await joinRequestController.respondToJoinRequest(rejectReq, rejectRes, () => {});
    assert.strictEqual(rejectRes.statusCode, 200);
    assert.strictEqual(rejectRes.body.request.status, 'rejected');

    const req2InDb = await JoinRequest.findById(savedRequest2._id);
    assert.strictEqual(req2InDb.status, 'rejected');
    assert.strictEqual(req2InDb.rejectionReason, 'Trip requires intermediate group experience.');

    console.log('✔ Bug 2.2 passed: Reject updates status to rejected and stores rejection reason.');

    // 3. Organiser deletes single join request (Delete action)
    const deleteReq = {
      params: { requestId: savedRequest2._id.toString() },
      user: dhanush,
      io: { emit: () => {} }
    };
    const deleteRes = createMockRes();
    await joinRequestController.deleteJoinRequest(deleteReq, deleteRes, () => {});
    assert.strictEqual(deleteRes.statusCode, 200);
    assert.strictEqual(deleteRes.body.success, true);

    const deletedFromDb = await JoinRequest.findById(savedRequest2._id);
    assert.strictEqual(deletedFromDb, null, 'Deleted request must be permanently removed from MongoDB');

    console.log('✔ Bug 2.3 passed: Organiser Delete removes request from MongoDB cleanly.');

    // 4. Organiser Isolation Check: Sai creates a trip and receives a request.
    const saiTrip = await Trip.create({
      title: 'Kashmir Great Lakes Alpine Trek',
      destination: 'Sonamarg, Jammu & Kashmir',
      startDate: new Date(Date.now() + 25 * 86400000),
      endDate: new Date(Date.now() + 32 * 86400000),
      capacity: 8,
      availableSeats: 8,
      price: 24000,
      currency: 'INR',
      createdBy: sai._id,
      organiserId: sai._id,
      status: 'upcoming',
      isPublished: true,
      publicationStatus: 'Published'
    });

    const saiJoinReq = {
      params: { tripId: saiTrip._id.toString() },
      body: { seatsRequested: 1, message: 'Dreaming of Kashmir lakes!' },
      user: traveler2,
      io: { emit: () => {} }
    };
    const saiJoinRes = createMockRes();
    await joinRequestController.createJoinRequest(saiJoinReq, saiJoinRes, () => {});
    assert.strictEqual(saiJoinRes.statusCode, 201);
    const saiRequestId = saiJoinRes.body.request._id;

    // Organiser Dhanush tries to delete Sai's trip join request!
    const dhanushTamperDeleteReq = {
      params: { requestId: saiRequestId.toString() },
      user: dhanush, // Dhanush is NOT the organiser of saiTrip
      io: { emit: () => {} }
    };
    const dhanushTamperRes = createMockRes();
    await joinRequestController.deleteJoinRequest(dhanushTamperDeleteReq, dhanushTamperRes, () => {});
    assert.strictEqual(dhanushTamperRes.statusCode, 403, 'Cross-organiser deletion must be blocked with HTTP 403');
    assert.ok(dhanushTamperRes.body.message.includes('Access denied'));

    console.log('✔ Bug 2.4 passed: Cross-organiser request modification strictly blocked (HTTP 403).');

    // 5. Clear All Action: Dhanush clears all requests for his trips
    const clearAllReq = {
      user: dhanush,
      io: { emit: () => {} }
    };
    const clearAllRes = createMockRes();
    await joinRequestController.clearAllOrganiserRequests(clearAllReq, clearAllRes, () => {});
    assert.strictEqual(clearAllRes.statusCode, 200);
    assert.strictEqual(clearAllRes.body.success, true);

    // Verify Dhanush's request is cleared
    const dhanushReqInDb = await JoinRequest.findById(savedRequest1._id);
    assert.strictEqual(dhanushReqInDb, null, "Dhanush's request must be cleared");

    // CRITICAL ISOLATION CHECK: Sai's request MUST remain intact!
    const saiReqStillInDb = await JoinRequest.findById(saiRequestId);
    assert.ok(saiReqStillInDb, "Sai's join request MUST NOT be cleared by Dhanush's Clear All action");
    assert.strictEqual(saiReqStillInDb.status, 'pending');

    console.log("✔ Bug 2.5 passed: Clear All clears only the authenticated organiser's requests without touching other organisers' requests.");

    // Cleanup test data
    await Promise.all([
      Trip.findByIdAndDelete(createdTrip._id),
      Trip.findByIdAndDelete(saiTrip._id),
      JoinRequest.deleteMany({ user: { $in: [traveler1._id, traveler2._id] } }),
      TripMember.deleteMany({ user: { $in: [traveler1._id, traveler2._id] } }),
      Notification.deleteMany({ user: { $in: [traveler1._id, traveler2._id, dhanush._id, sai._id] } })
    ]);

    console.log('\n================================================================');
    console.log('✔ ALL BUG 1, 2, AND 3 END-TO-END TESTS PASSED (100% SUCCESS)    ');
    console.log('================================================================\n');
  } finally {
    // cleanup
  }
}

if (require.main === module) {
  runBugs123Tests()
    .then(() => disconnectDB(true))
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Test failed:', err);
      process.exit(1);
    });
}

module.exports = runBugs123Tests;
