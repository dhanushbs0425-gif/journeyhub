const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const { requireTripMember } = require('../middleware/tripAuth');

router.use(protect);

router.get('/trip/:tripId', requireTripMember, reportController.getTripReport);
router.get('/trip/:tripId/csv', requireTripMember, reportController.exportExpensesCSV);

module.exports = router;
