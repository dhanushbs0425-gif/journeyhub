const Vote = require('../models/Vote');

/**
 * Get all voting polls for a trip
 * GET /api/trips/:tripId/votes
 */
async function getVotes(req, res, next) {
  try {
    const tripId = req.params.tripId;

    const polls = await Vote.find({ trip: tripId })
      .populate('createdBy', 'name email avatar')
      .sort({ createdAt: -1 });

    // Compute tallies and user's vote for each poll
    const currentUserId = req.user._id.toString();

    const formattedPolls = polls.map(poll => {
      const totalVotesCast = poll.votes.length;
      const optionCounts = {};
      poll.options.forEach(opt => {
        optionCounts[opt._id.toString()] = 0;
      });

      let userVotedOptionId = null;

      poll.votes.forEach(v => {
        const optId = v.optionId.toString();
        if (optionCounts[optId] !== undefined) {
          optionCounts[optId]++;
        }
        if (v.user.toString() === currentUserId) {
          userVotedOptionId = optId;
        }
      });

      const optionsWithStats = poll.options.map(opt => {
        const count = optionCounts[opt._id.toString()] || 0;
        const percentage = totalVotesCast > 0 ? Math.round((count / totalVotesCast) * 100) : 0;
        return {
          _id: opt._id,
          text: opt.text,
          metadata: opt.metadata,
          count,
          percentage
        };
      });

      return {
        _id: poll._id,
        trip: poll.trip,
        title: poll.title,
        description: poll.description,
        type: poll.type,
        status: poll.status,
        expiresAt: poll.expiresAt,
        createdBy: poll.createdBy,
        createdAt: poll.createdAt,
        totalVotesCast,
        userVotedOptionId,
        options: optionsWithStats
      };
    });

    res.json({
      success: true,
      count: formattedPolls.length,
      polls: formattedPolls
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new voting poll
 * POST /api/trips/:tripId/votes
 */
async function createVote(req, res, next) {
  try {
    const tripId = req.params.tripId;
    const { title, description, type, options, expiresAt } = req.body;

    if (!title || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Poll title and at least two options are required.'
      });
    }

    const formattedOptions = options.map(opt => {
      if (typeof opt === 'string') return { text: opt.trim() };
      return { text: opt.text?.trim() || 'Option', metadata: opt.metadata || {} };
    });

    const poll = await Vote.create({
      trip: tripId,
      title,
      description: description || '',
      type: type || 'general',
      options: formattedOptions,
      createdBy: req.user._id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      status: 'open'
    });

    res.status(201).json({
      success: true,
      message: 'Voting poll created successfully!',
      poll
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cast a vote on a poll (prevents duplicate vote by same member)
 * POST /api/trips/:tripId/votes/:voteId/cast
 */
async function castVote(req, res, next) {
  try {
    const { tripId, voteId } = req.params;
    const { optionId } = req.body;

    if (!optionId) {
      return res.status(400).json({ success: false, message: 'optionId is required.' });
    }

    const poll = await Vote.findOne({ _id: voteId, trip: tripId });
    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found.' });
    }

    if (poll.status === 'closed') {
      return res.status(400).json({ success: false, message: 'This poll is already closed.' });
    }

    // Verify option exists
    const validOption = poll.options.some(o => o._id.toString() === optionId.toString());
    if (!validOption) {
      return res.status(400).json({ success: false, message: 'Selected option does not exist in this poll.' });
    }

    // Prevent duplicate: if already voted, update the existing vote to the new option
    const existingIndex = poll.votes.findIndex(v => v.user.toString() === req.user._id.toString());
    if (existingIndex > -1) {
      poll.votes[existingIndex].optionId = optionId;
      poll.votes[existingIndex].votedAt = new Date();
    } else {
      poll.votes.push({
        user: req.user._id,
        optionId,
        votedAt: new Date()
      });
    }

    await poll.save();

    res.json({
      success: true,
      message: 'Your vote has been recorded!'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Close or reopen a poll
 * PUT /api/trips/:tripId/votes/:voteId/status
 */
async function togglePollStatus(req, res, next) {
  try {
    const { tripId, voteId } = req.params;
    const { status } = req.body;

    const poll = await Vote.findOne({ _id: voteId, trip: tripId });
    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found.' });
    }

    poll.status = status === 'closed' ? 'closed' : 'open';
    await poll.save();

    res.json({
      success: true,
      message: `Poll has been marked as ${poll.status}.`,
      poll
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getVotes,
  createVote,
  castVote,
  togglePollStatus
};
