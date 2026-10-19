const MysteryTrip = require('../models/MysteryTrip');
const JoinRequest = require('../models/JoinRequest');
const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Check and perform automatic scheduled reveals based on server time
 */
async function autoRevealExpiredSchedules() {
  try {
    const now = new Date();
    const expiredUnrevealed = await MysteryTrip.find({
      isRevealed: false,
      revealAt: { $lte: now },
      status: { $ne: 'cancelled' }
    });

    for (const trip of expiredUnrevealed) {
      trip.isRevealed = true;
      trip.revealedAt = now;
      trip.status = 'revealed';
      await trip.save();

      // Notify approved participants
      const approvedUsers = (trip.participants || [])
        .filter(p => p.status === 'approved')
        .map(p => p.user);

      for (const userId of approvedUsers) {
        await Notification.create({
          user: userId,
          type: 'mystery_reveal',
          title: 'Mystery Destination Revealed! 🌟',
          message: `The secret destination for "${trip.title}" has been revealed: ${trip.destinationSecret}! Check your dashboard to view the full itinerary.`,
          link: `#/mystery-trips/${trip._id}`
        });
      }
    }
  } catch (err) {
    console.error('[AutoReveal Error]:', err);
  }
}

/**
 * Sanitize Mystery Trip payload to prevent leaking destinationSecret to unauthorized users
 */
function sanitizeMysteryTrip(tripDoc, currentUserId, userRole) {
  const trip = tripDoc.toObject ? tripDoc.toObject() : tripDoc;
  const uid = currentUserId ? currentUserId.toString() : '';
  const orgId = trip.organiserId ? (trip.organiserId._id ? trip.organiserId._id.toString() : trip.organiserId.toString()) : '';
  const isOrganiserOwner = Boolean(uid && orgId && orgId === uid);
  const isAdmin = userRole === 'admin';

  // Check if current user is an approved participant
  const userParticipant = uid ? (trip.participants || []).find(
    p => p.user && (p.user._id ? p.user._id.toString() : p.user.toString()) === uid
  ) : null;
  const isApprovedParticipant = Boolean(userParticipant && userParticipant.status === 'approved');

  // If user is the owning organiser or admin, they can always view secret destination and full itinerary
  if (isOrganiserOwner || isAdmin) {
    return {
      ...trip,
      isOwner: true,
      canViewSecret: true,
      userJoinStatus: isOrganiserOwner ? 'owner' : (userParticipant ? userParticipant.status : null)
    };
  }

  // If trip is revealed:
  if (trip.isRevealed) {
    if (isApprovedParticipant) {
      // Approved participants get the fully unlocked destination and private itinerary
      return {
        ...trip,
        isOwner: false,
        canViewSecret: true,
        userJoinStatus: 'approved'
      };
    } else {
      // General users see the revealed destination name and public details
      return {
        ...trip,
        isOwner: false,
        canViewSecret: true,
        userJoinStatus: userParticipant ? userParticipant.status : null,
        // private detailed itinerary or accommodation might be reserved for approved travelers
        accommodationDetails: 'Available to approved travelers'
      };
    }
  }

  // If trip is NOT revealed yet: CRITICAL SECRECY ENFORCEMENT
  // Filter clues: only released clues are shown
  const visibleClues = (trip.clues || []).filter(c => c.isReleased);

  return {
    ...trip,
    destinationSecret: null,
    revealedCoverImage: null,
    itinerary: [], // Hide private itinerary
    accommodationDetails: 'Secret Accommodation (Revealed when countdown expires)',
    clues: isApprovedParticipant ? visibleClues : visibleClues.slice(0, 1), // Teaser clue for non-joined
    isOwner: false,
    canViewSecret: false,
    userJoinStatus: userParticipant ? userParticipant.status : null
  };
}

/**
 * Create Mystery Trip (Organiser only)
 * POST /api/mystery-trips
 */
async function createMysteryTrip(req, res, next) {
  try {
    const role = (req.user.role || '').toLowerCase();
    if (role !== 'organiser' && role !== 'organizer' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only users with the Organiser role can create Mystery Trips.'
      });
    }

    const {
      title,
      description,
      destinationSecret,
      destinationHint,
      coverImage,
      revealedCoverImage,
      departureDate,
      returnDate,
      budgetMin,
      budgetMax,
      maxParticipants,
      price,
      currency,
      revealAt,
      clues,
      itinerary,
      travelInstructions,
      accommodationDetails
    } = req.body;

    if (!title || !destinationSecret || !departureDate || !returnDate || !revealAt) {
      return res.status(400).json({
        success: false,
        message: 'Title, secret destination, departure date, return date, and reveal date/time are required.'
      });
    }

    const participantsLimit = Number(maxParticipants) || 12;

    const mysteryTrip = await MysteryTrip.create({
      title,
      description: description || 'Embark on an unforgettable mystery expedition. Pack your bags and trust the journey!',
      destinationSecret,
      destinationHint: destinationHint || 'A breathtaking retreat tucked away from the ordinary.',
      coverImage: coverImage || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
      revealedCoverImage: revealedCoverImage || 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80',
      departureDate,
      returnDate,
      budgetMin: Number(budgetMin) || 5000,
      budgetMax: Number(budgetMax) || 15000,
      maxParticipants: participantsLimit,
      availableSeats: participantsLimit,
      price: Number(price) || 8500,
      currency: currency || 'INR',
      organiserId: req.user._id,
      revealAt: new Date(revealAt),
      status: 'published',
      clues: Array.isArray(clues) ? clues : [
        { clueText: 'You will witness unforgettable sunrises and misty panoramic vistas.', isReleased: true },
        { clueText: 'Carry comfortable walking shoes and light sweaters.', isReleased: true }
      ],
      itinerary: Array.isArray(itinerary) ? itinerary : [],
      travelInstructions: travelInstructions || 'Pack light layers, comfortable hiking footwear, and your camera. Reporting point shared upon booking.',
      accommodationDetails: accommodationDetails || 'Eco-luxury mountain resort with scenic valley view cottages.'
    });

    res.status(201).json({
      success: true,
      message: 'Mystery Trip published successfully! Travelers can now request to join before the secret reveal.',
      mysteryTrip
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Browse all published mystery trips
 * GET /api/mystery-trips
 */
async function getMysteryTrips(req, res, next) {
  try {
    // Check for automatic reveal triggers
    await autoRevealExpiredSchedules();

    const query = { status: { $ne: 'cancelled' } };

    const trips = await MysteryTrip.find(query)
      .populate('organiserId', 'name email avatar')
      .populate('participants.user', 'name email avatar')
      .sort({ departureDate: 1 });

    const uid = req.user ? req.user._id : '';
    const role = req.user ? req.user.role : 'guest';
    const sanitizedTrips = trips.map(t => sanitizeMysteryTrip(t, uid, role));

    res.json({
      success: true,
      count: sanitizedTrips.length,
      mysteryTrips: sanitizedTrips
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single mystery trip details
 * GET /api/mystery-trips/:id
 */
async function getMysteryTripById(req, res, next) {
  try {
    await autoRevealExpiredSchedules();

    const trip = await MysteryTrip.findById(req.params.id)
      .populate('organiserId', 'name email avatar phone')
      .populate('participants.user', 'name email avatar phone bio');

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Mystery Trip not found.' });
    }

    const uid = req.user ? req.user._id : '';
    const role = req.user ? req.user.role : 'guest';
    const sanitized = sanitizeMysteryTrip(trip, uid, role);

    res.json({
      success: true,
      mysteryTrip: sanitized
    });
  } catch (error) {
    next(error);
  }
}

/**
 * User requests to join a Mystery Trip
 * POST /api/mystery-trips/:id/join-requests or POST /api/mystery-trips/:id/join
 */
async function requestToJoinMysteryTrip(req, res, next) {
  try {
    const trip = await MysteryTrip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Mystery Trip not found.' });
    }

    if (trip.organiserId && trip.organiserId.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You are the organiser of this mystery trip.' });
    }

    // Check existing participant request in JoinRequest OR participants array
    const existingJoinReq = await JoinRequest.findOne({
      mysteryTrip: trip._id,
      user: req.user._id,
      status: { $in: ['pending', 'approved'] }
    });

    const existingPart = (trip.participants || []).find(
      p => p.user && p.user.toString() === req.user._id.toString() && ['pending', 'approved'].includes(p.status)
    );

    if (existingJoinReq || existingPart) {
      const activeStatus = existingJoinReq ? existingJoinReq.status : existingPart.status;
      return res.status(400).json({
        success: false,
        message: `You already have an active (${activeStatus}) reservation for this Mystery Trip.`
      });
    }

    // Check available seats
    if (trip.availableSeats <= 0) {
      return res.status(400).json({
        success: false,
        message: 'This Mystery Trip has reached its maximum participant limit.'
      });
    }

    const { message } = req.body;

    // Create formal JoinRequest record
    const joinReq = await JoinRequest.create({
      mysteryTrip: trip._id,
      tripType: 'mystery',
      user: req.user._id,
      organiser: trip.organiserId,
      seatsRequested: 1,
      message: message ? message.trim() : 'Excited to join this Mystery Trip adventure!',
      status: 'pending',
      requestedAt: new Date()
    });

    // Also update participants array for backwards-compatibility
    trip.participants.push({
      user: req.user._id,
      status: 'pending',
      message: message ? message.trim() : 'Excited to join this Mystery Trip adventure!',
      requestedAt: new Date()
    });

    await trip.save();

    await joinReq.populate('user', 'name email avatar phone');
    await joinReq.populate('mysteryTrip', 'title destinationHint departureDate returnDate price currency availableSeats maxParticipants coverImage status isRevealed');

    // Notify all three organisers
    const allOrganisers = await User.find({ role: 'organiser' });
    for (const org of allOrganisers) {
      await Notification.create({
        user: org._id,
        type: 'mystery_join_request',
        title: 'New Mystery Traveler Request',
        message: `${req.user.name} requested to join Mystery Trip "${trip.title}".`,
        link: '#/organiser-requests'
      });
    }

    // Broadcast real-time event to all connected organiser dashboards
    if (req.io) {
      req.io.emit('join_request_created', {
        request: joinReq,
        tripId: trip._id,
        tripType: 'mystery',
        tripTitle: trip.title,
        userName: req.user.name,
        userAvatar: req.user.avatar,
        seatsRequested: 1,
        status: 'pending',
        requestedAt: joinReq.requestedAt
      });

      req.io.emit('notification', {
        type: 'mystery_join_request',
        message: `New Mystery Miles request: ${req.user.name} for "${trip.title}"`,
        link: '#/organiser-requests'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Your join request for this Mystery Trip has been sent to the organisers for review!',
      request: joinReq,
      status: 'pending'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Organiser approves or rejects a Mystery Trip participant request
 * PATCH /api/mystery-trips/:id/join-requests/:requestId
 */
async function reviewMysteryJoinRequest(req, res, next) {
  try {
    const { id, requestId } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected.' });
    }

    const isOrganiser = ['organiser', 'organizer', 'admin'].includes((req.user.role || '').toLowerCase());
    if (!isOrganiser) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only tour organisers can review join requests.'
      });
    }

    const trip = await MysteryTrip.findById(id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Mystery Trip not found.' });
    }

    // Find participant in trip or JoinRequest
    let participant = trip.participants.id(requestId);
    let joinReq = await JoinRequest.findById(requestId);

    if (!participant && joinReq) {
      participant = (trip.participants || []).find(
        p => p.user && p.user.toString() === joinReq.user.toString()
      );
    } else if (participant && !joinReq) {
      joinReq = await JoinRequest.findOne({
        mysteryTrip: id,
        user: participant.user
      });
    }

    if (!participant && !joinReq) {
      return res.status(404).json({ success: false, message: 'Participant request not found.' });
    }

    const userId = participant ? participant.user : joinReq.user;

    if (status === 'approved') {
      if ((participant && participant.status !== 'approved') || (joinReq && joinReq.status !== 'approved')) {
        if (trip.availableSeats <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Trip capacity reached. Cannot approve more participants.'
          });
        }
        trip.availableSeats = Math.max(0, trip.availableSeats - 1);
        if (participant) participant.approvedAt = new Date();
      }

      await Notification.create({
        user: userId,
        type: 'mystery_approved',
        title: 'Mystery Trip Request Approved! 🎟️',
        message: `You are confirmed for "${trip.title}"! Clues are now unlocked on your dashboard.`,
        link: `#/mystery-trips/${trip._id}`
      });
    } else if (status === 'rejected') {
      if ((participant && participant.status === 'approved') || (joinReq && joinReq.status === 'approved')) {
        trip.availableSeats = Math.min(trip.maxParticipants, trip.availableSeats + 1);
      }

      await Notification.create({
        user: userId,
        type: 'mystery_rejected',
        title: 'Mystery Trip Request Update',
        message: `Your request to join "${trip.title}" could not be accommodated at this time.`,
        link: `#/my-requests`
      });
    }

    if (participant) {
      participant.status = status;
    }
    await trip.save();

    if (joinReq) {
      joinReq.status = status;
      joinReq.reviewedAt = new Date();
      joinReq.reviewedBy = req.user._id;
      await joinReq.save();
    }

    // Broadcast real-time update
    if (req.io) {
      req.io.emit('join_request_updated', {
        requestId: joinReq ? joinReq._id : requestId,
        status,
        reviewedBy: req.user.name,
        reviewedAt: new Date(),
        userId: userId.toString(),
        tripId: trip._id,
        tripType: 'mystery'
      });

      req.io.emit('notification', {
        recipientId: userId.toString(),
        type: status === 'approved' ? 'mystery_approved' : 'mystery_rejected',
        message: status === 'approved'
          ? `Your Mystery Miles request for "${trip.title}" has been approved! 🎟️`
          : `Your Mystery Miles request for "${trip.title}" was not accepted.`
      });
    }

    res.json({
      success: true,
      message: `Participant request ${status} successfully!`,
      trip: sanitizeMysteryTrip(trip, req.user._id, req.user.role)
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Organiser manually reveals the surprise destination
 * POST /api/mystery-trips/:id/reveal
 */
async function revealDestination(req, res, next) {
  try {
    const { id } = req.params;
    const isOrganiser = ['organiser', 'organizer', 'admin'].includes((req.user.role || '').toLowerCase());
    if (!isOrganiser) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only tour organisers can reveal the destination.'
      });
    }

    const trip = await MysteryTrip.findById(id);

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Mystery Trip not found.' });
    }

    trip.isRevealed = true;
    trip.revealedAt = new Date();
    trip.status = 'revealed';
    await trip.save();

    // Create notifications for all approved participants
    const approvedUsers = (trip.participants || [])
      .filter(p => p.status === 'approved')
      .map(p => p.user);

    for (const userId of approvedUsers) {
      await Notification.create({
        user: userId,
        type: 'mystery_reveal',
        title: 'Destination Unlocked! 🎉',
        message: `Surprise! "${trip.title}" is heading to ${trip.destinationSecret}! The complete itinerary is now ready.`,
        link: `#/mystery-trips/${trip._id}`
      });
    }

    res.json({
      success: true,
      message: `Surprise destination officially revealed as ${trip.destinationSecret}!`,
      destinationSecret: trip.destinationSecret,
      revealedAt: trip.revealedAt,
      trip: sanitizeMysteryTrip(trip, req.user._id, req.user.role)
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add or release a clue for approved travelers
 * POST /api/mystery-trips/:id/clues
 */
async function addMysteryClue(req, res, next) {
  try {
    const { id } = req.params;
    const { clueText, isReleased } = req.body;

    if (!clueText) {
      return res.status(400).json({ success: false, message: 'Clue text is required.' });
    }

    const trip = await MysteryTrip.findById(id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Mystery Trip not found.' });
    }

    if (trip.organiserId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied: Only trip owner can add clues.' });
    }

    trip.clues.push({
      clueText: clueText.trim(),
      releaseDate: new Date(),
      isReleased: isReleased !== false
    });

    await trip.save();

    res.status(201).json({
      success: true,
      message: 'New clue added to Mystery Trip!',
      clues: trip.clues
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update mystery trip details (Organiser only)
 * PATCH /api/mystery-trips/:id
 */
async function updateMysteryTrip(req, res, next) {
  try {
    const { id } = req.params;
    const trip = await MysteryTrip.findById(id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Mystery Trip not found.' });
    }

    if (trip.organiserId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied: Only the organiser can edit this trip.' });
    }

    const {
      title, description, destinationSecret, destinationHint,
      departureDate, returnDate, budgetMin, budgetMax, maxParticipants,
      price, revealAt, travelInstructions, accommodationDetails, status
    } = req.body;

    if (title) trip.title = title;
    if (description !== undefined) trip.description = description;
    if (destinationSecret) trip.destinationSecret = destinationSecret;
    if (destinationHint !== undefined) trip.destinationHint = destinationHint;
    if (departureDate) trip.departureDate = departureDate;
    if (returnDate) trip.returnDate = returnDate;
    if (budgetMin !== undefined) trip.budgetMin = Number(budgetMin);
    if (budgetMax !== undefined) trip.budgetMax = Number(budgetMax);
    if (price !== undefined) trip.price = Number(price);
    if (revealAt) trip.revealAt = new Date(revealAt);
    if (travelInstructions !== undefined) trip.travelInstructions = travelInstructions;
    if (accommodationDetails !== undefined) trip.accommodationDetails = accommodationDetails;
    if (status) trip.status = status;

    if (maxParticipants !== undefined) {
      const oldMax = trip.maxParticipants || 12;
      const newMax = Number(maxParticipants);
      trip.maxParticipants = newMax;
      trip.availableSeats = Math.max(0, (trip.availableSeats || 0) + (newMax - oldMax));
    }

    await trip.save();

    res.json({
      success: true,
      message: 'Mystery Trip updated successfully!',
      mysteryTrip: sanitizeMysteryTrip(trip, req.user._id, req.user.role)
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete or cancel Mystery Trip
 * DELETE /api/mystery-trips/:id
 */
async function deleteMysteryTrip(req, res, next) {
  try {
    const { id } = req.params;
    const trip = await MysteryTrip.findById(id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Mystery Trip not found.' });
    }

    if (trip.organiserId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied: Only the organiser can delete this trip.' });
    }

    await MysteryTrip.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Mystery Trip removed successfully.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createMysteryTrip,
  getMysteryTrips,
  getMysteryTripById,
  requestToJoinMysteryTrip,
  reviewMysteryJoinRequest,
  revealDestination,
  addMysteryClue,
  updateMysteryTrip,
  deleteMysteryTrip,
  sanitizeMysteryTrip,
  autoRevealExpiredSchedules
};

