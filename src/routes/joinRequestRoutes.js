const express = require('express');
const router = express.Router();
const joinRequestController = require('../controllers/joinRequestController');
const { protect, requireOrganiser } = require('../middleware/auth');

router.use(protect);

// Traveler's own requests (support both root and /my-requests path)
router.get('/', joinRequestController.getUserJoinRequests);
router.get('/my-requests', joinRequestController.getUserJoinRequests);

// Organiser review endpoints (support both /organiser-requests and /organiser/all)
router.get('/organiser-requests', requireOrganiser, joinRequestController.getOrganiserJoinRequests);
router.get('/organiser/all', requireOrganiser, joinRequestController.getOrganiserJoinRequests);

// Organiser Clear All endpoint (MUST be defined before /:requestId!)
router.delete('/clear-all', requireOrganiser, joinRequestController.clearAllOrganiserRequests);

// Individual request actions
router.patch('/:requestId', requireOrganiser, joinRequestController.respondToJoinRequest);
router.delete('/:requestId', joinRequestController.deleteJoinRequest);

// Direct submit convenience aliases (both / and /:tripId and /trips/:tripId)
router.post('/', joinRequestController.createJoinRequest);
router.post('/trips/:tripId', joinRequestController.createJoinRequest);
router.post('/:tripId', joinRequestController.createJoinRequest);

module.exports = router;
