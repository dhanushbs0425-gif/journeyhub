const PackingItem = require('../models/PackingItem');

/**
 * Get all packing items for a trip
 * GET /api/trips/:tripId/packing
 */
async function getPackingItems(req, res, next) {
  try {
    const tripId = req.params.tripId;

    const items = await PackingItem.find({ trip: tripId })
      .populate('assignedTo', 'name email avatar')
      .sort({ category: 1, isPacked: 1, createdAt: 1 });

    const totalCount = items.length;
    const packedCount = items.filter(i => i.isPacked).length;
    const percentage = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;

    // Group items by category
    const categories = {};
    items.forEach(item => {
      if (!categories[item.category]) categories[item.category] = [];
      categories[item.category].push(item);
    });

    res.json({
      success: true,
      stats: {
        totalCount,
        packedCount,
        percentage
      },
      categories,
      items
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add a new packing item
 * POST /api/trips/:tripId/packing
 */
async function addPackingItem(req, res, next) {
  try {
    const tripId = req.params.tripId;
    const { title, category, quantity, assignedTo, isShared } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Item title is required.' });
    }

    const item = await PackingItem.create({
      trip: tripId,
      title: title.trim(),
      category: category || 'Misc',
      quantity: Number(quantity) || 1,
      assignedTo: assignedTo || req.user._id,
      isShared: Boolean(isShared),
      isPacked: false
    });

    const populated = await PackingItem.findById(item._id).populate('assignedTo', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Packing item added!',
      item: populated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Toggle packed status
 * PUT /api/trips/:tripId/packing/:itemId/toggle
 */
async function togglePacked(req, res, next) {
  try {
    const { tripId, itemId } = req.params;

    const item = await PackingItem.findOne({ _id: itemId, trip: tripId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Packing item not found.' });
    }

    item.isPacked = !item.isPacked;
    item.packedAt = item.isPacked ? new Date() : null;
    await item.save();

    const populated = await PackingItem.findById(item._id).populate('assignedTo', 'name email avatar');

    res.json({
      success: true,
      message: item.isPacked ? 'Item marked as packed!' : 'Item marked as unpacked.',
      item: populated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete packing item
 * DELETE /api/trips/:tripId/packing/:itemId
 */
async function deletePackingItem(req, res, next) {
  try {
    const { tripId, itemId } = req.params;
    const item = await PackingItem.findOneAndDelete({ _id: itemId, trip: tripId });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Packing item not found.' });
    }

    res.json({
      success: true,
      message: 'Item removed from packing list.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add standard travel packing presets (clothes, passport, charger, first aid)
 * POST /api/trips/:tripId/packing/presets
 */
async function addStandardPresets(req, res, next) {
  try {
    const tripId = req.params.tripId;
    const presets = [
      { title: 'Passports & Travel Visas', category: 'Documents & Money', quantity: 1, isShared: false },
      { title: 'Credit Cards & Local Cash', category: 'Documents & Money', quantity: 1, isShared: false },
      { title: 'Universal Power Adapter', category: 'Electronics', quantity: 1, isShared: true },
      { title: 'Portable Power Bank (10,000mAh)', category: 'Electronics', quantity: 1, isShared: true },
      { title: 'Phone & Camera Chargers', category: 'Electronics', quantity: 2, isShared: false },
      { title: 'Travel First Aid Kit & Bandages', category: 'Health & Medical', quantity: 1, isShared: true },
      { title: 'Personal Prescriptions & Pain Relievers', category: 'Health & Medical', quantity: 1, isShared: false },
      { title: 'Quick-dry Travel Towel', category: 'Toiletries', quantity: 1, isShared: false },
      { title: 'Sunscreen SPF 50+ & Lip Balm', category: 'Toiletries', quantity: 1, isShared: true },
      { title: 'Toothbrush & Travel Toothpaste', category: 'Toiletries', quantity: 1, isShared: false },
      { title: 'Comfortable Walking Shoes', category: 'Footwear', quantity: 1, isShared: false },
      { title: 'Light Rain Jacket / Windbreaker', category: 'Clothing', quantity: 1, isShared: false },
      { title: 'Sunglasses & UV Hat', category: 'Gear & Accessories', quantity: 1, isShared: false }
    ];

    const createdItems = await Promise.all(
      presets.map(p =>
        PackingItem.create({
          trip: tripId,
          ...p,
          assignedTo: req.user._id,
          isPacked: false
        })
      )
    );

    res.status(201).json({
      success: true,
      message: `Added ${createdItems.length} essential packing presets!`,
      count: createdItems.length
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPackingItems,
  addPackingItem,
  togglePacked,
  deletePackingItem,
  addStandardPresets
};
