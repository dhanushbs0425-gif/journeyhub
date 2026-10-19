const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0.01, 'Amount must be greater than zero']
    },
    currency: {
      type: String,
      default: 'USD'
    },
    category: {
      type: String,
      enum: ['Accommodation', 'Transport', 'Food & Dining', 'Activities', 'Shopping', 'Emergency', 'Miscellaneous'],
      default: 'Miscellaneous'
    },
    date: {
      type: Date,
      default: Date.now
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    splitType: {
      type: String,
      enum: ['equal', 'exact', 'shares'],
      default: 'equal'
    },
    splits: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      amount: {
        type: Number,
        required: true,
        min: 0
      },
      hasPaid: {
        type: Boolean,
        default: false
      }
    }],
    receiptUrl: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

expenseSchema.index({ trip: 1, date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
