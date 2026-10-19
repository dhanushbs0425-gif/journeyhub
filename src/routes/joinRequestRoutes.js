const express = require('express');
const router = express.Router();
const joinRequestController = require('../controllers/joinRequestController');
const { protect, requireOrganiser } = require('../middleware/auth');

router.use(protect);

// Traveler's own requests (support both root and /my-requests path)
router.get('/', joinRequestController.getUserJoinRequests);
router.get('/my-requests', joinRequestController.getUserJoinRequests);
router.delete('/:requestId', joinRequestController.cancelJoinRequest);

// Organiser review endpoints (support both /organiser-requests and /organiser/all)
router.get('/organiser-requests', requireOrganiser, joinRequestController.getOrganiserJoinRequests);
router.get('/organiser/all', requireOrganiser, joinRequestController.getOrganiserJoinRequests);
router.patch('/:requestId', requireOrganiser, joinRequestController.respondToJoinRequest);

// Direct submit convenience aliases (both / and /:tripId and /trips/:tripId)
router.post('/', joinRequestController.createJoinRequest);
router.post('/trips/:tripId', joinRequestController.createJoinRequest);
router.post('/:tripId', joinRequestController.createJoinRequest);

module.exports = router;
