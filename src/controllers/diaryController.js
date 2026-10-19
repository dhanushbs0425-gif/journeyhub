const TravelDiaryEntry = require('../models/TravelDiaryEntry');

/**
 * Get all diary entries and photo memories for a trip
 * GET /api/trips/:tripId/diary
 */
async function getDiaryEntries(req, res, next) {
  try {
    const tripId = req.params.tripId;

    const entries = await TravelDiaryEntry.find({ trip: tripId })
      .populate('author', 'name email avatar')
      .sort({ dayNumber: 1, date: 1, createdAt: 1 });

    // Aggregate photo gallery
    const photoGallery = [];
    entries.forEach(entry => {
      if (Array.isArray(entry.photos)) {
        entry.photos.forEach(photo => {
          photoGallery.push({
            url: photo.url,
            caption: photo.caption,
            entryTitle: entry.title,
            dayNumber: entry.dayNumber,
            authorName: entry.author?.name || 'Traveler',
            date: entry.date
          });
        });
      }
    });

    res.json({
      success: true,
      count: entries.length,
      entries,
      photoGallery
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new diary entry
 * POST /api/trips/:tripId/diary
 */
async function createDiaryEntry(req, res, next) {
  try {
    const tripId = req.params.tripId;
    const {
      dayNumber,
      date,
      title,
      notes,
      memorablePlaces,
      photos,
      mood,
      weather,
      rating,
      actualExpenses,
      highlights
    } = req.body;

    if (!title || !notes) {
      return res.status(400).json({
        success: false,
        message: 'Title and notes are required for a diary entry.'
      });
    }

    const entry = await TravelDiaryEntry.create({
      trip: tripId,
      author: req.user._id,
      dayNumber: Number(dayNumber) || 1,
      date: date ? new Date(date) : new Date(),
      title,
      notes,
      memorablePlaces: memorablePlaces || [],
      photos: photos || [],
      mood: mood || 'Amazing',
      weather: weather || 'Sunny',
      rating: Number(rating) || 5,
      actualExpenses: Number(actualExpenses) || 0,
      highlights: highlights || []
    });

    const populated = await TravelDiaryEntry.findById(entry._id).populate('author', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Travel memory saved to your diary!',
      entry: populated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update diary entry
 * PUT /api/trips/:tripId/diary/:entryId
 */
async function updateDiaryEntry(req, res, next) {
  try {
    const { tripId, entryId } = req.params;
    const entry = await TravelDiaryEntry.findOne({ _id: entryId, trip: tripId });

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Diary entry not found.' });
    }

    // Only author or trip owner can edit
    if (entry.author.toString() !== req.user._id.toString() && req.tripMember.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Permission denied to edit this diary entry.' });
    }

    const { title, notes, memorablePlaces, photos, mood, weather, rating, actualExpenses, highlights, dayNumber, date } = req.body;

    if (title) entry.title = title;
    if (notes) entry.notes = notes;
    if (memorablePlaces) entry.memorablePlaces = memorablePlaces;
    if (photos) entry.photos = photos;
    if (mood) entry.mood = mood;
    if (weather) entry.weather = weather;
    if (rating !== undefined) entry.rating = Number(rating);
    if (actualExpenses !== undefined) entry.actualExpenses = Number(actualExpenses);
    if (highlights) entry.highlights = highlights;
    if (dayNumber !== undefined) entry.dayNumber = Number(dayNumber);
    if (date) entry.date = new Date(date);

    await entry.save();

    const populated = await TravelDiaryEntry.findById(entry._id).populate('author', 'name email avatar');

    res.json({
      success: true,
      message: 'Diary entry updated!',
      entry: populated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete diary entry
 * DELETE /api/trips/:tripId/diary/:entryId
 */
async function deleteDiaryEntry(req, res, next) {
  try {
    const { tripId, entryId } = req.params;
    const entry = await TravelDiaryEntry.findOne({ _id: entryId, trip: tripId });

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Diary entry not found.' });
    }

    if (entry.author.toString() !== req.user._id.toString() && req.tripMember.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Permission denied to delete this diary entry.' });
    }

    await TravelDiaryEntry.findByIdAndDelete(entryId);

    res.json({
      success: true,
      message: 'Diary entry deleted.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDiaryEntries,
  createDiaryEntry,
  updateDiaryEntry,
  deleteDiaryEntry
};
