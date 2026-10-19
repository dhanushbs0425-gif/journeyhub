const Expense = require('../models/Expense');
const ExpenseSettlement = require('../models/ExpenseSettlement');
const TripMember = require('../models/TripMember');
const Notification = require('../models/Notification');
const { calculateSettlements } = require('../utils/debtSimplifier');

/**
 * Calculate who owes whom and retrieve settlement history
 * GET /api/trips/:tripId/settlements
 */
async function getSettlements(req, res, next) {
  try {
    const tripId = req.params.tripId;

    // Fetch accepted members
    const tripMembers = await TripMember.find({ trip: tripId, status: 'accepted' })
      .populate('user', '_id name email avatar');

    const members = tripMembers.map(m => m.user);

    // Fetch all expenses and recorded settlements
    const expenses = await Expense.find({ trip: tripId }).populate('splits.user', '_id name email');
    const settlements = await ExpenseSettlement.find({ trip: tripId })
      .populate('payer', '_id name email avatar')
      .populate('payee', '_id name email avatar')
      .sort({ settledAt: -1 });

    // Run Debt Simplification algorithm
    const calculation = calculateSettlements(members, expenses, settlements);

    res.json({
      success: true,
      calculation,
      settlementHistory: settlements
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Record a new settlement payment
 * POST /api/trips/:tripId/settlements
 */
async function recordSettlement(req, res, next) {
  try {
    const tripId = req.params.tripId;
    const { payeeId, amount, paymentMethod, notes } = req.body;

    if (!payeeId || !amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Recipient (payee) and a valid settlement amount are required.'
      });
    }

    const payerId = req.user._id;

    if (payerId.toString() === payeeId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot record a settlement payment to yourself.'
      });
    }

    const settlement = await ExpenseSettlement.create({
      trip: tripId,
      payer: payerId,
      payee: payeeId,
      amount: Number(amount),
      currency: req.trip.currency || 'USD',
      status: 'confirmed',
      paymentMethod: paymentMethod || 'UPI / Bank Transfer',
      notes: notes || '',
      settledAt: new Date()
    });

    // Notify payee
    await Notification.create({
      user: payeeId,
      trip: tripId,
      title: 'Payment Settlement Received',
      message: `${req.user.name} recorded a payment of $${Number(amount).toFixed(2)} via ${paymentMethod || 'Transfer'}.`,
      type: 'settlement',
      link: `#/trips/${tripId}/settlements`
    });

    const populated = await ExpenseSettlement.findById(settlement._id)
      .populate('payer', '_id name email avatar')
      .populate('payee', '_id name email avatar');

    res.status(201).json({
      success: true,
      message: 'Settlement recorded successfully!',
      settlement: populated
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSettlements,
  recordSettlement
};
