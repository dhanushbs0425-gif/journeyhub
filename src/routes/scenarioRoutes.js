const express = require('express');
const router = express.Router({ mergeParams: true });
const scenarioController = require('../controllers/scenarioController');
const { protect } = require('../middleware/auth');
const { requireTripMember, requireTripEditor } = require('../middleware/tripAuth');

router.use(protect);
router.use(requireTripMember);

router.get('/', scenarioController.getScenarios);
router.post('/', requireTripEditor, scenarioController.createScenario);
router.post('/:scenarioId/simulate', requireTripEditor, scenarioController.simulateChanges);
router.post('/:scenarioId/apply', requireTripEditor, scenarioController.applyScenario);

module.exports = router;
