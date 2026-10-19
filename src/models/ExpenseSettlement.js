const mongoose = require('mongoose');

const expenseSettlementSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true
    },
    payer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    payee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Settlement amount must be positive']
    },
    currency: {
      type: String,
      default: 'USD'
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed'],
      default: 'confirmed'
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI / Bank Transfer', 'PayPal', 'Venmo', 'Card', 'Other'],
      default: 'UPI / Bank Transfer'
    },
    settledAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ExpenseSettlement', expenseSettlementSchema);
