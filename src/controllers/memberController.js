const TripMember = require('../models/TripMember');
const User = require('../models/User');
const Notification = require('../models/Notification');

/**
 * Get all members of a trip
 * GET /api/trips/:tripId/members
 */
async function getMembers(req, res, next) {
  try {
    const tripId = req.params.tripId;

    const members = await TripMember.find({ trip: tripId })
      .populate('user', 'name email avatar phone bio travelInterests')
      .populate('invitedBy', 'name email')
      .sort({ role: 1, createdAt: 1 });

    res.json({
      success: true,
      count: members.length,
      members
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Invite a member to trip
 * POST /api/trips/:tripId/members
 */
async function inviteMember(req, res, next) {
  try {
    const tripId = req.params.tripId;
    const { email, userId, role } = req.body;

    let targetUser = null;
    if (userId) {
      targetUser = await User.findById(userId);
    } else if (email) {
      targetUser = await User.findOne({ email: email.toLowerCase() });
    }

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Ensure the user is registered on JourneyHub.'
      });
    }

    // Check if already a member
    const existing = await TripMember.findOne({ trip: tripId, user: targetUser._id });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `${targetUser.name} is already a member of this trip.`
      });
    }

    const memberRole = ['owner', 'editor', 'viewer'].includes(role) ? role : 'editor';

    const newMember = await TripMember.create({
      trip: tripId,
      user: targetUser._id,
      role: memberRole,
      status: 'accepted',
      invitedBy: req.user._id
    });

    // Create Notification for the invited user
    await Notification.create({
      user: targetUser._id,
      trip: tripId,
      title: 'Trip Invitation',
      message: `${req.user.name} added you to the trip "${req.trip.title}" as an ${memberRole}.`,
      type: 'invite',
      link: `#/trips/${tripId}`
    });

    const populated = await TripMember.findById(newMember._id).populate('user', 'name email avatar phone bio');

    res.status(201).json({
      success: true,
      message: `${targetUser.name} added to the trip as ${memberRole}!`,
      member: populated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update member role (Owner only)
 * PUT /api/trips/:tripId/members/:memberId/role
 */
async function updateMemberRole(req, res, next) {
  try {
    const { tripId, memberId } = req.params;
    const { role } = req.body;

    if (!['owner', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Must be owner, editor, or viewer.' });
    }

    const member = await TripMember.findOne({ _id: memberId, trip: tripId }).populate('user', 'name email');
    if (!member) {
      return res.status(404).json({ success: false, message: 'Trip member record not found.' });
    }

    // Cannot downgrade the original trip creator
    if (member.user._id.toString() === req.trip.createdBy.toString() && role !== 'owner') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change the role of the primary trip organizer.'
      });
    }

    member.role = role;
    await member.save();

    res.json({
      success: true,
      message: `Updated ${member.user.name}'s role to ${role}.`,
      member
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Remove member from trip (Owner only, or self-leave)
 * DELETE /api/trips/:tripId/members/:memberId
 */
async function removeMember(req, res, next) {
  try {
    const { tripId, memberId } = req.params;

    const member = await TripMember.findOne({ _id: memberId, trip: tripId });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    // Trip creator cannot be removed
    if (member.user.toString() === req.trip.createdBy.toString()) {
      return res.status(400).json({ success: false, message: 'Primary trip organizer cannot be removed.' });
    }

    // Allow if caller is Owner OR caller is removing themselves
    const isOwner = req.tripMember.role === 'owner';
    const isSelf = req.user._id.toString() === member.user.toString();

    if (!isOwner && !isSelf) {
      return res.status(403).json({ success: false, message: 'Permission denied to remove this member.' });
    }

    await TripMember.findByIdAndDelete(memberId);

    res.json({
      success: true,
      message: isSelf ? 'You have left the trip.' : 'Member removed from trip.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMembers,
  inviteMember,
  updateMemberRole,
  removeMember
};
