const express = require('express');
const router = express.Router();
const mysteryTripController = require('../controllers/mysteryTripController');
const { protect, optionalAuth, requireOrganiser } = require('../middleware/auth');

// Public / Authenticated Discovery
router.get('/', optionalAuth, mysteryTripController.getMysteryTrips);
router.get('/:id', optionalAuth, mysteryTripController.getMysteryTripById);

// Organiser Mystery Trip Management
router.post('/', protect, requireOrganiser, mysteryTripController.createMysteryTrip);
router.patch('/:id', protect, requireOrganiser, mysteryTripController.updateMysteryTrip);
router.delete('/:id', protect, requireOrganiser, mysteryTripController.deleteMysteryTrip);

// Join Requests for Mystery Trips
router.post('/:id/join', protect, mysteryTripController.requestToJoinMysteryTrip);
router.post('/:id/join-requests', protect, mysteryTripController.requestToJoinMysteryTrip);
router.patch('/:id/join-requests/:requestId', protect, requireOrganiser, mysteryTripController.reviewMysteryJoinRequest);

// Destination Reveal Action & Clues (Organiser Only)
router.post('/:id/reveal', protect, requireOrganiser, mysteryTripController.revealDestination);
router.post('/:id/clues', protect, requireOrganiser, mysteryTripController.addMysteryClue);

module.exports = router;
