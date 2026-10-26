require('../src/config/env');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Trip = require('../src/models/Trip');
const TripMember = require('../src/models/TripMember');
const ItineraryActivity = require('../src/models/ItineraryActivity');
const Expense = require('../src/models/Expense');
const Wishlist = require('../src/models/Wishlist');
const Review = require('../src/models/Review');
const PackingItem = require('../src/models/PackingItem');
const Vote = require('../src/models/Vote');

async function seedAllFeaturesForKavya() {
  console.log('[SEED] Seeding all 7 features for user Kavya Raman (kavya@journeyhub.dev)...');

  // 1. Get or verify Kavya Raman
  const kavya = await User.findOne({ email: 'kavya@journeyhub.dev' });
  if (!kavya) {
    throw new Error('User kavya@journeyhub.dev not found. Please ensure user is seeded.');
  }
  console.log(`✔ Found user: "${kavya.name}" (${kavya.email}, ID: ${kavya._id})`);

  // 2. Find a published trip to join (e.g. Manali trip)
  let trip = await Trip.findOne({
    $or: [
      { destination: { $regex: /manali/i } },
      { title: { $regex: /manali/i } }
    ]
  });

  if (!trip) {
    trip = await Trip.findOne({ isPublished: true });
  }

  if (!trip) {
    throw new Error('No published trip found in database.');
  }

  console.log(`✔ Selected active trip: "${trip.title}" (${trip.destination}, ID: ${trip._id})`);

  // 3. Enroll Kavya and 3 group companions (Rohan Verma, Priya Sharma, Jerry)
  const rohan = await User.findOne({ email: 'rohan@journeyhub.dev' });
  const priya = await User.findOne({ email: 'priya@journeyhub.dev' });
  const jerry = await User.findOne({ email: 'jerry@gmail.com' });

  const companions = [
    { user: kavya, role: 'editor', note: 'Kavya Raman - Confirmed and ready for high mountain passes' },
    { user: rohan, role: 'editor', note: 'Rohan Verma - Adventure seeker & trek photographer' },
    { user: priya, role: 'editor', note: 'Priya Sharma - Cultural explorer and cafe trail coordinator' },
    { user: jerry, role: 'viewer', note: 'Jerry - Nature enthusiast & observer' }
  ].filter(c => c.user);

  for (const c of companions) {
    const existing = await TripMember.findOne({ trip: trip._id, user: c.user._id });
    if (!existing) {
      await TripMember.create({
        trip: trip._id,
        user: c.user._id,
        role: c.role,
        status: 'accepted',
        availability: [{
          startDate: trip.startDate || new Date('2026-11-10'),
          endDate: trip.endDate || new Date('2026-11-16'),
          note: c.note
        }]
      });
    } else {
      existing.status = 'accepted';
      existing.role = c.role;
      existing.availability = [{
        startDate: trip.startDate || new Date('2026-11-10'),
        endDate: trip.endDate || new Date('2026-11-16'),
        note: c.note
      }];
      await existing.save();
    }
    console.log(`✔ Enrolled companion: "${c.user.name}" (${c.role}) on "${trip.title}"`);
  }

  // Update Trip.members array
  await Trip.findByIdAndUpdate(trip._id, {
    $addToSet: { members: companions.map(c => c.user._id) }
  });

  // 4. Feature 3: Seed Day-wise Itinerary Activities
  await ItineraryActivity.deleteMany({ trip: trip._id });
  const startDate = new Date(trip.startDate || '2026-11-10');
  const day1Date = new Date(startDate);
  const day2Date = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
  const day3Date = new Date(startDate.getTime() + 48 * 60 * 60 * 1000);

  const activities = [
    {
      trip: trip._id,
      dayNumber: 1,
      date: day1Date,
      title: 'Arrival & Solang Valley Riverside Walk',
      description: 'Check in to mountain chalet resort, acclimatize and enjoy riverside walk along Beas river.',
      location: 'Solang Valley, Manali',
      startTime: '10:00',
      endTime: '13:00',
      durationMinutes: 180,
      estimatedCost: 800,
      category: 'Sightseeing'
    },
    {
      trip: trip._id,
      dayNumber: 2,
      date: day2Date,
      title: 'Rohtang Pass High Snow Altitude Expedition',
      description: 'Scenic high altitude mountain pass drive with snow skiing and photography stops.',
      location: 'Rohtang Pass (13,058 ft)',
      startTime: '08:30',
      endTime: '15:30',
      durationMinutes: 420,
      estimatedCost: 2500,
      category: 'Adventure'
    },
    {
      trip: trip._id,
      dayNumber: 3,
      date: day3Date,
      title: 'Old Manali Culture, Manu Temple & Cafe Trail',
      description: 'Historic wooden temple visit, traditional bazaars, live music cafes, and trout feast.',
      location: 'Old Manali Village',
      startTime: '11:00',
      endTime: '16:00',
      durationMinutes: 300,
      estimatedCost: 1200,
      category: 'Food & Dining'
    }
  ];

  await ItineraryActivity.create(activities);
  console.log(`✔ Feature 3: Created 3 day-wise itinerary activities on "${trip.title}"`);

  // 5. Feature 4: Seed Travel Expenses & Budget Tracking with Multi-Member Splits
  await Expense.deleteMany({ trip: trip._id });
  const allUserIds = companions.map(c => c.user._id);
  const splitPerPerson = (amt) => {
    const share = Math.round(amt / allUserIds.length);
    return allUserIds.map(uid => ({ user: uid, amount: share, hasPaid: false }));
  };

  const expenses = [
    {
      trip: trip._id,
      title: 'Mountain Chalet Resort Stay (3 Nights)',
      amount: 14000,
      currency: 'INR',
      category: 'Accommodation',
      date: day1Date,
      paidBy: rohan ? rohan._id : kavya._id,
      splitType: 'equal',
      splits: splitPerPerson(14000)
    },
    {
      trip: trip._id,
      title: 'High-Altitude 4x4 Mountain Transfer',
      amount: 5000,
      currency: 'INR',
      category: 'Transport',
      date: day2Date,
      paidBy: kavya._id,
      splitType: 'equal',
      splits: splitPerPerson(5000)
    },
    {
      trip: trip._id,
      title: 'Traditional Campfire & Feast Banquet',
      amount: 3200,
      currency: 'INR',
      category: 'Food & Dining',
      date: day3Date,
      paidBy: priya ? priya._id : kavya._id,
      splitType: 'equal',
      splits: splitPerPerson(3200)
    }
  ];

  await Expense.create(expenses);
  console.log(`✔ Feature 4: Seeded multi-member travel expenses (Total: ₹22,200) with equal splits`);

  // 5b. Seed Group Packing Items assigned to group members
  await PackingItem.deleteMany({ trip: trip._id });
  await PackingItem.create([
    {
      trip: trip._id,
      title: 'High-Altitude First Aid & Acclimatization Kit',
      category: 'Health & Medical',
      quantity: 1,
      isPacked: true,
      assignedTo: priya ? priya._id : kavya._id,
      isShared: true
    },
    {
      trip: trip._id,
      title: 'Action Camera, Drone & Extra Batteries',
      category: 'Electronics',
      quantity: 2,
      isPacked: false,
      assignedTo: rohan ? rohan._id : kavya._id,
      isShared: true
    },
    {
      trip: trip._id,
      title: 'Thermal Jackets, Crampons & Waterproof Gloves',
      category: 'Clothing',
      quantity: 4,
      isPacked: true,
      assignedTo: kavya._id,
      isShared: false
    }
  ]);
  console.log(`✔ Seeded team packing items assigned across group members`);

  // 5c. Seed Group Voting Poll with votes from companions
  await Vote.deleteMany({ trip: trip._id });
  const poll = await Vote.create({
    trip: trip._id,
    createdBy: kavya._id,
    title: 'Group Decision: Which afternoon excursion on Day 2?',
    description: 'Vote for your preferred mountain excursion after Solang Valley acclimatization.',
    type: 'activity',
    options: [
      { text: 'Snow Paragliding & Ski Descent' },
      { text: 'Jogini Waterfalls & Pine Forest Trek' }
    ],
    votes: []
  });

  if (poll.options && poll.options.length >= 2) {
    const optSnow = poll.options[0]._id;
    const optTrek = poll.options[1]._id;
    poll.votes = [
      { user: kavya._id, optionId: optSnow, votedAt: new Date() },
      ...(rohan ? [{ user: rohan._id, optionId: optSnow, votedAt: new Date() }] : []),
      ...(priya ? [{ user: priya._id, optionId: optTrek, votedAt: new Date() }] : []),
      ...(jerry ? [{ user: jerry._id, optionId: optTrek, votedAt: new Date() }] : [])
    ];
    await poll.save();
    console.log(`✔ Seeded active group voting poll with companion votes`);
  }

  // 6. Feature 2: Seed Wishlist Items for Kavya
  const otherTrips = await Trip.find({
    _id: { $ne: trip._id },
    isPublished: true
  }).limit(2);

  for (const otherTrip of otherTrips) {
    await Wishlist.findOneAndUpdate(
      { userId: kavya._id, tripId: otherTrip._id },
      { addedAt: new Date() },
      { upsert: true }
    );
    console.log(`✔ Feature 2: Added "${otherTrip.title}" to Kavya's Wishlist`);
  }

  // 7. Feature 5: Seed Trip Reviews & Ratings
  await Review.deleteMany({ trip: trip._id });
  await Review.create([
    {
      trip: trip._id,
      user: kavya._id,
      rating: 5,
      title: 'Unbelievable Himalayan Journey!',
      comment: 'The snow pass drive, Solang valley walks, and group coordination were top notch. Loved every minute of it!'
    }
  ]);

  if (rohan) {
    await Review.create({
      trip: trip._id,
      user: rohan._id,
      rating: 5,
      title: 'Phenomenal Views & Great Company',
      comment: 'Super seamless itinerary and reasonable expenses. The mountain sunrise was unforgettable!'
    });
  }

  console.log(`✔ Feature 5: Published verified trip reviews & 5-star ratings on "${trip.title}"`);
  console.log('====================================================');
  console.log('   ALL 7 FEATURES SEEDED & WIRED FOR KAVYA RAMAN!   ');
  console.log('====================================================');
}

if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      await seedAllFeaturesForKavya();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('❌ Seeder failed:', err);
      process.exit(1);
    }
  })();
}

module.exports = { seedAllFeaturesForKavya };
