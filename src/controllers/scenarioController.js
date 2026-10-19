const TripScenario = require('../models/TripScenario');
const ItineraryActivity = require('../models/ItineraryActivity');
const Trip = require('../models/Trip');
const { detectConflicts, timeToMinutes } = require('../utils/conflictDetector');

/**
 * Get all scenarios for a trip
 * GET /api/trips/:tripId/scenarios
 */
async function getScenarios(req, res, next) {
  try {
    const tripId = req.params.tripId;
    const scenarios = await TripScenario.find({ trip: tripId })
      .populate('createdBy', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: scenarios.length,
      scenarios
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new simulation scenario initialized from the live trip
 * POST /api/trips/:tripId/scenarios
 */
async function createScenario(req, res, next) {
  try {
    const tripId = req.params.tripId;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Scenario name is required.' });
    }

    const liveTrip = req.trip;
    const liveActivities = await ItineraryActivity.find({ trip: tripId, isMissed: false });

    const simulatedActivities = liveActivities.map(act => ({
      dayNumber: act.dayNumber,
      date: act.date,
      title: act.title,
      description: act.description,
      location: act.location,
      startTime: act.startTime,
      endTime: act.endTime,
      estimatedCost: act.estimatedCost,
      category: act.category,
      isCustomNew: false,
      isRemoved: false
    }));

    const scenario = await TripScenario.create({
      trip: tripId,
      createdBy: req.user._id,
      name,
      description: description || '',
      simulatedActivities,
      simulatedBudget: liveTrip.estimatedBudget,
      deltaCost: 0,
      deltaDurationMinutes: 0,
      conflictCount: 0,
      conflicts: [],
      status: 'draft'
    });

    res.status(201).json({
      success: true,
      message: 'Simulation scenario created. You can now test adjustments safely.',
      scenario
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Test changes in a scenario and recalculate delta metrics
 * POST /api/trips/:tripId/scenarios/:scenarioId/simulate
 */
async function simulateChanges(req, res, next) {
  try {
    const { tripId, scenarioId } = req.params;
    const { updatedActivities, adjustedBudget } = req.body;

    const scenario = await TripScenario.findOne({ _id: scenarioId, trip: tripId });
    if (!scenario) {
      return res.status(404).json({ success: false, message: 'Scenario not found.' });
    }

    const liveTrip = req.trip;
    const liveActivities = await ItineraryActivity.find({ trip: tripId, isMissed: false });

    // Baseline live metrics
    const baselineCost = liveActivities.reduce((sum, a) => sum + (a.estimatedCost || 0), 0);
    const baselineDuration = liveActivities.reduce((sum, a) => {
      const dur = timeToMinutes(a.endTime) - timeToMinutes(a.startTime);
      return sum + (dur > 0 ? dur : 0);
    }, 0);

    // Apply simulation updates
    if (Array.isArray(updatedActivities)) {
      scenario.simulatedActivities = updatedActivities;
    }
    if (adjustedBudget !== undefined) {
      scenario.simulatedBudget = Number(adjustedBudget);
    }

    // Compute simulated metrics
    const activeSimulated = scenario.simulatedActivities.filter(a => !a.isRemoved);
    const simCost = activeSimulated.reduce((sum, a) => sum + (Number(a.estimatedCost) || 0), 0);
    const simDuration = activeSimulated.reduce((sum, a) => {
      const dur = timeToMinutes(a.endTime) - timeToMinutes(a.startTime);
      return sum + (dur > 0 ? dur : 0);
    }, 0);

    // Check conflicts in the simulated itinerary
    const conflicts = detectConflicts(activeSimulated);

    scenario.deltaCost = Math.round((simCost - baselineCost) * 100) / 100;
    scenario.deltaDurationMinutes = simDuration - baselineDuration;
    scenario.conflictCount = conflicts.length;
    scenario.conflicts = conflicts.map(c => ({
      message: c.message,
      day: c.day,
      startTime: c.activity1.startTime,
      endTime: c.activity1.endTime
    }));

    await scenario.save();

    res.json({
      success: true,
      message: 'Scenario simulation updated!',
      scenario,
      comparison: {
        baselineCost,
        simulatedCost: simCost,
        deltaCost: scenario.deltaCost,
        baselineDurationMinutes: baselineDuration,
        simulatedDurationMinutes: simDuration,
        deltaDurationMinutes: scenario.deltaDurationMinutes,
        conflictCount: conflicts.length,
        conflicts
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Apply scenario to live trip (overwrites live itinerary with scenario changes)
 * POST /api/trips/:tripId/scenarios/:scenarioId/apply
 */
async function applyScenario(req, res, next) {
  try {
    const { tripId, scenarioId } = req.params;

    const scenario = await TripScenario.findOne({ _id: scenarioId, trip: tripId });
    if (!scenario) {
      return res.status(404).json({ success: false, message: 'Scenario not found.' });
    }

    if (scenario.status === 'applied') {
      return res.status(400).json({ success: false, message: 'This scenario has already been applied.' });
    }

    // Remove existing live activities and insert the active simulated ones
    await ItineraryActivity.deleteMany({ trip: tripId });

    const activeToInsert = scenario.simulatedActivities
      .filter(a => !a.isRemoved)
      .map((a, idx) => ({
        trip: tripId,
        dayNumber: a.dayNumber || 1,
        date: a.date || req.trip.startDate,
        title: a.title,
        description: a.description || '',
        location: a.location || '',
        startTime: a.startTime,
        endTime: a.endTime,
        durationMinutes: timeToMinutes(a.endTime) - timeToMinutes(a.startTime),
        estimatedCost: Number(a.estimatedCost) || 0,
        category: a.category || 'Sightseeing',
        orderIndex: idx,
        isMissed: false
      }));

    if (activeToInsert.length > 0) {
      await ItineraryActivity.insertMany(activeToInsert);
    }

    if (scenario.simulatedBudget > 0) {
      await Trip.findByIdAndUpdate(tripId, { estimatedBudget: scenario.simulatedBudget });
    }

    scenario.status = 'applied';
    scenario.appliedAt = new Date();
    await scenario.save();

    res.json({
      success: true,
      message: `Scenario "${scenario.name}" successfully applied to live trip! ${activeToInsert.length} activities updated.`,
      scenario
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getScenarios,
  createScenario,
  simulateChanges,
  applyScenario
};
