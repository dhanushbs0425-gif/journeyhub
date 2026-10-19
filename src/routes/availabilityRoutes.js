const express = require('express');
const router = express.Router({ mergeParams: true });
const availabilityController = require('../controllers/availabilityController');
const { protect } = require('../middleware/auth');
const { requireTripMember, requireTripEditor } = require('../middleware/tripAuth');

router.use(protect);
router.use(requireTripMember);

router.get('/', availabilityController.getAvailability);
router.post('/', availabilityController.setMyAvailability);
router.post('/apply', requireTripEditor, availabilityController.applyMatchedDates);

module.exports = router;
