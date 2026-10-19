const Expense = require('../models/Expense');
const Trip = require('../models/Trip');
const TripMember = require('../models/TripMember');
const ItineraryActivity = require('../models/ItineraryActivity');
const PackingItem = require('../models/PackingItem');
const { calculateSettlements } = require('../utils/debtSimplifier');

/**
 * Get comprehensive analytics for a trip
 * GET /api/reports/trip/:tripId
 */
async function getTripReport(req, res, next) {
  try {
    const tripId = req.params.tripId;
    const trip = await Trip.findById(tripId).populate('createdBy', 'name email avatar');

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found.' });
    }

    const members = await TripMember.find({ trip: tripId, status: 'accepted' })
      .populate('user', 'name email avatar');

    const expenses = await Expense.find({ trip: tripId })
      .populate('paidBy', 'name email avatar')
      .populate('splits.user', 'name email avatar')
      .sort({ date: 1 });

    const activities = await ItineraryActivity.find({ trip: tripId }).sort({ dayNumber: 1, startTime: 1 });
    const packing = await PackingItem.find({ trip: tripId });

    // Category breakdown
    const categoryBreakdown = {};
    const categories = ['Accommodation', 'Transport', 'Food & Dining', 'Activities', 'Shopping', 'Emergency', 'Miscellaneous'];
    categories.forEach(c => { categoryBreakdown[c] = 0; });

    let totalExpense = 0;
    const dailySpendingMap = {};

    expenses.forEach(e => {
      const amt = e.amount || 0;
      totalExpense += amt;
      const cat = categoryBreakdown[e.category] !== undefined ? e.category : 'Miscellaneous';
      categoryBreakdown[cat] += amt;

      const dateStr = new Date(e.date).toISOString().split('T')[0];
      dailySpendingMap[dateStr] = (dailySpendingMap[dateStr] || 0) + amt;
    });

    // Format daily timeline for charts
    const dailySpending = Object.entries(dailySpendingMap).map(([date, amount]) => ({
      date,
      amount: Math.round(amount * 100) / 100
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate settlement summary
    const settlementCalc = calculateSettlements(members.map(m => m.user), expenses, []);

    const estimatedBudget = trip.estimatedBudget || 0;
    const remainingBudget = estimatedBudget - totalExpense;
    const percentSpent = estimatedBudget > 0 ? Math.round((totalExpense / estimatedBudget) * 100) : 0;

    res.json({
      success: true,
      report: {
        trip: {
          _id: trip._id,
          title: trip.title,
          destination: trip.destination,
          startDate: trip.startDate,
          endDate: trip.endDate,
          durationDays: trip.durationDays,
          status: trip.status,
          currency: trip.currency,
          estimatedBudget,
          totalExpense: Math.round(totalExpense * 100) / 100,
          remainingBudget: Math.round(remainingBudget * 100) / 100,
          percentSpent
        },
        counts: {
          members: members.length,
          activities: activities.length,
          expenses: expenses.length,
          packingItems: packing.length,
          packedItems: packing.filter(p => p.isPacked).length
        },
        categoryBreakdown,
        dailySpending,
        memberBalances: settlementCalc.balanceBreakdown,
        simplifiedDebts: settlementCalc.simplifiedDebts
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Export trip expenses as CSV
 * GET /api/reports/trip/:tripId/csv
 */
async function exportExpensesCSV(req, res, next) {
  try {
    const tripId = req.params.tripId;
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found.' });
    }

    const expenses = await Expense.find({ trip: tripId })
      .populate('paidBy', 'name email')
      .sort({ date: 1 });

    const rows = [
      ['Date', 'Title', 'Category', `Amount (${trip.currency || 'USD'})`, 'Paid By', 'Split Type', 'Notes']
    ];

    expenses.forEach(e => {
      const dateStr = new Date(e.date).toISOString().split('T')[0];
      rows.push([
        dateStr,
        `"${(e.title || '').replace(/"/g, '""')}"`,
        e.category,
        e.amount.toFixed(2),
        `"${(e.paidBy?.name || 'Unknown').replace(/"/g, '""')}"`,
        e.splitType,
        `"${(e.notes || '').replace(/"/g, '""')}"`
      ]);
    });

    const csvContent = rows.map(r => r.join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="journeyhub-${trip.title.replace(/\s+/g, '_')}-expenses.csv"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTripReport,
  exportExpensesCSV
};
