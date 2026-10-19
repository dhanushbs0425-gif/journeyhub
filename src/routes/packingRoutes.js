const express = require('express');
const router = express.Router({ mergeParams: true });
const packingController = require('../controllers/packingController');
const { protect } = require('../middleware/auth');
const { requireTripMember, requireTripEditor } = require('../middleware/tripAuth');

router.use(protect);
router.use(requireTripMember);

router.get('/', packingController.getPackingItems);
router.post('/', requireTripEditor, packingController.addPackingItem);
router.post('/presets', requireTripEditor, packingController.addStandardPresets);
router.put('/:itemId/toggle', packingController.togglePacked);
router.delete('/:itemId', requireTripEditor, packingController.deletePackingItem);

module.exports = router;
