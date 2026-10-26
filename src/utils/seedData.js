/**
 * Realistic Sample Seed Data for JourneyHub MCA Capstone
 */
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');

const User = require('../models/User');
const Trip = require('../models/Trip');
const TripMember = require('../models/TripMember');
const Destination = require('../models/Destination');
const ItineraryActivity = require('../models/ItineraryActivity');
const Expense = require('../models/Expense');
const ExpenseSettlement = require('../models/ExpenseSettlement');
const PackingItem = require('../models/PackingItem');
const Vote = require('../models/Vote');
const ChangeRequest = require('../models/ChangeRequest');
const Notification = require('../models/Notification');
const TravelDiaryEntry = require('../models/TravelDiaryEntry');
const TripScenario = require('../models/TripScenario');
const BookingDocument = require('../models/BookingDocument');
const JoinRequest = require('../models/JoinRequest');
const MysteryTrip = require('../models/MysteryTrip');
const Wishlist = require('../models/Wishlist');
const indianDestinations = require('./indianDestinationsData');

async function seed() {
  console.log('[SEED] Clearing existing records...');
  await Promise.all([
    User.deleteMany({}),
    Trip.deleteMany({}),
    TripMember.deleteMany({}),
    Destination.deleteMany({}),
    ItineraryActivity.deleteMany({}),
    Expense.deleteMany({}),
    ExpenseSettlement.deleteMany({}),
    PackingItem.deleteMany({}),
    Vote.deleteMany({}),
    ChangeRequest.deleteMany({}),
    Notification.deleteMany({}),
    TravelDiaryEntry.deleteMany({}),
    TripScenario.deleteMany({}),
    BookingDocument.deleteMany({}),
    JoinRequest.deleteMany({}),
    MysteryTrip.deleteMany({}),
    Wishlist.deleteMany({})
  ]);

  console.log('[SEED] Creating Predefined Organisers (Sai, Dhanush, Divya) and Demo Travelers...');
  const passDhanush = process.env.ORGANISER_DHANUSH_PASSWORD || process.env.ORGANISER_DEFAULT_PASSWORD || 'Organiser@Dhanush2026';
  const passSai = process.env.ORGANISER_SAI_PASSWORD || process.env.ORGANISER_DEFAULT_PASSWORD || 'Organiser@Sai2026';
  const passDivya = process.env.ORGANISER_DIVYA_PASSWORD || process.env.ORGANISER_DEFAULT_PASSWORD || 'Organiser@Divya2026';

  const user1 = await User.create({
    name: 'Dhanush',
    email: 'dhanush@gmail.com',
    password: passDhanush,
    role: 'organiser',
    emailVerified: true,
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
    phone: '+91 98450 22002',
    bio: 'Senior Tour Curator & Organiser at JourneyHub. Crafting seamless coastal and heritage journeys.',
    preferences: { currency: 'INR', budgetAlertThreshold: 80, theme: 'navy', emailNotifications: true },
    travelInterests: ['Mountains', 'Cultural', 'Adventure'],
    emergencyContact: { name: 'Suresh', relationship: 'Family', phone: '+91 98765 11111' }
  });

  const orgSai = await User.create({
    name: 'Sai',
    email: 'sai@gmail.com',
    password: passSai,
    role: 'organiser',
    emailVerified: true,
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
    phone: '+91 98450 11001',
    bio: 'Head of Expeditions & Organiser at JourneyHub. Specialist in mountain trails and Himalayan treks.',
    preferences: { currency: 'INR', budgetAlertThreshold: 85, theme: 'navy', emailNotifications: true },
    travelInterests: ['Mountains', 'Adventure', 'Road Trips'],
    emergencyContact: { name: 'Ramesh', relationship: 'Family', phone: '+91 98765 44444' }
  });

  const orgDivya = await User.create({
    name: 'Divya',
    email: 'divya@gmail.com',
    password: passDivya,
    role: 'organiser',
    emailVerified: true,
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    phone: '+91 98450 33003',
    bio: 'Cultural & Mystery Miles Expedition Organiser at JourneyHub. Wildlife and heritage aficionado.',
    preferences: { currency: 'INR', budgetAlertThreshold: 80, theme: 'navy', emailNotifications: true },
    travelInterests: ['Heritage', 'Wildlife', 'Cultural'],
    emergencyContact: { name: 'Meena', relationship: 'Family', phone: '+91 98765 55555' }
  });

  // Seed secondary Organiser account aliases
  await User.create([
    {
      name: 'Dhanush (JourneyHub)',
      email: 'dhanush@journeyhub.dev',
      password: passDhanush,
      role: 'organiser',
      emailVerified: true,
      status: 'active',
      avatar: user1.avatar,
      phone: '+91 98450 22002',
      bio: 'Senior Tour Curator & Organiser at JourneyHub.',
      preferences: { currency: 'INR', budgetAlertThreshold: 80, theme: 'navy', emailNotifications: true }
    },
    {
      name: 'Dhanush (Gmail Alt)',
      email: 'dhanushs0425@gmail.com',
      password: passDhanush,
      role: 'organiser',
      emailVerified: true,
      status: 'active',
      avatar: user1.avatar,
      phone: '+91 98450 22002',
      bio: 'Senior Tour Curator & Organiser at JourneyHub.',
      preferences: { currency: 'INR', budgetAlertThreshold: 80, theme: 'navy', emailNotifications: true }
    },
    {
      name: 'Sai (JourneyHub)',
      email: 'sai@journeyhub.dev',
      password: passSai,
      role: 'organiser',
      emailVerified: true,
      status: 'active',
      avatar: orgSai.avatar,
      phone: '+91 98450 11001',
      bio: 'Head of Expeditions & Organiser at JourneyHub.',
      preferences: { currency: 'INR', budgetAlertThreshold: 85, theme: 'navy', emailNotifications: true }
    },
    {
      name: 'Divya (JourneyHub)',
      email: 'divya@journeyhub.dev',
      password: passDivya,
      role: 'organiser',
      emailVerified: true,
      status: 'active',
      avatar: orgDivya.avatar,
      phone: '+91 98450 33003',
      bio: 'Cultural & Mystery Miles Expedition Organiser at JourneyHub.',
      preferences: { currency: 'INR', budgetAlertThreshold: 80, theme: 'navy', emailNotifications: true }
    }
  ]);

  const user2 = await User.create({
    name: 'Priya Sharma',
    email: 'priya@journeyhub.dev',
    password: 'password123',
    role: 'user',
    emailVerified: true,
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
    phone: '+91 98765 43211',
    bio: 'Travel photographer and architecture enthusiast. Passionate explorer seeking hidden treasures.',
    preferences: { currency: 'INR', budgetAlertThreshold: 85, theme: 'navy', emailNotifications: true },
    travelInterests: ['Cultural', 'Beaches', 'Heritage'],
    emergencyContact: { name: 'Rajesh Sharma', relationship: 'Father', phone: '+91 98765 22222' }
  });

  const user3 = await User.create({
    name: 'Rohan Verma',
    email: 'rohan@journeyhub.dev',
    password: 'password123',
    role: 'user',
    emailVerified: true,
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=250&q=80',
    phone: '+91 98765 43212',
    bio: 'Adventure seeker, foodie, and road trip enthusiast.',
    preferences: { currency: 'INR', budgetAlertThreshold: 75, theme: 'navy', emailNotifications: true },
    travelInterests: ['Foodie', 'Urban', 'Road Trips'],
    emergencyContact: { name: 'Kavita Verma', relationship: 'Sister', phone: '+91 98765 33333' }
  });

  const userJerry = await User.create({
    name: 'Jerry',
    email: 'jerry@gmail.com',
    password: 'password123',
    role: 'user',
    emailVerified: true,
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80',
    phone: '+91 98450 99887',
    bio: 'Avid traveler, nature enthusiast, and travel photographer.',
    preferences: { currency: 'INR', budgetAlertThreshold: 80, theme: 'navy', emailNotifications: true },
    travelInterests: ['Adventure', 'Beaches', 'Cultural'],
    emergencyContact: { name: 'Jerry Contact', relationship: 'Family', phone: '+91 98450 12345' }
  });

  const userKavya = await User.create({
    name: 'Kavya Raman',
    email: 'kavya@journeyhub.dev',
    password: 'Traveler@2026!',
    role: 'user',
    emailVerified: true,
    phoneVerified: true,
    verificationMethod: 'password',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    phone: '9876500001',
    bio: 'Passionate globetrotter exploring incredible destinations across India.',
    preferences: { currency: 'INR', budgetAlertThreshold: 80, theme: 'navy', emailNotifications: true },
    travelInterests: ['Beaches', 'Mountains', 'Cultural'],
    emergencyContact: { name: 'Ramanathan', relationship: 'Family', phone: '+91 98765 00002' }
  });

  console.log('[SEED] Creating Destination Catalog (72 Incredible Indian Destinations + Global)...');
  const destinations = await Destination.create([
    ...indianDestinations,
    {
      name: 'Kyoto & Tokyo Explorer',
      city: 'Kyoto',
      country: 'Japan',
      description: 'Ancient shrines, peaceful bamboo groves, futuristic neon high-rises, and world-renowned gastronomy.',
      imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
      coordinates: { lat: 35.0116, lng: 135.7681 },
      category: 'Heritage & Historical',
      averageDailyCost: 8500,
      bestTimeToVisit: 'March - May & October - November',
      highlights: ['Fushimi Inari Shrine', 'Arashiyama Bamboo Forest', 'Gion Geisha District', 'Shinjuku Neon Streets'],
      popularActivities: ['Tea Ceremony', 'Bullet Train Transit', 'Street Ramen Tasting', 'Temple Exploration'],
      rating: 4.9,
      isFeatured: true
    },
    {
      name: 'Amalfi Coast & Positano',
      city: 'Amalfi',
      country: 'Italy',
      description: 'Vertical pastel villages cascading into turquoise Tyrrhenian waters, lemon groves, and Mediterranean charm.',
      imageUrl: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80',
      coordinates: { lat: 40.6340, lng: 14.6027 },
      category: 'Beaches & Coastal',
      averageDailyCost: 12000,
      bestTimeToVisit: 'May - September',
      highlights: ['Path of the Gods Hike', 'Positano Cliffside Views', 'Capri Island Boat Tour', 'Ravello Gardens'],
      popularActivities: ['Coastal Yacht Charter', 'Limoncello Tasting', 'Sunset Dining'],
      rating: 4.8,
      isFeatured: false
    }
  ]);

  console.log('[SEED] Creating Primary Demo Trip 1: Japan Golden Autumn...');
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 14); // 2 weeks from now
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 5); // 6-day trip

  const trip1 = await Trip.create({
    title: 'Japan Autumn Adventure: Tokyo & Kyoto',
    destination: 'Kyoto, Japan',
    description: 'A 6-day exploration of Kansai and Kanto: historic shrines, bullet trains, world-class street food, and mountain trails.',
    startDate,
    endDate,
    estimatedBudget: 3500,
    currency: 'USD',
    capacity: 10,
    availableSeats: 7,
    price: 18500,
    isPublished: true,
    organiserId: user1._id,
    coverImage: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
    status: 'upcoming',
    createdBy: user1._id,
    tags: ['Culture', 'Autumn Leaves', 'Gastronomy', 'Bullet Train'],
    emergencyContacts: [
      { name: 'Embassy of India Tokyo', relation: 'Diplomatic Mission', phone: '+81 3 3262 2391' },
      { name: 'Sunita Mehta', relation: 'Emergency Family Contact', phone: '+91 98765 11111' }
    ]
  });

  // Enrol all 3 users as trip members with availability
  const av1Start = new Date(startDate); av1Start.setDate(av1Start.getDate() - 2);
  const av1End = new Date(endDate); av1End.setDate(av1End.getDate() + 4);

  await TripMember.create([
    {
      trip: trip1._id,
      user: user1._id,
      role: 'owner',
      status: 'accepted',
      availability: [{ startDate: av1Start, endDate: av1End, note: 'Completely free for entire 2 weeks' }]
    },
    {
      trip: trip1._id,
      user: user2._id,
      role: 'editor',
      status: 'accepted',
      invitedBy: user1._id,
      availability: [{ startDate: startDate, endDate: av1End, note: 'Available starting trip start date' }]
    },
    {
      trip: trip1._id,
      user: user3._id,
      role: 'editor',
      status: 'accepted',
      invitedBy: user1._id,
      availability: [{ startDate: av1Start, endDate: endDate, note: 'Free until end of the month' }]
    }
  ]);

  console.log('[SEED] Populating Day-wise Itinerary Activities...');
  const d1Date = new Date(startDate);
  const d2Date = new Date(startDate); d2Date.setDate(d2Date.getDate() + 1);
  const d3Date = new Date(startDate); d3Date.setDate(d3Date.getDate() + 2);
  const d4Date = new Date(startDate); d4Date.setDate(d4Date.getDate() + 3);

  const act1 = await ItineraryActivity.create({
    trip: trip1._id,
    dayNumber: 1,
    date: d1Date,
    title: 'Arrival & Shinkansen to Kyoto',
    description: 'Land at Haneda Airport, activate JR Passes, and board the Hikari bullet train to Kyoto Station.',
    location: 'Kyoto Station',
    coordinates: { lat: 34.9858, lng: 135.7588 },
    startTime: '10:00',
    endTime: '13:00',
    estimatedCost: 130,
    category: 'Travel & Transit',
    assignedTo: [user1._id, user2._id, user3._id],
    bookingReference: 'JR-HIKARI-9821'
  });

  const act2 = await ItineraryActivity.create({
    trip: trip1._id,
    dayNumber: 1,
    date: d1Date,
    title: 'Fushimi Inari Torii Gate Hike',
    description: 'Hike through thousands of vibrant vermilion torii gates winding up the sacred Mount Inari at twilight.',
    location: 'Fushimi Inari-taisha',
    coordinates: { lat: 34.9671, lng: 135.7727 },
    startTime: '15:30',
    endTime: '18:00',
    estimatedCost: 0,
    category: 'Sightseeing',
    assignedTo: [user1._id, user2._id, user3._id]
  });

  const act3 = await ItineraryActivity.create({
    trip: trip1._id,
    dayNumber: 2,
    date: d2Date,
    title: 'Arashiyama Bamboo Grove & Monkey Park',
    description: 'Early morning stroll through the towering bamboo forest followed by Tenryu-ji Temple Zen gardens.',
    location: 'Arashiyama, Ukyo Ward',
    coordinates: { lat: 35.0170, lng: 135.6713 },
    startTime: '08:30',
    endTime: '11:30',
    estimatedCost: 25,
    category: 'Sightseeing',
    assignedTo: [user1._id, user2._id]
  });

  const act4 = await ItineraryActivity.create({
    trip: trip1._id,
    dayNumber: 2,
    date: d2Date,
    title: 'Traditional Gion Kaiseki Multi-Course Lunch',
    description: 'Experience an authentic 8-course seasonal Kyoto banquet prepared by a master chef in historical Gion.',
    location: 'Gion District',
    coordinates: { lat: 35.0037, lng: 135.7770 },
    startTime: '12:30',
    endTime: '14:30',
    estimatedCost: 95,
    category: 'Food & Dining',
    assignedTo: [user1._id, user2._id, user3._id]
  });

  const act5 = await ItineraryActivity.create({
    trip: trip1._id,
    dayNumber: 3,
    date: d3Date,
    title: 'Kinkaku-ji (Golden Pavilion) Visit',
    description: 'Marvel at the top two floors of the Zen Buddhist temple covered in glittering pure gold leaf over the mirror pond.',
    location: 'Kinkaku-ji',
    coordinates: { lat: 35.0394, lng: 135.7292 },
    startTime: '09:00',
    endTime: '11:00',
    estimatedCost: 20,
    category: 'Culture',
    assignedTo: [user1._id, user2._id, user3._id]
  });

  // Activity 6 intentionally marked missed to showcase the Missed-Activity Recovery engine!
  const act6 = await ItineraryActivity.create({
    trip: trip1._id,
    dayNumber: 3,
    date: d3Date,
    title: 'Kiyomizu-dera Sunset Terrace Tour',
    description: 'Wooden stage jutting out of the hillside with breathtaking panoramic views of cherry and maple foliage.',
    location: 'Kiyomizu-dera',
    coordinates: { lat: 34.9949, lng: 135.7850 },
    startTime: '16:00',
    endTime: '18:00',
    estimatedCost: 15,
    category: 'Sightseeing',
    assignedTo: [user1._id, user2._id, user3._id],
    isMissed: true,
    missedReason: 'Heavy afternoon rain shower; road blocked.',
    originalSchedule: {
      dayNumber: 3,
      date: d3Date,
      startTime: '16:00',
      endTime: '18:00'
    }
  });

  console.log('[SEED] Populating Trip Expenses & Debt Scenarios...');
  // Arjun paid $450 hotel booking (Split equally: $150 each)
  await Expense.create({
    trip: trip1._id,
    title: 'Kyoto Boutique Ryokan Stay (2 Nights)',
    amount: 450,
    category: 'Accommodation',
    paidBy: user1._id,
    splitType: 'equal',
    splits: [
      { user: user1._id, amount: 150, hasPaid: true },
      { user: user2._id, amount: 150, hasPaid: false },
      { user: user3._id, amount: 150, hasPaid: false }
    ],
    notes: 'Traditional tatami rooms with communal hot springs.'
  });

  // Priya paid $180 for Kaiseki Dining (Split equally: $60 each)
  await Expense.create({
    trip: trip1._id,
    title: 'Kaiseki Group Banquet at Gion',
    amount: 180,
    category: 'Food & Dining',
    paidBy: user2._id,
    splitType: 'equal',
    splits: [
      { user: user1._id, amount: 60, hasPaid: false },
      { user: user2._id, amount: 60, hasPaid: true },
      { user: user3._id, amount: 60, hasPaid: false }
    ],
    notes: 'Seasonal matsutake mushrooms and fresh wagyu.'
  });

  // Rohan paid $120 for Shinkansen luggage & local taxi
  await Expense.create({
    trip: trip1._id,
    title: 'Bullet Train Express & Station Cabs',
    amount: 120,
    category: 'Transport',
    paidBy: user3._id,
    splitType: 'equal',
    splits: [
      { user: user1._id, amount: 40, hasPaid: false },
      { user: user2._id, amount: 40, hasPaid: false },
      { user: user3._id, amount: 40, hasPaid: true }
    ],
    notes: 'Shared station transfer van.'
  });

  // Completed settlement: Rohan paid Arjun $50 via UPI
  await ExpenseSettlement.create({
    trip: trip1._id,
    payer: user3._id,
    payee: user1._id,
    amount: 50,
    currency: 'USD',
    status: 'confirmed',
    paymentMethod: 'UPI / Bank Transfer',
    notes: 'Advance deposit towards Ryokan payment.'
  });

  console.log('[SEED] Populating Packing Checklist...');
  await PackingItem.create([
    { trip: trip1._id, title: 'Valid Passport & Japan e-Visa Printout', category: 'Documents & Money', quantity: 3, isPacked: true, assignedTo: user1._id, isShared: false },
    { trip: trip1._id, title: 'Suica / Pasmo IC Travel Transit Cards', category: 'Documents & Money', quantity: 3, isPacked: true, assignedTo: user3._id, isShared: true },
    { trip: trip1._id, title: 'Pocket Wi-Fi & Japanese SIM cards', category: 'Electronics', quantity: 2, isPacked: true, assignedTo: user2._id, isShared: true },
    { trip: trip1._id, title: 'DSLR Camera with 24-70mm Lens', category: 'Electronics', quantity: 1, isPacked: false, assignedTo: user2._id, isShared: false },
    { trip: trip1._id, title: 'Slip-on Walking Shoes (easy for temples)', category: 'Footwear', quantity: 3, isPacked: true, assignedTo: user1._id, isShared: false },
    { trip: trip1._id, title: 'Universal Type-A Power Plug Adapters', category: 'Electronics', quantity: 3, isPacked: false, assignedTo: user3._id, isShared: true },
    { trip: trip1._id, title: 'Lightweight Rain Jacket & Windbreaker', category: 'Clothing', quantity: 3, isPacked: false, assignedTo: user1._id, isShared: false },
    { trip: trip1._id, title: 'Travel First Aid & Blister Plasters', category: 'Health & Medical', quantity: 1, isPacked: true, assignedTo: user3._id, isShared: true }
  ]);

  console.log('[SEED] Populating Bookings & Documents...');
  await BookingDocument.create([
    {
      trip: trip1._id,
      title: 'ANA Flight NH 848 (New Delhi DEL to Tokyo HND)',
      type: 'Flight',
      provider: 'All Nippon Airways',
      confirmationCode: 'ANA-TK8921-X',
      startDate: startDate,
      endDate: startDate,
      cost: 650,
      bookedBy: user1._id,
      notes: 'Terminal 3 Departure. Baggage allowance: 2 x 23kg.'
    },
    {
      trip: trip1._id,
      title: 'Kyoto Machiya Traditional Villa Reservation',
      type: 'Hotel',
      provider: 'Kyoto Heritage Inns',
      confirmationCode: 'KYOTO-RYOKAN-441',
      startDate: startDate,
      endDate: endDate,
      cost: 450,
      bookedBy: user1._id,
      notes: 'Check-in from 14:00. Traditional yukata robes provided.'
    },
    {
      trip: trip1._id,
      title: '7-Day Whole Japan Rail Pass (Ordinary Car)',
      type: 'Train/Bus',
      provider: 'JR Group',
      confirmationCode: 'JR-PASS-55910',
      startDate: startDate,
      endDate: endDate,
      cost: 380,
      bookedBy: user3._id,
      notes: 'Exchange voucher at Haneda Airport JR East Travel Service Center.'
    }
  ]);

  console.log('[SEED] Populating Group Voting Polls...');
  const poll1 = await Vote.create({
    trip: trip1._id,
    title: 'Choose Day 4 Excursion: Ancient Deer Park or Sacred Mountain?',
    description: 'We have an open afternoon on Day 4. Where should the group head?',
    type: 'activity',
    options: [
      { text: 'Nara Park & Todai-ji Giant Buddha (friendly bowing sika deer)' },
      { text: 'Mount Hiei Enryaku-ji Monastery (panoramic cable car)' },
      { text: 'Fushimi Sake Brewery Walking District' }
    ],
    createdBy: user2._id,
    status: 'open'
  });

  // Cast sample votes
  poll1.votes.push(
    { user: user1._id, optionId: poll1.options[0]._id },
    { user: user2._id, optionId: poll1.options[0]._id },
    { user: user3._id, optionId: poll1.options[1]._id }
  );
  await poll1.save();

  console.log('[SEED] Populating Itinerary Change Request...');
  await ChangeRequest.create({
    trip: trip1._id,
    title: 'Upgrade Day 2 Lunch to 3-Star Michelin Sukiyabashi Jiro',
    description: 'Rohan found a special table cancellation for 3 people. Requires +$80 per person budget adjustment.',
    proposedBy: user3._id,
    changeType: 'budget_update',
    currentValue: { estimatedCost: 180 },
    proposedValue: { estimatedBudget: 3800, additionalCost: 240 },
    status: 'pending'
  });

  console.log('[SEED] Populating What-If Simulation Scenario...');
  await TripScenario.create({
    trip: trip1._id,
    createdBy: user1._id,
    name: 'Scenario A: VIP Helicopter Tour & Private Tea Master',
    description: 'Hypothetical VIP luxury package to evaluate total budget impact and schedule density before confirming.',
    status: 'draft',
    simulatedActivities: [
      {
        dayNumber: 2,
        title: 'Kyoto Skyline Helicopter Flight',
        startTime: '15:00',
        endTime: '16:00',
        estimatedCost: 320,
        category: 'Adventure',
        isCustomNew: true
      },
      {
        dayNumber: 3,
        title: 'Exclusive Uji Matcha Tea Master Ceremony',
        startTime: '13:00',
        endTime: '15:00',
        estimatedCost: 110,
        category: 'Culture',
        isCustomNew: true
      }
    ],
    simulatedBudget: 4200,
    deltaCost: 430,
    deltaDurationMinutes: 180,
    conflictCount: 0,
    conflicts: []
  });

  console.log('[SEED] Populating Personal Travel Diary & Memories...');
  await TravelDiaryEntry.create({
    trip: trip1._id,
    author: user1._id,
    dayNumber: 1,
    title: 'First Sips of Green Tea Under Kyoto Lanterns',
    notes: 'The journey from Tokyo aboard the Shinkansen felt like entering another epoch. Stepping into Kyoto station with evening rain reflecting the lantern glow in Pontocho alley was mesmerizing.',
    memorablePlaces: ['Kyoto Station Sky Garden', 'Pontocho Lantern Alley', 'Kamogawa Riverbank'],
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
        caption: 'Traditional wooden houses and stone alleyways in Pontocho.'
      },
      {
        url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
        caption: 'Lanterns lit up as dusk settled over the historic district.'
      }
    ],
    mood: 'Amazing',
    weather: 'Cool Autumn Evening (18°C)',
    rating: 5,
    actualExpenses: 85,
    highlights: ['Bullet train speed feeling', 'First steaming bowl of tonkotsu ramen', 'Walking the riverside']
  });

  console.log('[SEED] Populating System Notifications...');
  await Notification.create([
    {
      user: user1._id,
      trip: trip1._id,
      title: 'Change Request Awaiting Review',
      message: 'Rohan Verma submitted a change request for Day 2 dining upgrade.',
      type: 'change_request',
      link: `#/trips/${trip1._id}/collaboration`
    },
    {
      user: user1._id,
      trip: trip1._id,
      title: 'Poll Majority Reached',
      message: 'Nara Deer Park has received 2 votes in the Day 4 excursion poll.',
      type: 'vote',
      link: `#/trips/${trip1._id}/collaboration`
    },
    {
      user: user1._id,
      trip: trip1._id,
      title: 'Missed Activity Reminder',
      message: 'Kiyomizu-dera was marked as missed. View recovery slots to reschedule.',
      type: 'itinerary_conflict',
      link: `#/trips/${trip1._id}/itinerary`
    }
  ]);

  console.log('[SEED] Creating Additional Published Organiser Trips for Indian Destinations...');
  const t2Start = new Date(); t2Start.setDate(t2Start.getDate() + 20);
  const t2End = new Date(t2Start); t2End.setDate(t2End.getDate() + 5);

  const trip2 = await Trip.create({
    title: 'Royal Rajasthan Heritage Odyssey',
    destination: 'Jaipur & Udaipur, Rajasthan',
    description: 'A 5-day majestic tour exploring the Pink City of Jaipur and the romantic Lake City of Udaipur. Experience palace stays, camel safaris, and authentic Rajasthani dining.',
    startDate: t2Start,
    endDate: t2End,
    estimatedBudget: 22000,
    price: 18500,
    capacity: 10,
    availableSeats: 7,
    currency: 'INR',
    status: 'upcoming',
    isPublished: true,
    publicationStatus: 'Published',
    organiserId: user1._id,
    createdBy: user1._id,
    coverImage: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80',
    tags: ['Heritage & Historical', 'Royal Palaces', 'Desert Safari', 'Rajasthan']
  });

  const t3Start = new Date(); t3Start.setDate(t3Start.getDate() + 35);
  const t3End = new Date(t3Start); t3End.setDate(t3End.getDate() + 4);

  const trip3 = await Trip.create({
    title: 'Enchanted Kerala Backwaters & Coast',
    destination: 'Alleppey & Munnar, Kerala',
    description: 'Immerse in emerald backwater houseboat cruises, misty rolling tea gardens, and authentic Ayurvedic rejuvenation in God’s Own Country.',
    startDate: t3Start,
    endDate: t3End,
    estimatedBudget: 16000,
    price: 14000,
    capacity: 8,
    availableSeats: 6,
    currency: 'INR',
    status: 'upcoming',
    isPublished: true,
    publicationStatus: 'Published',
    organiserId: orgSai._id,
    createdBy: orgSai._id,
    coverImage: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80',
    tags: ['Beaches & Coastal', 'Houseboat Cruise', 'Tea Estates', 'Kerala']
  });

  const t4Start = new Date(); t4Start.setDate(t4Start.getDate() + 45);
  const t4End = new Date(t4Start); t4End.setDate(t4End.getDate() + 5);

  const trip4 = await Trip.create({
    title: 'Himalayan High Passes & Valley Explorer',
    destination: 'Manali & Spiti Valley, Himachal Pradesh',
    description: 'High-altitude adventure across pine-forested slopes, historic Tibetan monasteries, and sparkling glacial lakes.',
    startDate: t4Start,
    endDate: t4End,
    estimatedBudget: 28000,
    price: 24500,
    capacity: 12,
    availableSeats: 10,
    currency: 'INR',
    status: 'upcoming',
    isPublished: true,
    publicationStatus: 'Published',
    organiserId: orgDivya._id,
    createdBy: orgDivya._id,
    coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    tags: ['Adventure', 'Mountain Pass', 'Trekking', 'Himachal']
  });

  console.log('[SEED] Creating Ongoing Trip (Goa Coastal Cruise & Beach Expedition)...');
  const tOngoingStart = new Date(Date.now() - 2 * 86400000); // 2 days ago
  const tOngoingEnd = new Date(Date.now() + 3 * 86400000); // 3 days from now (5 days total)

  const trip5 = await Trip.create({
    title: 'Goa Coastal Cruise & Beach Expedition',
    destination: 'North Goa & Panaji, Goa',
    description: 'A sun-drenched coastal voyage through palm-fringed shores, Portuguese heritage quarters, spice plantations, and lively sunset river cruises.',
    startDate: tOngoingStart,
    endDate: tOngoingEnd,
    estimatedBudget: 18000,
    price: 16500,
    capacity: 10,
    availableSeats: 4,
    currency: 'INR',
    status: 'ongoing',
    isPublished: true,
    publicationStatus: 'Published',
    organiserId: user1._id,
    createdBy: user1._id,
    coverImage: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
    tags: ['Beaches & Coastal', 'Cruise', 'Nightlife', 'Goa']
  });

  // Enrol Priya, Rohan, Dhanush, Jerry in trip5 (ongoing)
  await TripMember.create([
    { trip: trip5._id, user: user1._id, role: 'owner', status: 'accepted' },
    { trip: trip5._id, user: user2._id, role: 'editor', status: 'accepted' },
    { trip: trip5._id, user: user3._id, role: 'viewer', status: 'accepted' },
    { trip: trip5._id, user: userJerry._id, role: 'viewer', status: 'accepted' }
  ]);

  // Itinerary activities for trip5
  const act5_1Date = new Date(tOngoingStart);
  const act5_2Date = new Date(tOngoingStart.getTime() + 86400000);
  const act5_3Date = new Date(); // TODAY
  const act5_4Date = new Date(Date.now() + 86400000);
  const act5_5Date = new Date(Date.now() + 2 * 86400000);

  await ItineraryActivity.create([
    {
      trip: trip5._id,
      dayNumber: 1,
      date: act5_1Date,
      title: 'Arrival & Mandovi River Sunset Cruise',
      description: 'Check into waterfront resort and embark on the Santa Monica riverboat cruise with Goan folk dances.',
      location: 'Panaji Jetty',
      startTime: '17:00',
      endTime: '19:30',
      estimatedCost: 800,
      category: 'Sightseeing',
      assignedTo: [user1._id, user2._id, user3._id]
    },
    {
      trip: trip5._id,
      dayNumber: 2,
      date: act5_2Date,
      title: 'Old Goa Basilica & Fontainhas Heritage Walk',
      description: 'Explore the 16th-century Basilica of Bom Jesus, Se Cathedral, and the vibrant pastel Latin Quarter.',
      location: 'Old Goa & Fontainhas',
      startTime: '09:30',
      endTime: '13:00',
      estimatedCost: 400,
      category: 'Sightseeing',
      assignedTo: [user1._id, user2._id]
    },
    {
      trip: trip5._id,
      dayNumber: 3,
      date: act5_3Date,
      title: 'Anjuna Beach Watersports & Calangute Sunset Flea Market',
      description: 'Jet skiing, parasailing, and banana boat rides followed by eclectic bohemian handicraft shopping.',
      location: 'Anjuna Beach',
      startTime: '10:00',
      endTime: '16:00',
      estimatedCost: 2500,
      category: 'Adventure',
      assignedTo: [user1._id, user2._id, user3._id]
    },
    {
      trip: trip5._id,
      dayNumber: 4,
      date: act5_4Date,
      title: 'Dudhsagar Waterfall Jeep Trek & Spice Farm Lunch',
      description: '4x4 off-road safari through Mollem National Park to the roaring milky falls with organic buffet lunch.',
      location: 'Dudhsagar Falls',
      startTime: '08:00',
      endTime: '15:30',
      estimatedCost: 1800,
      category: 'Adventure',
      assignedTo: [user1._id, user2._id]
    },
    {
      trip: trip5._id,
      dayNumber: 5,
      date: act5_5Date,
      title: 'Palolem Beach Kayaking & Farewell Beach Bonfire',
      description: 'Crescent beach ocean kayaking, dolphin watching boat trip, and evening beachside barbecue feast.',
      location: 'Palolem Beach, South Goa',
      startTime: '11:00',
      endTime: '21:00',
      estimatedCost: 1500,
      category: 'Leisure',
      assignedTo: [user1._id, user2._id, user3._id]
    }
  ]);

  // Expenses for trip5
  await Expense.create([
    {
      trip: trip5._id,
      paidBy: user1._id,
      title: 'Mandovi Sunset Riverboat Tickets',
      amount: 4200,
      category: 'Activities',
      date: act5_1Date,
      splitType: 'equal',
      splits: [
        { user: user1._id, amount: 1400, hasPaid: true },
        { user: user2._id, amount: 1400, hasPaid: false },
        { user: user3._id, amount: 1400, hasPaid: false }
      ]
    },
    {
      trip: trip5._id,
      paidBy: user2._id,
      title: 'Fontainhas Heritage Cafe Lunch',
      amount: 3450,
      category: 'Food & Dining',
      date: act5_2Date,
      splitType: 'equal',
      splits: [
        { user: user1._id, amount: 1150, hasPaid: false },
        { user: user2._id, amount: 1150, hasPaid: true },
        { user: user3._id, amount: 1150, hasPaid: false }
      ]
    }
  ]);

  // Diary entry for trip5
  await TravelDiaryEntry.create({
    trip: trip5._id,
    author: user2._id,
    dayNumber: 1,
    title: 'Sunset Over the Arabian Sea',
    notes: 'The golden hour breeze as our boat cruised along the Mandovi was sheer magic. The live Goan folk music set the mood for our adventure!',
    mood: 'Amazing',
    rating: 5,
    photos: [
      { url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80', caption: 'Sunset hues over Goa coast.' }
    ]
  });

  console.log('[SEED] Creating Completed Trip (Varanasi Spiritual Ganges Heritage Tour)...');
  const tCompStart = new Date(Date.now() - 20 * 86400000); // 20 days ago
  const tCompEnd = new Date(Date.now() - 15 * 86400000); // 15 days ago

  const trip6 = await Trip.create({
    title: 'Varanasi Spiritual Ganges Heritage Tour',
    destination: 'Varanasi, Uttar Pradesh',
    description: 'A transcendent 5-day cultural and spiritual journey along the ancient ghats of the Ganges, witnessing timeless dawn rituals, sacred aartis, and historic Buddhist sanctuaries.',
    startDate: tCompStart,
    endDate: tCompEnd,
    estimatedBudget: 14000,
    price: 12500,
    capacity: 8,
    availableSeats: 0,
    currency: 'INR',
    status: 'completed',
    isPublished: true,
    publicationStatus: 'Published',
    organiserId: orgDivya._id,
    createdBy: orgDivya._id,
    coverImage: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1200&q=80',
    tags: ['Heritage & Historical', 'Spiritual', 'Ganges', 'Varanasi']
  });

  // Enrol Divya, Priya, Rohan, Jerry in trip6 (completed)
  await TripMember.create([
    { trip: trip6._id, user: orgDivya._id, role: 'owner', status: 'accepted' },
    { trip: trip6._id, user: user2._id, role: 'editor', status: 'accepted' },
    { trip: trip6._id, user: user3._id, role: 'viewer', status: 'accepted' },
    { trip: trip6._id, user: userJerry._id, role: 'viewer', status: 'accepted' }
  ]);

  // Itinerary activities for trip6
  await ItineraryActivity.create([
    {
      trip: trip6._id,
      dayNumber: 1,
      date: tCompStart,
      title: 'Subah-e-Banaras Sunrise Boat Ride',
      description: 'Wooden rowboat cruise past Manikarnika and Harishchandra ghats as priests perform dawn Surya Namaskar.',
      location: 'Assi Ghat to Dashashwamedh',
      startTime: '05:30',
      endTime: '08:00',
      estimatedCost: 600,
      category: 'Sightseeing',
      assignedTo: [orgDivya._id, user2._id, user3._id]
    },
    {
      trip: trip6._id,
      dayNumber: 2,
      date: new Date(tCompStart.getTime() + 86400000),
      title: 'Kashi Vishwanath Corridor Darshan & Silk Weavers',
      description: 'Visit the newly restored golden temple corridor and walk through hereditary master silk weaver workshops.',
      location: 'Kashi Vishwanath',
      startTime: '09:00',
      endTime: '13:00',
      estimatedCost: 500,
      category: 'Culture',
      assignedTo: [orgDivya._id, user2._id]
    },
    {
      trip: trip6._id,
      dayNumber: 3,
      date: new Date(tCompStart.getTime() + 2 * 86400000),
      title: 'Sarnath Deer Park & Dhamek Stupa Excursion',
      description: 'Excursion to the sacred site of Buddha’s first sermon, Ashoka Lion Capital, and ancient monasteries.',
      location: 'Sarnath',
      startTime: '10:00',
      endTime: '14:30',
      estimatedCost: 400,
      category: 'Sightseeing',
      assignedTo: [orgDivya._id, user2._id, user3._id]
    },
    {
      trip: trip6._id,
      dayNumber: 4,
      date: new Date(tCompStart.getTime() + 3 * 86400000),
      title: 'Grand Evening Maha Ganga Aarti',
      description: 'Witness the iconic choreographic worship ritual from private boat mooring at Dashashwamedh Ghat.',
      location: 'Dashashwamedh Ghat',
      startTime: '18:00',
      endTime: '20:30',
      estimatedCost: 350,
      category: 'Culture',
      assignedTo: [orgDivya._id, user2._id, user3._id]
    },
    {
      trip: trip6._id,
      dayNumber: 5,
      date: tCompEnd,
      title: 'Assi Ghat Morning Yoga & Kachori Jalebi Walk',
      description: 'Sunrise riverside pranayama followed by the famous traditional Banarasi kachori, sabzi, and hot jalebis.',
      location: 'Assi Ghat Chowk',
      startTime: '06:30',
      endTime: '09:30',
      estimatedCost: 200,
      category: 'Food & Dining',
      assignedTo: [orgDivya._id, user2._id, user3._id]
    }
  ]);

  // Expenses for trip6
  await Expense.create([
    {
      trip: trip6._id,
      paidBy: orgDivya._id,
      title: 'Dawn Wooden Boat Charter',
      amount: 3600,
      category: 'Activities',
      date: tCompStart,
      splitType: 'equal',
      splits: [
        { user: orgDivya._id, amount: 1200, hasPaid: true },
        { user: user2._id, amount: 1200, hasPaid: false },
        { user: user3._id, amount: 1200, hasPaid: false }
      ]
    },
    {
      trip: trip6._id,
      paidBy: user2._id,
      title: 'Sarnath Guided Archeology Tour',
      amount: 2400,
      category: 'Activities',
      date: new Date(tCompStart.getTime() + 2 * 86400000),
      splitType: 'equal',
      splits: [
        { user: orgDivya._id, amount: 800, hasPaid: false },
        { user: user2._id, amount: 800, hasPaid: true },
        { user: user3._id, amount: 800, hasPaid: false }
      ]
    }
  ]);

  // Diary entry for trip6
  await TravelDiaryEntry.create({
    trip: trip6._id,
    author: user2._id,
    dayNumber: 4,
    title: 'Echoing Bells and Floating Diyas on the Sacred Ganges',
    notes: 'The rhythm of clanging bells and towering brass lamps lit against the night sky left us spellbound. Hundreds of floating floral lights drifted past our boat.',
    mood: 'Relaxing',
    rating: 5,
    actualExpenses: 11200,
    highlights: ['Ganga Aarti spectacle', 'Morning boat ride at Assi', 'Ancient silk weaving loom visit'],
    photos: [
      { url: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80', caption: 'Evening Aarti on the riverbank.' }
    ]
  });

  console.log('[SEED] Creating Sample Join Requests...');
  await JoinRequest.create([
    {
      trip: trip2._id,
      user: user2._id,
      organiser: user1._id,
      status: 'approved',
      seatsRequested: 1,
      message: 'Hello Arjun! As an architecture photographer, I would love to document the forts and palaces on this trip.',
      requestedAt: new Date(Date.now() - 86400000 * 2),
      reviewedAt: new Date(Date.now() - 86400000)
    },
    {
      trip: trip5._id,
      user: user2._id,
      organiser: user1._id,
      status: 'approved',
      seatsRequested: 1,
      message: 'Excited to be on this coastal voyage!',
      requestedAt: new Date(Date.now() - 86400000 * 4),
      reviewedAt: new Date(Date.now() - 86400000 * 3)
    },
    {
      trip: trip6._id,
      user: user2._id,
      organiser: orgDivya._id,
      status: 'approved',
      seatsRequested: 1,
      message: 'Honoured to join this spiritual heritage expedition.',
      requestedAt: new Date(Date.now() - 86400000 * 25),
      reviewedAt: new Date(Date.now() - 86400000 * 22)
    },
    {
      trip: trip3._id,
      user: user3._id,
      organiser: user1._id,
      status: 'pending',
      seatsRequested: 2,
      message: 'Hi Arjun! My cousin and I are eager to join this Kerala backwaters expedition.',
      requestedAt: new Date(Date.now() - 3600000 * 6)
    },
    {
      trip: trip3._id,
      user: user2._id,
      organiser: user1._id,
      status: 'pending',
      seatsRequested: 1,
      message: 'Would love to join if there is still a spot left!',
      requestedAt: new Date(Date.now() - 3600000 * 2)
    }
  ]);

  console.log('[SEED] Creating Sample Mystery Miles Trip...');
  const mysteryRevealDate = new Date();
  mysteryRevealDate.setDate(mysteryRevealDate.getDate() + 3); // Reveals in 3 days

  const mysteryDepDate = new Date();
  mysteryDepDate.setDate(mysteryDepDate.getDate() + 10);
  const mysteryRetDate = new Date(mysteryDepDate);
  mysteryRetDate.setDate(mysteryRetDate.getDate() + 4);

  await MysteryTrip.create({
    title: 'Enchanted Mist & Spice Trails',
    description: 'An exclusive surprise escape into misty peaks, secret tea ridges, and cloud-cloaked valleys. Destination coordinates remain completely encrypted until the live countdown ends!',
    destinationSecret: 'Munnar, Kerala',
    destinationHint: 'Perched in the Western Ghats where rolling emerald tea terraces kiss the drifting clouds',
    coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    revealedCoverImage: 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=1200&q=80',
    departureDate: mysteryDepDate,
    returnDate: mysteryRetDate,
    budgetMin: 6000,
    budgetMax: 14000,
    price: 8999,
    currency: 'INR',
    maxParticipants: 12,
    availableSeats: 10,
    organiserId: user1._id,
    revealAt: mysteryRevealDate,
    isRevealed: false,
    status: 'published',
    clues: [
      {
        clueText: 'Perched high in the Western Ghats where three mountain streams converge in misty harmony.',
        releaseDate: new Date(Date.now() - 86400000 * 2),
        isReleased: true
      },
      {
        clueText: 'Emerald velvet carpets roll across jagged peaks where the rare, endangered Nilgiri Tahr grazes freely.',
        releaseDate: new Date(Date.now() - 86400000),
        isReleased: true
      },
      {
        clueText: 'The crisp morning air carries the intoxicating aroma of wild cardamom, black pepper, and fresh orthodox tea leaves.',
        releaseDate: new Date(),
        isReleased: true
      }
    ],
    itinerary: [
      {
        dayNumber: 1,
        title: 'Secret Mountain Basecamp Arrival',
        description: 'Meet at the designated airport hub, luxury bus transfer to secluded plantation retreat, evening welcome bonfire.',
        time: '14:00'
      },
      {
        dayNumber: 2,
        title: 'Cloud Peak Trek & World Highest Tea Estate',
        description: 'Early 4x4 jeep safari up Kolukkumalai tea terrace, watch clouds below your feet, artisanal tea tasting session.',
        time: '06:00'
      },
      {
        dayNumber: 3,
        title: 'Cascades & Hidden Valley Safari',
        description: 'Hike to secluded waterfall lagoons, dip in natural spring pools, and traditional Kerala Sadhya on banana leaf.',
        time: '09:00'
      }
    ],
    travelInstructions: 'Pack light thermal fleece, comfortable hiking boots, waterproof poncho, and your camera. Official assembly at Kochi Airport Terminal 1 at 09:00 AM on departure day.',
    accommodationDetails: 'Boutique heritage eco-lodge nestled directly inside an active organic spice & tea estate with panoramic mountain views.',
    participants: [
      {
        user: user2._id,
        status: 'approved',
        message: 'Can not wait to uncover where this leads!',
        requestedAt: new Date(Date.now() - 86400000),
        approvedAt: new Date()
      },
      {
        user: user3._id,
        status: 'pending',
        message: 'Count me in for the surprise adventure!',
        requestedAt: new Date(Date.now() - 3600000)
      }
    ]
  });

  console.log('[SEED] Seeding User Wishlists...');
  const manali = await Destination.findOne({ name: 'Manali' });
  const goa = await Destination.findOne({ name: 'Goa' });
  const ladakh = await Destination.findOne({ name: 'Leh Ladakh' });
  const rishikesh = await Destination.findOne({ name: 'Rishikesh' });
  const spiti = await Destination.findOne({ name: 'Spiti Valley' });

  const wishlistEntries = [];
  if (manali) wishlistEntries.push({ userId: user2._id, destinationId: manali._id });
  if (goa) wishlistEntries.push({ userId: user2._id, destinationId: goa._id });
  if (ladakh) wishlistEntries.push({ userId: user2._id, destinationId: ladakh._id });
  if (rishikesh) wishlistEntries.push({ userId: user3._id, destinationId: rishikesh._id });
  if (spiti) wishlistEntries.push({ userId: user3._id, destinationId: spiti._id });

  if (wishlistEntries.length > 0) {
    await Wishlist.insertMany(wishlistEntries);
  }

  console.log('[SEED] Seeding Completed Successfully! All demo accounts & trips ready.\n');
}

if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      await seed();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('[SEED] Fatal error:', err);
      process.exit(1);
    }
  })();
}

module.exports = { seed };
