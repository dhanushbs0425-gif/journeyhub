const express = require('express');
const router = express.Router({ mergeParams: true });
const itineraryController = require('../controllers/itineraryController');
const missedActivityController = require('../controllers/missedActivityController');
const { protect } = require('../middleware/auth');
const { requireTripMember, requireTripEditor } = require('../middleware/tripAuth');

router.use(protect);
router.use(requireTripMember);

router.get('/', itineraryController.getItinerary);
router.post('/', requireTripEditor, itineraryController.addActivity);
router.put('/reorder', requireTripEditor, itineraryController.reorderActivities);
router.put('/:activityId', requireTripEditor, itineraryController.updateActivity);
router.delete('/:activityId', requireTripEditor, itineraryController.deleteActivity);

// Distinctive Feature 2: Missed-Activity Recovery routes
router.post('/:activityId/missed', requireTripEditor, missedActivityController.markActivityMissed);
router.post('/:activityId/reschedule', requireTripEditor, missedActivityController.rescheduleMissedActivity);

module.exports = router;
