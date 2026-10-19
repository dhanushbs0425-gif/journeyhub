const mongoose = require('mongoose');

const bookingDocumentSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Booking title is required (e.g. Flight to Tokyo)'],
      trim: true
    },
    type: {
      type: String,
      enum: ['Flight', 'Hotel', 'Train/Bus', 'Rental Car', 'Activity Ticket', 'Insurance', 'Visa/Passport', 'Other'],
      default: 'Hotel'
    },
    provider: {
      type: String,
      default: ''
    },
    confirmationCode: {
      type: String,
      required: [true, 'Confirmation / Reference code is required'],
      trim: true
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    cost: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: {
      type: String,
      default: ''
    },
    attachmentName: {
      type: String,
      default: ''
    },
    attachmentUrl: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('BookingDocument', bookingDocumentSchema);
