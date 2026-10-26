require('../src/config/env');
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');

const ORGANISERS = [
  {
    name: 'Dhanush',
    email: 'dhanush@gmail.com',
    aliases: ['dhanushs0425@gmail.com', 'dhanush@journeyhub.dev'],
    role: 'organiser',
    passwordEnvVar: 'ORGANISER_DHANUSH_PASSWORD',
    defaultPassword: 'Organiser@Dhanush2026',
    phone: '+91 98450 22002',
    bio: 'Senior Tour Curator & Organiser at JourneyHub. Crafting seamless coastal and heritage journeys.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80'
  },
  {
    name: 'Sai',
    email: 'sai@gmail.com',
    aliases: ['sai.journeyhub@gmail.com', 'sai@journeyhub.dev'],
    role: 'organiser',
    passwordEnvVar: 'ORGANISER_SAI_PASSWORD',
    defaultPassword: 'Organiser@Sai2026',
    phone: '+91 98450 11001',
    bio: 'Head of Expeditions & Organiser at JourneyHub. Specialist in mountain trails and Himalayan treks.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80'
  },
  {
    name: 'Divya',
    email: 'divya@gmail.com',
    aliases: ['divya.journeyhub@gmail.com', 'divya@journeyhub.dev'],
    role: 'organiser',
    passwordEnvVar: 'ORGANISER_DIVYA_PASSWORD',
    defaultPassword: 'Organiser@Divya2026',
    phone: '+91 98450 33003',
    bio: 'Cultural & Mystery Miles Expedition Organiser at JourneyHub. Wildlife and heritage aficionado.',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'
  }
];

/**
 * Seed the predefined Organisers into MongoDB.
 * Never overwrites passwords if account already exists.
 */
async function seedOrganisers() {
  console.log('[SEED] Checking predefined Organiser accounts (Gmail & JourneyHub)...');
  const results = [];

  for (const org of ORGANISERS) {
    const allEmails = [org.email, ...(org.aliases || [])];
    const rawPassword =
      process.env[org.passwordEnvVar] ||
      process.env.ORGANISER_DEFAULT_PASSWORD ||
      org.defaultPassword;

    for (const emailTarget of allEmails) {
      const email = emailTarget.toLowerCase().trim();
      const existing = await User.findOne({ email });

      if (existing) {
        console.log(`[SEED] Organiser account "${org.name}" (${email}) already exists. Preserving existing password.`);
        if (existing.role !== 'organiser' || !existing.emailVerified) {
          existing.role = 'organiser';
          existing.emailVerified = true;
          await existing.save();
        }
        results.push({ name: org.name, email, status: 'already_exists' });
        continue;
      }

      const created = await User.create({
        name: org.name,
        email,
        password: rawPassword, // Hashed by User pre-save hook
        role: 'organiser',
        emailVerified: true,
        status: 'active',
        avatar: org.avatar,
        phone: org.phone,
        bio: org.bio,
        profile: {
          avatar: org.avatar,
          phone: org.phone,
          bio: org.bio,
          homeCity: 'Bengaluru',
          budgetPreference: 'Moderate',
          preferredCategories: ['Mountains', 'Heritage', 'Adventure']
        },
        preferences: {
          currency: 'INR',
          budgetAlertThreshold: 85,
          theme: 'navy',
          emailNotifications: true
        },
        travelInterests: ['Mountains', 'Heritage', 'Adventure']
      });

      console.log(`[SEED] Created Organiser account: "${created.name}" (${created.email}) [Role: ${created.role}]`);
      results.push({ name: org.name, email, status: 'created' });
    }
  }

  // Predefined Verified Test Traveler
  const TEST_TRAVELERS = [
    {
      name: 'Kavya Raman',
      email: 'kavya@journeyhub.dev',
      role: 'user',
      rawPassword: 'Traveler@2026!',
      phone: '9876500001',
      bio: 'Passionate globetrotter exploring incredible destinations across India.',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'
    }
  ];

  for (const trav of TEST_TRAVELERS) {
    const email = trav.email.toLowerCase().trim();
    const existingTrav = await User.findOne({
      $or: [
        { email },
        { phone: trav.phone }
      ]
    });

    if (!existingTrav) {
      const createdTrav = await User.create({
        name: trav.name,
        email,
        phone: trav.phone,
        password: trav.rawPassword, // Automatically hashed by User pre-save hook
        role: 'user',
        emailVerified: true,
        phoneVerified: true,
        verificationMethod: 'password',
        status: 'active',
        avatar: trav.avatar,
        bio: trav.bio,
        profile: {
          avatar: trav.avatar,
          phone: trav.phone,
          bio: trav.bio,
          homeCity: 'Bengaluru',
          budgetPreference: 'Moderate',
          preferredCategories: ['Beaches', 'Mountains', 'Cultural']
        },
        preferences: {
          currency: 'INR',
          theme: 'navy',
          emailNotifications: true
        },
        travelInterests: ['Beaches', 'Mountains', 'Cultural']
      });
      console.log(`[SEED] Created Test Traveler account: "${createdTrav.name}" (${createdTrav.email})`);
      results.push({ name: trav.name, email, status: 'created' });
    } else {
      console.log(`[SEED] Test Traveler account "${trav.name}" (${email}) already exists.`);
      results.push({ name: trav.name, email, status: 'already_exists' });
    }
  }

  console.log('[SEED] Organiser and Test Traveler seeding completed successfully.');
  return results;
}

// Standalone execution support
if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      await seedOrganisers();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('[SEED ERROR] Failed to seed Organisers:', err);
      process.exit(1);
    }
  })();
}

module.exports = { seedOrganisers, ORGANISERS };
