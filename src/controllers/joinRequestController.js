const JoinRequest = require('../models/JoinRequest');
const Trip = require('../models/Trip');
const MysteryTrip = require('../models/MysteryTrip');
const TripMember = require('../models/TripMember');
const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Submit request to join a trip (Regular Trip or Mystery Trip)
 * POST /api/join-requests or POST /api/trips/:tripId/join-requests
 */
async function createJoinRequest(req, res, next) {
  try {
    const tripId = req.params?.tripId || req.body?.tripId;
    const { seatsRequested, seats: directSeats, message, tripType: inputTripType } = req.body || {};

    if (!tripId) {
      return res.status(400).json({ success: false, message: 'Trip ID is required.' });
    }

    const seats = Number(seatsRequested || directSeats) || 1;

    // Check if it's a regular Trip first
    let trip = await Trip.findById(tripId);
    let mysteryTrip = null;
    let isMystery = false;

    if (!trip) {
      // Check if it's a MysteryTrip
      mysteryTrip = await MysteryTrip.findById(tripId);
      if (mysteryTrip) {
        isMystery = true;
      }
    }

    if (!trip && !mysteryTrip) {
      return res.status(404).json({ success: false, message: 'Trip not found.' });
    }

    // 1. Handle Regular Trip Join Request
    if (!isMystery) {
      // Check if user is already a confirmed member or owner
      const existingMember = await TripMember.findOne({ trip: trip._id, user: req.user._id, status: 'accepted' });
      if (existingMember) {
        return res.status(400).json({ success: false, message: 'You are already a confirmed traveler on this trip.' });
      }

      if (
        (trip.createdBy && trip.createdBy.toString() === req.user._id.toString()) ||
        (trip.organiserId && trip.organiserId.toString() === req.user._id.toString())
      ) {
        return res.status(400).json({ success: false, message: 'You are the organiser of this trip.' });
      }

      // Prevent duplicate active requests
      const existingReq = await JoinRequest.findOne({
        trip: trip._id,
        user: req.user._id,
        status: { $in: ['pending', 'approved'] }
      });

      if (existingReq) {
        return res.status(400).json({
          success: false,
          message: `You already have an active (${existingReq.status}) request to join this trip.`
        });
      }

      // Check available seats
      if (trip.availableSeats !== undefined && trip.availableSeats < seats) {
        return res.status(400).json({
          success: false,
          message: `Trip capacity exceeded. Only ${trip.availableSeats} seat(s) remaining.`
        });
      }

      const organiserId = trip.organiserId || trip.createdBy;

      const request = await JoinRequest.create({
        trip: trip._id,
        tripType: 'normal',
        user: req.user._id,
        organiser: organiserId,
        seatsRequested: seats,
        message: message ? message.trim() : 'I would like to join this trip!',
        status: 'pending',
        requestedAt: new Date()
      });

      // Populate user info for broadcast
      await request.populate('user', 'name email avatar phone');
      await request.populate('trip', 'title destination startDate endDate price currency availableSeats capacity coverImage');

      // Notify all organisers
      const organisers = await User.find({ role: 'organiser' });
      for (const org of organisers) {
        await Notification.create({
          user: org._id,
          trip: trip._id,
          type: 'join_request',
          title: 'New Traveler Join Request',
          message: `${req.user.name} requested to join "${trip.title}" (${seats} seat${seats > 1 ? 's' : ''}).`,
          link: '#/organiser-requests'
        });
      }

      // Broadcast real-time event to all connected organiser dashboards
      if (req.io) {
        req.io.emit('join_request_created', {
          request,
          tripId: trip._id,
          tripType: 'normal',
          tripTitle: trip.title,
          userName: req.user.name,
          userAvatar: req.user.avatar,
          seatsRequested: seats,
          status: 'pending',
          requestedAt: request.requestedAt
        });

        // Also broadcast notification event for toaster
        req.io.emit('notification', {
          type: 'join_request',
          message: `New join request: ${req.user.name} for "${trip.title}"`,
          link: '#/organiser-requests'
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Your join request has been sent to the organisers for review!',
        request
      });
    }

    // 2. Handle Mystery Trip Join Request
    if (mysteryTrip.organiserId && mysteryTrip.organiserId.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You are the organiser of this mystery trip.' });
    }

    // Prevent duplicate active requests
    const existingMysteryReq = await JoinRequest.findOne({
      mysteryTrip: mysteryTrip._id,
      user: req.user._id,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingMysteryReq) {
      return res.status(400).json({
        success: false,
        message: `You already have an active (${existingMysteryReq.status}) request for this Mystery Trip.`
      });
    }

    // Check capacity
    if (mysteryTrip.availableSeats <= 0) {
      return res.status(400).json({
        success: false,
        message: 'This Mystery Trip has reached its maximum participant limit.'
      });
    }

    const mysteryJoinRequest = await JoinRequest.create({
      mysteryTrip: mysteryTrip._id,
      tripType: 'mystery',
      user: req.user._id,
      organiser: mysteryTrip.organiserId,
      seatsRequested: 1,
      message: message ? message.trim() : 'Excited to join this Mystery Trip adventure!',
      status: 'pending',
      requestedAt: new Date()
    });

    // Also update mysteryTrip participants array for backward compatibility
    const existingParticipant = (mysteryTrip.participants || []).find(
      p => p.user && p.user.toString() === req.user._id.toString()
    );
    if (!existingParticipant) {
      mysteryTrip.participants.push({
        user: req.user._id,
        status: 'pending',
        message: message ? message.trim() : 'Excited to join this Mystery Trip adventure!',
        requestedAt: new Date()
      });
      await mysteryTrip.save();
    }

    await mysteryJoinRequest.populate('user', 'name email avatar phone');
    await mysteryJoinRequest.populate('mysteryTrip', 'title destinationHint departureDate returnDate price currency availableSeats maxParticipants coverImage status isRevealed');

    // Notify all organisers
    const allOrganisers = await User.find({ role: 'organiser' });
    for (const org of allOrganisers) {
      await Notification.create({
        user: org._id,
        type: 'mystery_join_request',
        title: 'New Mystery Traveler Request',
        message: `${req.user.name} requested to join Mystery Expedition "${mysteryTrip.title}".`,
        link: '#/organiser-requests'
      });
    }

    // Broadcast real-time event to all connected organiser dashboards
    if (req.io) {
      req.io.emit('join_request_created', {
        request: mysteryJoinRequest,
        tripId: mysteryTrip._id,
        tripType: 'mystery',
        tripTitle: mysteryTrip.title,
        userName: req.user.name,
        userAvatar: req.user.avatar,
        seatsRequested: 1,
        status: 'pending',
        requestedAt: mysteryJoinRequest.requestedAt
      });

      req.io.emit('notification', {
        type: 'mystery_join_request',
        message: `New Mystery Miles request: ${req.user.name} for "${mysteryTrip.title}"`,
        link: '#/organiser-requests'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Your request for this Mystery Trip has been sent to the organisers for review!',
      request: mysteryJoinRequest
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all join requests for organisers (visible to all three organisers!)
 * GET /api/join-requests/organiser-requests
 */
async function getOrganiserJoinRequests(req, res, next) {
  try {
    const role = (req.user.role || '').toLowerCase();
    if (role !== 'organiser' && role !== 'organizer' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only Organisers can view incoming join requests.'
      });
    }

    // Fetch ALL join requests across both normal trips and mystery trips (shared with all three organisers)
    const requests = await JoinRequest.find({ status: { $ne: 'cancelled' } })
      .populate('user', 'name email avatar phone bio')
      .populate('trip', 'title destination startDate endDate price currency availableSeats capacity coverImage status')
      .populate('mysteryTrip', 'title destinationSecret destinationHint departureDate returnDate price currency availableSeats maxParticipants coverImage isRevealed status')
      .populate('organiser', 'name email avatar')
      .populate('reviewedBy', 'name email')
      .sort({ requestedAt: -1 });

    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const approvedCount = requests.filter(r => r.status === 'approved').length;
    const rejectedCount = requests.filter(r => r.status === 'rejected').length;

    res.json({
      success: true,
      count: requests.length,
      pendingCount,
      approvedCount,
      rejectedCount,
      requests
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get requests for a specific trip
 * GET /api/trips/:tripId/join-requests
 */
async function getTripJoinRequests(req, res, next) {
  try {
    const { tripId } = req.params;
    const isOrganiser = ['organiser', 'organizer', 'admin'].includes((req.user.role || '').toLowerCase());

    if (!isOrganiser) {
      return res.status(403).json({ success: false, message: 'Access denied: Only organisers can view trip join requests.' });
    }

    const requests = await JoinRequest.find({
      $or: [{ trip: tripId }, { mysteryTrip: tripId }],
      status: { $ne: 'cancelled' }
    })
      .populate('user', 'name email avatar phone bio')
      .sort({ requestedAt: -1 });

    res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current logged in user's submitted join requests (Both Normal & Mystery Trips)
 * GET /api/join-requests/my-requests
 */
async function getUserJoinRequests(req, res, next) {
  try {
    const rawRequests = await JoinRequest.find({
      user: req.user._id,
      status: { $ne: 'cancelled' }
    })
      .populate('trip', 'title destination startDate endDate price currency availableSeats capacity coverImage status')
      .populate('mysteryTrip', 'title destinationHint departureDate returnDate price currency availableSeats maxParticipants coverImage status isRevealed revealedAt destinationSecret')
      .populate('organiser', 'name email avatar')
      .populate('reviewedBy', 'name email')
      .sort({ requestedAt: -1 });

    // CRITICAL SECRECY ENFORCEMENT: Never reveal secret destination to user before official reveal!
    const sanitizedRequests = rawRequests.map(item => {
      const doc = item.toObject ? item.toObject() : { ...item };
      if (doc.mysteryTrip) {
        if (!doc.mysteryTrip.isRevealed) {
          doc.mysteryTrip.destinationSecret = null;
        }
      }
      return doc;
    });

    res.json({
      success: true,
      count: sanitizedRequests.length,
      requests: sanitizedRequests
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Organiser approves or rejects a join request (Both Normal & Mystery Trips)
 * PATCH /api/join-requests/:requestId
 */
async function respondToJoinRequest(req, res, next) {
  try {
    const { requestId } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected.' });
    }

    const isOrganiser = ['organiser', 'organizer', 'admin'].includes((req.user.role || '').toLowerCase());
    if (!isOrganiser) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only tour organisers can approve or reject join requests.'
      });
    }

    const request = await JoinRequest.findById(requestId)
      .populate('trip')
      .populate('mysteryTrip')
      .populate('user', 'name email');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Join request not found.' });
    }

    // Prevent duplicate conflicting status updates if already processed
    if (request.status === status) {
      return res.json({
        success: true,
        message: `Join request is already marked as ${status}.`,
        request
      });
    }

    const isMystery = request.tripType === 'mystery' || Boolean(request.mysteryTrip);
    const travelerId = request.user._id ? request.user._id : request.user;
    const travelerName = request.user.name || 'Traveler';

    // 1. Process Normal Trip Approval / Rejection
    if (!isMystery) {
      const trip = request.trip;
      if (!trip) {
        return res.status(404).json({ success: false, message: 'Associated trip not found.' });
      }

      if (status === 'approved') {
        const seatsNeeded = request.seatsRequested || 1;
        if (trip.availableSeats !== undefined && trip.availableSeats < seatsNeeded) {
          return res.status(400).json({
            success: false,
            message: `Cannot approve: Trip capacity reached. Only ${trip.availableSeats} seat(s) available, but ${seatsNeeded} requested.`
          });
        }

        // Decrement available seats
        if (trip.availableSeats !== undefined) {
          trip.availableSeats = Math.max(0, trip.availableSeats - seatsNeeded);
          await trip.save();
        }

        // Add user as accepted TripMember
        await TripMember.findOneAndUpdate(
          { trip: trip._id, user: travelerId },
          { role: 'viewer', status: 'accepted' },
          { upsert: true, new: true }
        );

        // Create notification for traveler
        await Notification.create({
          user: travelerId,
          trip: trip._id,
          type: 'join_approved',
          title: 'Trip Request Approved! 🎉',
          message: `Your request to join "${trip.title}" has been approved! Seat confirmed.`,
          link: `#/trips/${trip._id}`
        });
      } else if (status === 'rejected') {
        // If was previously approved and now rejected, restore seats
        if (request.status === 'approved') {
          const seatsToRestore = request.seatsRequested || 1;
          trip.availableSeats = Math.min(trip.capacity || 15, (trip.availableSeats || 0) + seatsToRestore);
          await trip.save();
          await TripMember.findOneAndDelete({ trip: trip._id, user: travelerId });
        }

        await Notification.create({
          user: travelerId,
          trip: trip._id,
          type: 'join_rejected',
          title: 'Trip Request Update',
          message: `Your request to join "${trip.title}" was not accepted. ${rejectionReason ? `Reason: ${rejectionReason}` : ''}`,
          link: '#/my-requests'
        });
      }
    }

    // 2. Process Mystery Trip Approval / Rejection
    if (isMystery) {
      const mysteryTrip = request.mysteryTrip;
      if (!mysteryTrip) {
        return res.status(404).json({ success: false, message: 'Associated Mystery Trip not found.' });
      }

      if (status === 'approved') {
        if (request.status !== 'approved') {
          if (mysteryTrip.availableSeats <= 0) {
            return res.status(400).json({
              success: false,
              message: 'Cannot approve: Mystery Trip capacity reached.'
            });
          }
          mysteryTrip.availableSeats = Math.max(0, mysteryTrip.availableSeats - 1);
        }

        // Update participants array in MysteryTrip
        const participant = (mysteryTrip.participants || []).find(
          p => p.user && p.user.toString() === travelerId.toString()
        );
        if (participant) {
          participant.status = 'approved';
          participant.approvedAt = new Date();
        } else {
          mysteryTrip.participants.push({
            user: travelerId,
            status: 'approved',
            approvedAt: new Date()
          });
        }
        await mysteryTrip.save();

        await Notification.create({
          user: travelerId,
          type: 'mystery_approved',
          title: 'Mystery Trip Approved! 🎟️',
          message: `Your request for Mystery Expedition "${mysteryTrip.title}" has been approved! Safe journey clues unlocked on your dashboard.`,
          link: '#/mystery-trips'
        });
      } else if (status === 'rejected') {
        if (request.status === 'approved') {
          mysteryTrip.availableSeats = Math.min(mysteryTrip.maxParticipants || 12, (mysteryTrip.availableSeats || 0) + 1);
        }

        const participant = (mysteryTrip.participants || []).find(
          p => p.user && p.user.toString() === travelerId.toString()
        );
        if (participant) {
          participant.status = 'rejected';
        }
        await mysteryTrip.save();

        await Notification.create({
          user: travelerId,
          type: 'mystery_rejected',
          title: 'Mystery Trip Update',
          message: `Your request for Mystery Expedition "${mysteryTrip.title}" could not be accommodated at this time.`,
          link: '#/my-requests'
        });
      }
    }

    // 3. Save Updated Status to JoinRequest (preserving request history)
    request.status = status;
    if (rejectionReason) request.rejectionReason = rejectionReason;
    request.reviewedAt = new Date();
    request.reviewedBy = req.user._id;
    await request.save();

    // 4. Broadcast Real-Time Update to ALL connected dashboards (Organisers & Traveler)
    if (req.io) {
      req.io.emit('join_request_updated', {
        requestId: request._id,
        status,
        rejectionReason: request.rejectionReason,
        reviewedBy: req.user.name,
        reviewedAt: request.reviewedAt,
        userId: travelerId.toString(),
        tripId: request.trip ? request.trip._id : (request.mysteryTrip ? request.mysteryTrip._id : null),
        tripType: isMystery ? 'mystery' : 'normal'
      });

      // Targeted notification event to requesting traveler
      req.io.emit('notification', {
        recipientId: travelerId.toString(),
        type: status === 'approved' ? 'join_approved' : 'join_rejected',
        message: status === 'approved'
          ? `Your join request has been approved! 🎉`
          : `Your join request was not accepted.`
      });
    }

    res.json({
      success: true,
      message: `Join request marked as ${status}.`,
      request
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Traveler cancels pending join request
 * DELETE /api/join-requests/:requestId
 */
async function cancelJoinRequest(req, res, next) {
  try {
    const { requestId } = req.params;

    const request = await JoinRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Join request not found.' });
    }

    if (request.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only cancel your own requests.' });
    }

    if (request.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'This request has already been approved. Please contact the trip organiser to cancel your reservation.'
      });
    }

    request.status = 'cancelled';
    await request.save();

    // If mystery trip, update participants array
    if (request.mysteryTrip) {
      await MysteryTrip.updateOne(
        { _id: request.mysteryTrip, 'participants.user': req.user._id },
        { $set: { 'participants.$.status': 'rejected' } }
      );
    }

    if (req.io) {
      req.io.emit('join_request_updated', {
        requestId: request._id,
        status: 'cancelled',
        userId: req.user._id.toString()
      });
    }

    res.json({
      success: true,
      message: 'Join request cancelled successfully.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createJoinRequest,
  getOrganiserJoinRequests,
  getTripJoinRequests,
  getUserJoinRequests,
  respondToJoinRequest,
  cancelJoinRequest
};
