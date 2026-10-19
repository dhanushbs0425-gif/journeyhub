const User = require('../models/User');
const Trip = require('../models/Trip');
const TripMember = require('../models/TripMember');
const Expense = require('../models/Expense');

/**
 * Search users to invite to trips
 * GET /api/users/search?q=query
 */
async function searchUsers(req, res, next) {
  try {
    const q = req.query.q || '';
    if (!q || q.length < 2) {
      return res.json({ success: true, users: [] });
    }

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    }).select('_id name email avatar bio').limit(10);

    res.json({
      success: true,
      users
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get user travel stats
 * GET /api/users/stats
 */
async function getUserStats(req, res, next) {
  try {
    const userId = req.user._id;

    // Get all trips user is part of
    const memberships = await TripMember.find({ user: userId });
    const tripIds = memberships.map(m => m.trip);

    const trips = await Trip.find({ _id: { $in: tripIds } });

    const upcomingCount = trips.filter(t => t.status === 'upcoming').length;
    const ongoingCount = trips.filter(t => t.status === 'ongoing').length;
    const completedCount = trips.filter(t => t.status === 'completed').length;

    // Distinct destinations
    const uniqueDestinations = new Set(trips.map(t => t.destination)).size;

    // Total expenses user paid across trips
    const userExpenses = await Expense.find({ paidBy: userId });
    const totalPaid = userExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    res.json({
      success: true,
      stats: {
        totalTrips: trips.length,
        upcomingTrips: upcomingCount,
        ongoingTrips: ongoingCount,
        completedTrips: completedCount,
        destinationsVisited: uniqueDestinations,
        totalExpensesPaid: Math.round(totalPaid * 100) / 100,
        memberSince: req.user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  searchUsers,
  getUserStats
};
