const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const joinRequestController = require('../controllers/joinRequestController');
const reviewRoutes = require('./reviewRoutes');
const { protect, optionalAuth, requireOrganiser } = require('../middleware/auth');
const { requireTripMember, requireTripEditor, requireTripOwner } = require('../middleware/tripAuth');

// Public / Exploration routes (optional authentication: works for guests, travelers, and organisers)
router.get('/', optionalAuth, tripController.getTrips);
router.get('/recommendations', optionalAuth, tripController.getRecommendations);
router.get('/:tripId', optionalAuth, tripController.getTripById);

// All subsequent mutating routes require authentication
router.use(protect);

// Organiser trip creation, updates, and deletion
router.post('/', requireOrganiser, tripController.createTrip);
router.put('/:tripId', requireOrganiser, tripController.updateTrip);
router.patch('/:tripId', requireOrganiser, tripController.updateTrip);
router.delete('/:tripId', requireOrganiser, tripController.deleteTrip);

// Dedicated Publish & Unpublish actions
router.post('/:tripId/publish', requireOrganiser, tripController.publishTrip);
router.patch('/:tripId/publish', requireOrganiser, tripController.publishTrip);
router.put('/:tripId/publish', requireOrganiser, tripController.publishTrip);

router.post('/:tripId/unpublish', requireOrganiser, tripController.unpublishTrip);
router.patch('/:tripId/unpublish', requireOrganiser, tripController.unpublishTrip);
router.put('/:tripId/unpublish', requireOrganiser, tripController.unpublishTrip);

// Join Requests for Trip
router.post('/:tripId/join-requests', joinRequestController.createJoinRequest);
router.get('/:tripId/join-requests', requireOrganiser, joinRequestController.getTripJoinRequests);
router.patch('/:tripId/join-requests/:requestId', requireOrganiser, joinRequestController.respondToJoinRequest);

// Reviews for Trip
router.use('/:tripId/reviews', reviewRoutes);

module.exports = router;
