const BookingDocument = require('../models/BookingDocument');

/**
 * Get all booking documents for a trip
 * GET /api/trips/:tripId/bookings
 */
async function getBookings(req, res, next) {
  try {
    const tripId = req.params.tripId;

    const bookings = await BookingDocument.find({ trip: tripId })
      .populate('bookedBy', 'name email avatar')
      .sort({ startDate: 1, createdAt: -1 });

    const totalCost = bookings.reduce((sum, b) => sum + (b.cost || 0), 0);

    // Group by type (Flight, Hotel, Train/Bus, Activity Ticket, etc.)
    const byType = {};
    bookings.forEach(b => {
      if (!byType[b.type]) byType[b.type] = [];
      byType[b.type].push(b);
    });

    res.json({
      success: true,
      count: bookings.length,
      totalBookingCost: Math.round(totalCost * 100) / 100,
      byType,
      bookings
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add a new booking document
 * POST /api/trips/:tripId/bookings
 */
async function addBooking(req, res, next) {
  try {
    const tripId = req.params.tripId;
    const { title, type, provider, confirmationCode, startDate, endDate, cost, currency, notes, attachmentName, attachmentUrl } = req.body;

    if (!title || !confirmationCode) {
      return res.status(400).json({
        success: false,
        message: 'Title and confirmation code are required.'
      });
    }

    const booking = await BookingDocument.create({
      trip: tripId,
      title,
      type: type || 'Hotel',
      provider: provider || '',
      confirmationCode: confirmationCode.trim(),
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      cost: Number(cost) || 0,
      currency: currency || req.trip.currency || 'USD',
      bookedBy: req.user._id,
      notes: notes || '',
      attachmentName: attachmentName || '',
      attachmentUrl: attachmentUrl || ''
    });

    const populated = await BookingDocument.findById(booking._id).populate('bookedBy', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Booking reference added!',
      booking: populated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update booking
 * PUT /api/trips/:tripId/bookings/:bookingId
 */
async function updateBooking(req, res, next) {
  try {
    const { tripId, bookingId } = req.params;
    const { title, type, provider, confirmationCode, startDate, endDate, cost, notes, attachmentName, attachmentUrl } = req.body;

    const booking = await BookingDocument.findOne({ _id: bookingId, trip: tripId });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (title) booking.title = title;
    if (type) booking.type = type;
    if (provider !== undefined) booking.provider = provider;
    if (confirmationCode) booking.confirmationCode = confirmationCode;
    if (startDate) booking.startDate = new Date(startDate);
    if (endDate) booking.endDate = new Date(endDate);
    if (cost !== undefined) booking.cost = Number(cost);
    if (notes !== undefined) booking.notes = notes;
    if (attachmentName !== undefined) booking.attachmentName = attachmentName;
    if (attachmentUrl !== undefined) booking.attachmentUrl = attachmentUrl;

    await booking.save();

    const populated = await BookingDocument.findById(booking._id).populate('bookedBy', 'name email avatar');

    res.json({
      success: true,
      message: 'Booking reference updated!',
      booking: populated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete booking
 * DELETE /api/trips/:tripId/bookings/:bookingId
 */
async function deleteBooking(req, res, next) {
  try {
    const { tripId, bookingId } = req.params;
    const booking = await BookingDocument.findOneAndDelete({ _id: bookingId, trip: tripId });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    res.json({
      success: true,
      message: 'Booking reference deleted.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getBookings,
  addBooking,
  updateBooking,
  deleteBooking
};
