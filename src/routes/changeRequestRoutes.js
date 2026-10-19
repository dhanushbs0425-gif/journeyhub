const express = require('express');
const router = express.Router({ mergeParams: true });
const changeRequestController = require('../controllers/changeRequestController');
const { protect } = require('../middleware/auth');
const { requireTripMember, requireTripEditor } = require('../middleware/tripAuth');

router.use(protect);
router.use(requireTripMember);

router.get('/', changeRequestController.getChangeRequests);
router.post('/', changeRequestController.submitChangeRequest);
router.put('/:requestId/review', requireTripEditor, changeRequestController.reviewChangeRequest);

module.exports = router;
