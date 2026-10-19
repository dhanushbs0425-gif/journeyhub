const Expense = require('../models/Expense');
const Trip = require('../models/Trip');
const TripMember = require('../models/TripMember');
const Notification = require('../models/Notification');

/**
 * Get all expenses and budget analysis for a trip
 * GET /api/trips/:tripId/expenses
 */
async function getExpenses(req, res, next) {
  try {
    const tripId = req.params.tripId;
    const trip = req.trip || await Trip.findById(tripId);

    const expenses = await Expense.find({ trip: tripId })
      .populate('paidBy', 'name email avatar')
      .populate('splits.user', 'name email avatar')
      .sort({ date: -1, createdAt: -1 });

    const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const estimatedBudget = trip.estimatedBudget || 0;
    const remainingBudget = estimatedBudget - totalSpent;
    const percentSpent = estimatedBudget > 0 ? Math.round((totalSpent / estimatedBudget) * 100) : 0;

    // Category breakdown
    const categoryTotals = {
      Accommodation: 0,
      Transport: 0,
      'Food & Dining': 0,
      Activities: 0,
      Shopping: 0,
      Emergency: 0,
      Miscellaneous: 0
    };

    expenses.forEach(e => {
      const cat = categoryTotals[e.category] !== undefined ? e.category : 'Miscellaneous';
      categoryTotals[cat] += e.amount || 0;
    });

    // Check budget alert threshold
    const threshold = req.user.preferences?.budgetAlertThreshold || 80;
    let thresholdWarning = null;

    if (percentSpent >= 100) {
      thresholdWarning = {
        level: 'danger',
        message: `Over Budget Alert: You have spent ${percentSpent}% of your estimated budget ($${totalSpent.toFixed(2)} / $${estimatedBudget.toFixed(2)}).`
      };
    } else if (percentSpent >= threshold) {
      thresholdWarning = {
        level: 'warning',
        message: `Budget Alert: You have reached ${percentSpent}% of your allocated budget ($${totalSpent.toFixed(2)} / $${estimatedBudget.toFixed(2)}).`
      };
    }

    res.json({
      success: true,
      count: expenses.length,
      budgetSummary: {
        estimatedBudget: Math.round(estimatedBudget * 100) / 100,
        totalSpent: Math.round(totalSpent * 100) / 100,
        remainingBudget: Math.round(remainingBudget * 100) / 100,
        percentSpent,
        currency: trip.currency || 'USD',
        thresholdWarning
      },
      categoryTotals,
      expenses
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add a new expense
 * POST /api/trips/:tripId/expenses
 */
async function addExpense(req, res, next) {
  try {
    const tripId = req.params.tripId;
    const { title, amount, category, date, paidBy, splitType, splits, receiptUrl, notes } = req.body;

    if (!title || !amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Expense title and a valid positive amount are required.'
      });
    }

    const payer = paidBy || req.user._id;
    const numAmount = Number(amount);

    let processedSplits = [];

    if (splitType === 'exact' && Array.isArray(splits) && splits.length > 0) {
      // Validate sum matches amount
      const sumSplits = splits.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
      if (Math.abs(sumSplits - numAmount) > 0.05) {
        return res.status(400).json({
          success: false,
          message: `The split sum ($${sumSplits.toFixed(2)}) must equal total expense ($${numAmount.toFixed(2)}).`
        });
      }
      processedSplits = splits.map(s => ({
        user: s.user,
        amount: Number(s.amount),
        hasPaid: s.user.toString() === payer.toString()
      }));
    } else {
      // Equal split among provided users or all accepted members
      let splitUserIds = [];
      if (Array.isArray(splits) && splits.length > 0) {
        splitUserIds = splits.map(s => s.user || s);
      } else {
        const members = await TripMember.find({ trip: tripId, status: 'accepted' });
        splitUserIds = members.map(m => m.user);
      }

      if (splitUserIds.length === 0) {
        splitUserIds = [payer];
      }

      const equalShare = Math.round((numAmount / splitUserIds.length) * 100) / 100;
      processedSplits = splitUserIds.map((userId, idx) => ({
        user: userId,
        amount: idx === 0 ? numAmount - (equalShare * (splitUserIds.length - 1)) : equalShare,
        hasPaid: userId.toString() === payer.toString()
      }));
    }

    const expense = await Expense.create({
      trip: tripId,
      title,
      amount: numAmount,
      currency: req.trip.currency || 'USD',
      category: category || 'Miscellaneous',
      date: date ? new Date(date) : new Date(),
      paidBy: payer,
      splitType: splitType || 'equal',
      splits: processedSplits,
      receiptUrl: receiptUrl || '',
      notes: notes || ''
    });

    // Check if new total trips budget threshold
    const allExpenses = await Expense.find({ trip: tripId });
    const newTotal = allExpenses.reduce((sum, e) => sum + e.amount, 0);
    const budget = req.trip.estimatedBudget || 0;

    if (budget > 0 && (newTotal / budget) >= 0.9) {
      // Notify trip owner of approaching or exceeded budget
      await Notification.create({
        user: req.trip.createdBy,
        trip: tripId,
        title: 'Budget Alert',
        message: `Trip "${req.trip.title}" has reached ${Math.round((newTotal / budget) * 100)}% of the budget.`,
        type: 'budget_warning',
        link: `#/trips/${tripId}/expenses`
      });
    }

    const populated = await Expense.findById(expense._id)
      .populate('paidBy', 'name email avatar')
      .populate('splits.user', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Expense added successfully!',
      expense: populated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update expense
 * PUT /api/trips/:tripId/expenses/:expenseId
 */
async function updateExpense(req, res, next) {
  try {
    const { tripId, expenseId } = req.params;
    const { title, amount, category, date, paidBy, splitType, splits, receiptUrl, notes } = req.body;

    const expense = await Expense.findOne({ _id: expenseId, trip: tripId });
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }

    if (title) expense.title = title;
    if (amount !== undefined) expense.amount = Number(amount);
    if (category) expense.category = category;
    if (date) expense.date = new Date(date);
    if (paidBy) expense.paidBy = paidBy;
    if (splitType) expense.splitType = splitType;
    if (splits) expense.splits = splits;
    if (receiptUrl !== undefined) expense.receiptUrl = receiptUrl;
    if (notes !== undefined) expense.notes = notes;

    await expense.save();

    const populated = await Expense.findById(expense._id)
      .populate('paidBy', 'name email avatar')
      .populate('splits.user', 'name email avatar');

    res.json({
      success: true,
      message: 'Expense updated successfully!',
      expense: populated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete expense
 * DELETE /api/trips/:tripId/expenses/:expenseId
 */
async function deleteExpense(req, res, next) {
  try {
    const { tripId, expenseId } = req.params;
    const expense = await Expense.findOneAndDelete({ _id: expenseId, trip: tripId });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }

    res.json({
      success: true,
      message: 'Expense deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getExpenses,
  addExpense,
  updateExpense,
  deleteExpense
};
