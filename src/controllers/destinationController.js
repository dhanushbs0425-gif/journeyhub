const Destination = require('../models/Destination');

/**
 * Get all destinations with advanced search, state, category, and budget filters
 * GET /api/destinations?category=...&state=...&q=...&budgetMax=...&sort=...
 */
async function getDestinations(req, res, next) {
  try {
    const { category, state, q, budgetMin, budgetMax, duration, sort, featured, page = 1, limit = 100 } = req.query;
    const filter = {};

    if (category && category !== 'All') {
      filter.$or = [
        { category: category },
        { category: { $regex: category.replace('&', '.*'), $options: 'i' } }
      ];
    }

    if (state && state !== 'All') {
      filter.state = { $regex: new RegExp(`^${state.trim()}$`, 'i') };
    }

    if (featured === 'true') {
      filter.isFeatured = true;
    }

    if (budgetMax) {
      filter.estimatedBudgetMin = { $lte: Number(budgetMax) };
    }
    if (budgetMin) {
      filter.estimatedBudgetMax = { $gte: Number(budgetMin) };
    }

    if (duration && duration !== 'All') {
      filter.recommendedDuration = { $regex: duration, $options: 'i' };
    }

    if (q) {
      const qRegex = new RegExp(q.trim(), 'i');
      const searchConditions = [
        { name: qRegex },
        { state: qRegex },
        { city: qRegex },
        { country: qRegex },
        { description: qRegex },
        { attractions: { $in: [qRegex] } },
        { activities: { $in: [qRegex] } }
      ];

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    // Sort order
    let sortObj = { popularity: -1, rating: -1 };
    if (sort === 'budget_asc') {
      sortObj = { estimatedBudgetMin: 1, averageDailyCost: 1 };
    } else if (sort === 'budget_desc') {
      sortObj = { estimatedBudgetMax: -1, averageDailyCost: -1 };
    } else if (sort === 'name_asc') {
      sortObj = { name: 1 };
    } else if (sort === 'name_desc') {
      sortObj = { name: -1 };
    }

    const skipCount = (Number(page) - 1) * Number(limit);
    const totalCount = await Destination.countDocuments(filter);
    const destinations = await Destination.find(filter)
      .sort(sortObj)
      .skip(skipCount)
      .limit(Number(limit));

    res.json({
      success: true,
      count: destinations.length,
      totalCount,
      page: Number(page),
      totalPages: Math.ceil(totalCount / Number(limit)) || 1,
      destinations
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single destination details
 * GET /api/destinations/:id
 */
async function getDestinationById(req, res, next) {
  try {
    const destination = await Destination.findById(req.params.id);
    if (!destination) {
      return res.status(404).json({ success: false, message: 'Destination not found.' });
    }

    // Also fetch nearby destinations in the same state or category
    const nearby = await Destination.find({
      _id: { $ne: destination._id },
      $or: [
        { state: destination.state },
        { category: destination.category }
      ]
    }).limit(4).select('name state imageUrl estimatedBudgetMin category rating');

    res.json({
      success: true,
      destination,
      nearby
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get distinct categories with count
 * GET /api/destinations/categories
 */
async function getCategories(req, res, next) {
  try {
    const categories = await Destination.distinct('category');
    res.json({
      success: true,
      categories: categories.filter(Boolean)
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get distinct Indian states and Union Territories
 * GET /api/destinations/states
 */
async function getStates(req, res, next) {
  try {
    const states = await Destination.distinct('state');
    const cleanStates = states.filter(s => s && s !== 'India').sort();
    res.json({
      success: true,
      states: cleanStates
    });
  } catch (error) {
    next(error);
  }
}

/**
 * "Surprise Me" - Pick a random destination
 * GET /api/destinations/random
 */
async function getRandomDestination(req, res, next) {
  try {
    const count = await Destination.countDocuments();
    if (count === 0) {
      return res.status(404).json({ success: false, message: 'No destinations found.' });
    }
    const randomIdx = Math.floor(Math.random() * count);
    const randomDest = await Destination.findOne().skip(randomIdx);

    res.json({
      success: true,
      destination: randomDest
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get nearby destinations
 * GET /api/destinations/:id/nearby
 */
async function getNearbyDestinations(req, res, next) {
  try {
    const dest = await Destination.findById(req.params.id);
    if (!dest) {
      return res.status(404).json({ success: false, message: 'Destination not found.' });
    }

    const nearby = await Destination.find({
      _id: { $ne: dest._id },
      state: dest.state
    }).limit(5);

    res.json({
      success: true,
      nearby
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDestinations,
  getDestinationById,
  getCategories,
  getStates,
  getRandomDestination,
  getNearbyDestinations
};
