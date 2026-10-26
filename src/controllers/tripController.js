const User = require('../models/User');
const Trip = require('../models/Trip');
const TripMember = require('../models/TripMember');
const JoinRequest = require('../models/JoinRequest');
const ItineraryActivity = require('../models/ItineraryActivity');
const PackingItem = require('../models/PackingItem');
const BookingDocument = require('../models/BookingDocument');
const Expense = require('../models/Expense');
const Notification = require('../models/Notification');
const { resolveDestinationImage, isGenericPlaceholder } = require('../utils/destinationImages');
const { recommendTrips } = require('../utils/tripRecommender');

/**
 * Calculate dynamic Trip Readiness Checklist metrics
 * @param {String} tripId 
 * @param {Object} trip 
 */
async function computeTripReadiness(tripId, trip) {
  const durationDays = trip.durationDays || 1;

  // 1. Itinerary Readiness
  const activities = await ItineraryActivity.find({ trip: tripId, isMissed: false });
  const uniqueDaysWithActivities = new Set(activities.map(a => a.dayNumber)).size;
  const itineraryScore = Math.min(100, Math.round((uniqueDaysWithActivities / durationDays) * 100));

  // 2. Packing Readiness
  const packingItems = await PackingItem.find({ trip: tripId });
  const packedCount = packingItems.filter(p => p.isPacked).length;
  const packingScore = packingItems.length > 0 ? Math.round((packedCount / packingItems.length) * 100) : 0;

  // 3. Booking Documents Readiness
  const bookings = await BookingDocument.find({ trip: tripId });
  const bookingScore = bookings.length >= 2 ? 100 : bookings.length === 1 ? 60 : 0;

  // 4. Emergency Contacts Readiness
  const hasEmergencyContact = trip.emergencyContacts && trip.emergencyContacts.length > 0;
  const emergencyScore = hasEmergencyContact ? 100 : 0;

  // 5. Team / Collaboration Readiness
  const members = await TripMember.find({ trip: tripId, status: 'accepted' });
  const teamScore = members.length >= 1 ? 100 : 50;

  // Weighted total: Itinerary (30%), Packing (25%), Bookings (20%), Emergency (15%), Team (10%)
  const totalReadiness = Math.round(
    itineraryScore * 0.30 +
    packingScore * 0.25 +
    bookingScore * 0.20 +
    emergencyScore * 0.15 +
    teamScore * 0.10
  );

  return {
    score: totalReadiness,
    breakdown: {
      itinerary: { score: itineraryScore, detail: `${activities.length} activities scheduled across ${uniqueDaysWithActivities}/${durationDays} days` },
      packing: { score: packingScore, detail: `${packedCount}/${packingItems.length} items packed` },
      bookings: { score: bookingScore, detail: `${bookings.length} reservations confirmed` },
      emergency: { score: emergencyScore, detail: hasEmergencyContact ? `${trip.emergencyContacts.length} emergency contacts configured` : 'No emergency contacts added yet' },
      team: { score: teamScore, detail: `${members.length} member(s) confirmed on trip` }
    }
  };
}

/**
 * Create a new trip
 * POST /api/trips
 */
async function createTrip(req, res, next) {
  try {
    // IMPORTANT BUSINESS RULE: Only Organisers can create trips
    const role = (req.user.role || '').toLowerCase();
    if (role !== 'organiser' && role !== 'organizer' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only users with the Organiser role can create trips.'
      });
    }

    const {
      title,
      destination,
      description,
      startDate,
      endDate,
      estimatedBudget,
      currency,
      coverImage,
      tags,
      emergencyContacts,
      capacity,
      price,
      joiningDeadline,
      isPublished,
      publicationStatus,
      status: inputStatus
    } = req.body;

    if (!title || !destination || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Title, destination, start date, and end date are required.'
      });
    }

    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be earlier than start date.'
      });
    }

    // Determine publication state
    let tripIsPublished = true;
    if (isPublished !== undefined) {
      tripIsPublished = Boolean(isPublished);
    } else if (publicationStatus !== undefined) {
      tripIsPublished = (publicationStatus || '').toLowerCase() === 'published';
    }
    const tripPublicationStatus = tripIsPublished ? 'Published' : 'Draft';

    // Auto set status based on dates unless specific status was provided
    let status = 'upcoming';
    if (inputStatus && ['upcoming', 'ongoing', 'completed', 'cancelled'].includes(inputStatus.toLowerCase())) {
      status = inputStatus.toLowerCase();
    } else {
      const now = new Date();
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (now >= start && now <= end) status = 'ongoing';
      if (now > end) status = 'completed';
    }

    const tripCapacity = Number(capacity) || 15;

    const trip = await Trip.create({
      title,
      destination,
      description: description || '',
      startDate,
      endDate,
      estimatedBudget: Number(estimatedBudget) || 1000,
      price: Number(price) || Number(estimatedBudget) || 1000,
      capacity: tripCapacity,
      availableSeats: tripCapacity,
      joiningDeadline: joiningDeadline || null,
      currency: currency || req.user.preferences?.currency || 'USD',
      coverImage: (coverImage && !isGenericPlaceholder(coverImage)) ? coverImage : resolveDestinationImage(destination, title),
      status,
      isPublished: tripIsPublished,
      publicationStatus: tripPublicationStatus,
      tags: tags || ['Vacation'],
      emergencyContacts: emergencyContacts || (req.user.emergencyContact?.name ? [req.user.emergencyContact] : []),
      createdBy: req.user._id,
      organiserId: req.user._id
    });

    // Create Owner membership record
    await TripMember.create({
      trip: trip._id,
      user: req.user._id,
      role: 'owner',
      status: 'accepted'
    });

    await trip.populate('createdBy', 'name email avatar phone');
    await trip.populate('organiserId', 'name email avatar phone');

    // Broadcast real-time event to all connected travelers and organisers
    if (req.io && trip.isPublished) {
      req.io.emit('trip_published', {
        tripId: trip._id,
        trip,
        organiserId: req.user._id,
        organiserName: req.user.name,
        publishedAt: new Date()
      });
      req.io.emit('notification', {
        type: 'general',
        message: `New expedition published: "${trip.title}" to ${trip.destination}!`,
        link: '#/explore-trips'
      });
    }

    res.status(201).json({
      success: true,
      message: `Expedition "${trip.title}" created and published successfully!`,
      trip
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all trips: published expeditions, user enrolled trips, or organiser workspace trips
 * GET /api/trips?status=all|upcoming|ongoing|completed|published|draft&q=search&explore=true|false&myTrips=true|false
 */
async function getTrips(req, res, next) {
  try {
    const { status, q, explore, myTrips, publicationStatus, isPublished } = req.query;
    const isExplore = explore === 'true';

    // Comprehensive filter for published and available trips:
    // Matches if isPublished is true, publicationStatus is Published/published, or status is published/Published
    // Strictly excludes draft, unpublished, and cancelled trips
    const publishedFilter = {
      $and: [
        {
          $or: [
            { isPublished: true },
            { publicationStatus: { $in: ['Published', 'published'] } },
            { status: { $in: ['published', 'Published'] } }
          ]
        },
        { isPublished: { $ne: false } },
        { publicationStatus: { $nin: ['Draft', 'draft', 'Unpublished', 'unpublished'] } },
        { status: { $nin: ['cancelled', 'draft', 'Draft'] } }
      ]
    };

    let query = {};
    const role = (req.user?.role || '').toLowerCase();
    const isOrganiserUser = ['organiser', 'organizer', 'admin'].includes(role);
    const now = new Date();

    if (isExplore) {
      // 1. Explicit explore directory query: All published trips from ANY of the organisers
      query = { ...publishedFilter };
      if (status && status !== 'all') {
        const lower = status.toLowerCase();
        if (lower === 'upcoming') {
          query.$or = [{ startDate: { $gt: now } }, { $and: [{ endDate: { $gte: now } }, { status: 'upcoming' }] }];
          query.status = { $nin: ['completed', 'cancelled', 'ongoing'] };
        } else if (lower === 'completed') {
          query.$or = [{ endDate: { $lt: now } }, { status: 'completed' }];
          query.status = { $ne: 'cancelled' };
        } else if (lower === 'ongoing') {
          query.$or = [
            { status: 'ongoing' },
            { $and: [{ startDate: { $lte: now } }, { endDate: { $gte: now } }] }
          ];
          query.status = { $nin: ['completed', 'cancelled'] };
        }
      }
    } else if (isOrganiserUser) {
      // 2. Organiser workspace & dashboard: Trips created and managed by this organiser
      const organiserScope = { $or: [{ createdBy: req.user._id }, { organiserId: req.user._id }] };
      const conditions = [organiserScope];

      if (status && status !== 'all') {
        const lower = status.toLowerCase();
        if (lower === 'upcoming') {
          conditions.push({
            $or: [{ startDate: { $gt: now } }, { $and: [{ endDate: { $gte: now } }, { status: 'upcoming' }] }],
            status: { $nin: ['completed', 'cancelled', 'ongoing'] }
          });
        } else if (lower === 'completed') {
          conditions.push({
            $or: [{ endDate: { $lt: now } }, { status: 'completed' }],
            status: { $ne: 'cancelled' }
          });
        } else if (lower === 'ongoing') {
          conditions.push({
            $or: [
              { status: 'ongoing' },
              { $and: [{ startDate: { $lte: now } }, { endDate: { $gte: now } }] }
            ],
            status: { $nin: ['completed', 'cancelled'] }
          });
        } else if (lower === 'draft') {
          conditions.push({ publicationStatus: { $in: ['Draft', 'draft', 'Unpublished', 'unpublished'] } });
        } else if (lower === 'published') {
          conditions.push({ publicationStatus: { $in: ['Published', 'published'] } });
        }
      } else {
        conditions.push({ status: { $ne: 'cancelled' } });
      }

      query = { $and: conditions };
    } else if (req.user) {
      // 3. Regular traveler / user: My Trips
      // Displays trips the user has joined or been approved to attend
      // Never display pending join requests as confirmed trips!
      const acceptedMemberships = await TripMember.find({ user: req.user._id, status: 'accepted' }).select('trip');
      const approvedRequests = await JoinRequest.find({ user: req.user._id, status: 'approved' }).select('trip');
      const joinedTripIdSet = new Set([
        ...acceptedMemberships.map(m => m.trip ? m.trip.toString() : null),
        ...approvedRequests.map(r => r.trip ? r.trip.toString() : null)
      ]);
      joinedTripIdSet.delete(null);
      const joinedTripIds = Array.from(joinedTripIdSet);

      if (joinedTripIds.length === 0) {
        query = { _id: { $in: [] } };
      } else if (status === 'upcoming') {
        query = {
          _id: { $in: joinedTripIds },
          $or: [
            { startDate: { $gt: now } },
            { $and: [{ endDate: { $gte: now } }, { status: 'upcoming' }] }
          ],
          status: { $nin: ['completed', 'cancelled', 'ongoing'] }
        };
      } else if (status === 'completed') {
        query = {
          _id: { $in: joinedTripIds },
          $or: [{ endDate: { $lt: now } }, { status: 'completed' }],
          status: { $ne: 'cancelled' }
        };
      } else if (status === 'ongoing') {
        query = {
          _id: { $in: joinedTripIds },
          $or: [
            { status: 'ongoing' },
            { $and: [{ startDate: { $lte: now } }, { endDate: { $gte: now } }] }
          ],
          status: { $nin: ['completed', 'cancelled'] }
        };
      } else {
        // status === 'all' or default: includes both upcoming and completed joined trips
        query = {
          _id: { $in: joinedTripIds },
          status: { $ne: 'cancelled' }
        };
      }
    } else {
      // Unauthenticated visitor
      query = { ...publishedFilter };
    }

    // Handle publication status overrides if passed
    if (publicationStatus) {
      if (publicationStatus.toLowerCase() === 'published') {
        if (query.$and) {
          query.$and.push(publishedFilter);
        } else {
          query = { $and: [query, publishedFilter] };
        }
      } else if (['draft', 'unpublished'].includes(publicationStatus.toLowerCase())) {
        query.publicationStatus = { $in: ['Draft', 'draft', 'Unpublished', 'unpublished'] };
      }
    }

    if (isPublished !== undefined) {
      const wantsPublished = String(isPublished) === 'true';
      if (wantsPublished) {
        if (query.$and) {
          query.$and.push(publishedFilter);
        } else {
          query = { $and: [query, publishedFilter] };
        }
      } else {
        query.isPublished = false;
      }
    }

    // Handle search query q
    if (q) {
      const searchRegex = new RegExp(q, 'i');
      const searchCondition = {
        $or: [
          { title: { $regex: q, $options: 'i' } },
          { destination: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { tags: { $in: [searchRegex] } }
        ]
      };
      if (query.$and) {
        query.$and.push(searchCondition);
      } else {
        query = { $and: [query, searchCondition] };
      }
    }

    const trips = await Trip.find(query)
      .populate('createdBy', 'name email avatar')
      .populate('organiserId', 'name email avatar')
      .sort({ startDate: 1 });

    const uid = req.user ? req.user._id.toString() : '';
    const memberships = req.user ? await TripMember.find({ user: req.user._id, status: 'accepted' }) : [];
    const userRequests = req.user ? await JoinRequest.find({ user: req.user._id }) : [];

    // Attach membership role, member count, dynamic date status, and join request state
    const tripsWithMeta = await Promise.all(
      trips.map(async trip => {
        let dynamicStatus = trip.status;
        if (dynamicStatus !== 'cancelled') {
          const start = new Date(trip.startDate);
          const end = new Date(trip.endDate);
          if (now > end) {
            dynamicStatus = 'completed';
          } else if (now >= start && now <= end) {
            dynamicStatus = 'ongoing';
          } else {
            dynamicStatus = 'upcoming';
          }
        }

        const mem = memberships.find(m => m.trip.toString() === trip._id.toString());
        const reqItem = userRequests.find(r => r.trip && r.trip.toString() === trip._id.toString() && r.status !== 'cancelled');
        const memberCount = await TripMember.countDocuments({ trip: trip._id, status: 'accepted' });
        const expenses = await Expense.find({ trip: trip._id });
        const totalActualExpense = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

        return {
          ...trip.toJSON(),
          status: dynamicStatus,
          userRole: mem ? mem.role : (uid && (trip.createdBy?._id?.toString() === uid || trip.organiserId?._id?.toString() === uid) ? 'owner' : 'none'),
          isMember: !!mem,
          joinRequestStatus: reqItem ? reqItem.status : null,
          joinRequestId: reqItem ? reqItem._id : null,
          memberCount,
          totalActualExpense: Math.round(totalActualExpense * 100) / 100
        };
      })
    );

    res.json({
      success: true,
      count: tripsWithMeta.length,
      trips: tripsWithMeta
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single trip details with readiness analysis or public visitor view
 * GET /api/trips/:tripId
 */
async function getTripById(req, res, next) {
  try {
    const trip = await Trip.findById(req.params.tripId)
      .populate('createdBy', 'name email avatar phone')
      .populate('organiserId', 'name email avatar phone');

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found.' });
    }

    const uid = req.user ? req.user._id : null;
    const uidStr = uid ? uid.toString() : '';
    const creatorStr = (trip.createdBy?._id || trip.createdBy)?.toString() || '';
    const organiserStr = (trip.organiserId?._id || trip.organiserId)?.toString() || '';
    const isOwner = Boolean(uidStr && (creatorStr === uidStr || organiserStr === uidStr));

    const membership = uid ? await TripMember.findOne({ trip: trip._id, user: uid, status: 'accepted' }) : null;
    const userJoinRequest = uid ? await JoinRequest.findOne({ trip: trip._id, user: uid, status: { $ne: 'cancelled' } }) : null;

    // Check if trip is published
    const isPublished = trip.isPublished === true || 
                        (trip.publicationStatus && trip.publicationStatus.toLowerCase() === 'published') ||
                        (trip.status && trip.status.toLowerCase() === 'published');

    const activities = await ItineraryActivity.find({ trip: trip._id }).sort({ dayNumber: 1, startTime: 1 });

    // Dynamic date status
    const now = new Date();
    let dynamicStatus = trip.status;
    if (dynamicStatus !== 'cancelled') {
      const start = new Date(trip.startDate);
      const end = new Date(trip.endDate);
      if (now > end) {
        dynamicStatus = 'completed';
      } else if (now >= start && now <= end) {
        dynamicStatus = 'ongoing';
      } else {
        dynamicStatus = 'upcoming';
      }
    }

    // If not a member and not owner:
    if (!membership && !isOwner) {
      // If trip is published, allow public exploration view so user can view details and request to join
      if (isPublished) {
        const publicActivities = activities.map(a => ({
          _id: a._id,
          dayNumber: a.dayNumber,
          title: a.title,
          category: a.category,
          startTime: a.startTime,
          endTime: a.endTime,
          location: a.location,
          description: a.description
        }));
        return res.json({
          success: true,
          trip: {
            ...trip.toJSON(),
            status: dynamicStatus,
            userRole: 'none',
            isMember: false,
            isOwner: false,
            isPublicView: true,
            joinRequestStatus: userJoinRequest ? userJoinRequest.status : null,
            joinRequestId: userJoinRequest ? userJoinRequest._id : null,
            activities: publicActivities,
            members: []
          }
        });
      }

      return res.status(403).json({ success: false, message: 'Access denied: This expedition is currently unpublished or in draft mode.' });
    }

    const members = await TripMember.find({ trip: trip._id, status: 'accepted' })
      .populate('user', 'name email avatar phone bio')
      .sort({ createdAt: 1 });

    const readiness = await computeTripReadiness(trip._id, trip);
    const expenses = await Expense.find({ trip: trip._id });
    const totalActualExpense = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Save latest readiness score on trip record
    trip.readinessScore = readiness.score;
    await trip.save();

    res.json({
      success: true,
      trip: {
        ...trip.toJSON(),
        status: dynamicStatus,
        userRole: membership ? membership.role : 'owner',
        isMember: true,
        isOwner,
        joinRequestStatus: userJoinRequest ? userJoinRequest.status : null,
        members,
        activities,
        totalActualExpense: Math.round(totalActualExpense * 100) / 100,
        readiness
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update trip (Organiser only)
 * PUT /api/trips/:tripId
 */
async function updateTrip(req, res, next) {
  try {
    const role = (req.user.role || '').toLowerCase();
    if (role !== 'organiser' && role !== 'organizer' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Regular users cannot edit trips.'
      });
    }

    const trip = req.trip || await Trip.findById(req.params.tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found.' });
    }

    const isCreator = trip.createdBy.toString() === req.user._id.toString() ||
                      (trip.organiserId && trip.organiserId.toString() === req.user._id.toString());

    if (!isCreator && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the organiser who created this trip can edit it.'
      });
    }

    const {
      title, destination, description, startDate, endDate, estimatedBudget,
      currency, coverImage, status, tags, emergencyContacts, capacity, price,
      availableSeats, joiningDeadline, isPublished, publicationStatus
    } = req.body;

    const oldIsPublished = trip.isPublished;

    if (title) trip.title = title;
    if (destination) trip.destination = destination;
    if (description !== undefined) trip.description = description;
    if (startDate) trip.startDate = startDate;
    if (endDate) trip.endDate = endDate;
    if (estimatedBudget !== undefined) trip.estimatedBudget = Number(estimatedBudget);
    if (price !== undefined) trip.price = Number(price);
    if (capacity !== undefined) {
      const oldCapacity = trip.capacity || 15;
      const newCapacity = Number(capacity);
      trip.capacity = newCapacity;
      // Adjust availableSeats proportionally
      if (trip.availableSeats !== undefined) {
        trip.availableSeats = Math.max(0, trip.availableSeats + (newCapacity - oldCapacity));
      }
    }
    if (availableSeats !== undefined) trip.availableSeats = Number(availableSeats);
    if (joiningDeadline !== undefined) trip.joiningDeadline = joiningDeadline;
    if (isPublished !== undefined) {
      trip.isPublished = Boolean(isPublished);
      trip.publicationStatus = trip.isPublished ? 'Published' : 'Draft';
    }
    if (publicationStatus !== undefined) {
      const isPub = (publicationStatus || '').toLowerCase() === 'published';
      trip.isPublished = isPub;
      trip.publicationStatus = isPub ? 'Published' : 'Draft';
    }
    if (currency) trip.currency = currency;
    if (coverImage) trip.coverImage = coverImage;
    if (status) trip.status = status;
    if (tags) trip.tags = tags;
    if (emergencyContacts) trip.emergencyContacts = emergencyContacts;

    await trip.save();

    // Broadcast publish/unpublish changes if status toggled
    if (req.io && oldIsPublished !== trip.isPublished) {
      if (trip.isPublished) {
        req.io.emit('trip_published', {
          tripId: trip._id,
          trip,
          organiserId: req.user._id,
          organiserName: req.user.name,
          publishedAt: new Date()
        });
      } else {
        req.io.emit('trip_unpublished', { tripId: trip._id });
      }
    }

    res.json({
      success: true,
      message: 'Trip updated successfully!',
      trip
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Publish trip (Organiser only)
 * POST or PATCH /api/trips/:tripId/publish
 */
async function publishTrip(req, res, next) {
  try {
    const role = (req.user.role || '').toLowerCase();
    const isOrganiser = ['organiser', 'organizer', 'admin'].includes(role);
    if (!isOrganiser) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only tour organisers can publish trips.'
      });
    }

    const trip = await Trip.findById(req.params.tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found.' });
    }

    const isCreator = (trip.createdBy && trip.createdBy.toString() === req.user._id.toString()) ||
                      (trip.organiserId && trip.organiserId.toString() === req.user._id.toString());
    if (!isCreator && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the organiser who created this trip can publish it.'
      });
    }

    trip.isPublished = true;
    trip.publicationStatus = 'Published';
    if (!trip.organiserId) {
      trip.organiserId = req.user._id;
    }
    if (trip.status === 'draft' || trip.status === 'Draft') {
      trip.status = 'upcoming';
    }

    await trip.save();
    await trip.populate('createdBy', 'name email avatar phone');
    await trip.populate('organiserId', 'name email avatar phone');

    // Broadcast real-time event to all connected users
    if (req.io) {
      req.io.emit('trip_published', {
        tripId: trip._id,
        trip,
        organiserId: req.user._id,
        organiserName: req.user.name,
        publishedAt: new Date()
      });
      req.io.emit('notification', {
        type: 'general',
        message: `New expedition published: "${trip.title}" to ${trip.destination}!`,
        link: '#/explore-trips'
      });
    }

    res.json({
      success: true,
      message: `Expedition "${trip.title}" published successfully!`,
      trip
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Unpublish / Draft trip (Organiser only)
 * POST or PATCH /api/trips/:tripId/unpublish
 */
async function unpublishTrip(req, res, next) {
  try {
    const role = (req.user.role || '').toLowerCase();
    const isOrganiser = ['organiser', 'organizer', 'admin'].includes(role);
    if (!isOrganiser) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only tour organisers can unpublish trips.'
      });
    }

    const trip = await Trip.findById(req.params.tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found.' });
    }

    const isCreator = (trip.createdBy && trip.createdBy.toString() === req.user._id.toString()) ||
                      (trip.organiserId && trip.organiserId.toString() === req.user._id.toString());
    if (!isCreator && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the organiser who created this trip can unpublish it.'
      });
    }

    trip.isPublished = false;
    trip.publicationStatus = 'Draft';
    await trip.save();

    if (req.io) {
      req.io.emit('trip_unpublished', {
        tripId: trip._id,
        organiserName: req.user.name
      });
    }

    res.json({
      success: true,
      message: `Expedition "${trip.title}" moved to draft status.`,
      trip
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete trip (Organiser owner only)
 * DELETE /api/trips/:tripId
 */
async function deleteTrip(req, res, next) {
  try {
    const role = (req.user.role || '').toLowerCase();
    if (role !== 'organiser' && role !== 'organizer' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Regular users cannot delete trips.'
      });
    }

    const tripId = req.params.tripId;
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found.' });
    }

    const isCreator = trip.createdBy.toString() === req.user._id.toString() ||
                      (trip.organiserId && trip.organiserId.toString() === req.user._id.toString());

    if (!isCreator && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the organiser who created this trip can delete it.'
      });
    }

    await Promise.all([
      Trip.findByIdAndDelete(tripId),
      TripMember.deleteMany({ trip: tripId }),
      JoinRequest.deleteMany({ trip: tripId }),
      ItineraryActivity.deleteMany({ trip: tripId }),
      Expense.deleteMany({ trip: tripId }),
      PackingItem.deleteMany({ trip: tripId }),
      BookingDocument.deleteMany({ trip: tripId }),
      Notification.deleteMany({ trip: tripId })
    ]);

    res.json({
      success: true,
      message: 'Trip and associated records deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Smart Trip Recommendations
 * GET /api/trips/recommendations
 * Query params: destination, budget, maxBudget, duration, durationDays, interests, limit
 */
async function getRecommendations(req, res, next) {
  try {
    const { destination, budget, maxBudget, duration, durationDays, interests, limit } = req.query;

    const publishedFilter = {
      $and: [
        {
          $or: [
            { isPublished: true },
            { publicationStatus: { $in: ['Published', 'published'] } },
            { status: { $in: ['published', 'Published'] } }
          ]
        },
        { isPublished: { $ne: false } },
        { publicationStatus: { $nin: ['Draft', 'draft', 'Unpublished', 'unpublished'] } },
        { status: { $nin: ['cancelled', 'draft', 'Draft'] } }
      ]
    };

    const trips = await Trip.find(publishedFilter)
      .populate('organiserId', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .lean();

    const criteria = {
      destination,
      budget: budget || maxBudget,
      duration: duration || durationDays,
      interests,
      limit: Number(limit) || 20
    };

    const recommendations = recommendTrips(trips, criteria);

    res.json({
      success: true,
      count: recommendations.length,
      criteria: {
        destination: destination || null,
        budget: Number(budget || maxBudget) || null,
        duration: Number(duration || durationDays) || null,
        interests: interests ? (Array.isArray(interests) ? interests : interests.split(',')) : []
      },
      recommendations
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createTrip,
  getTrips,
  getTripById,
  updateTrip,
  publishTrip,
  unpublishTrip,
  deleteTrip,
  computeTripReadiness,
  getRecommendations
};
