const express = require('express');
const router = express.Router({ mergeParams: true });
const bookingController = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');
const { requireTripMember, requireTripEditor } = require('../middleware/tripAuth');

router.use(protect);
router.use(requireTripMember);

router.get('/', bookingController.getBookings);
router.post('/', requireTripEditor, bookingController.addBooking);
router.put('/:bookingId', requireTripEditor, bookingController.updateBooking);
router.delete('/:bookingId', requireTripEditor, bookingController.deleteBooking);

module.exports = router;
