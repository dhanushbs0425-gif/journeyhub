const express = require('express');
const router = express.Router({ mergeParams: true });
const settlementController = require('../controllers/settlementController');
const { protect } = require('../middleware/auth');
const { requireTripMember } = require('../middleware/tripAuth');

router.use(protect);
router.use(requireTripMember);

router.get('/', settlementController.getSettlements);
router.post('/', settlementController.recordSettlement);

module.exports = router;
