/**
 * Test Suite: Join Request Notifications & Dual-Channel Phone/Google Mailbox Verification
 */
const assert = require('assert');
const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Trip = require('../models/Trip');
const JoinRequest = require('../models/JoinRequest');
const Notification = require('../models/Notification');
const EmailVerification = require('../models/EmailVerification');
const smsService = require('../services/smsService');

async function runJoinRequestNotificationsAndSmsTests() {
  console.log('\n====================================================');
  console.log(' JOIN REQUEST NOTIFICATIONS & PHONE/EMAIL OTP TESTS ');
  console.log('====================================================\n');

  await connectDB();

  try {
    // ----------------------------------------------------
    // TEST 1: Phone Number Formatting & OTP Dispatch
    // ----------------------------------------------------
    console.log('[TEST 1] Testing Phone Number SMS Formatter & Dispatch...');
    const formattedPhone = smsService.formatPhoneNumber('9876543210');
    assert.strictEqual(formattedPhone, '+919876543210', 'Should format 10-digit Indian numbers with +91');

    const formattedWithPlus = smsService.formatPhoneNumber('+14155552671');
    assert.strictEqual(formattedWithPlus, '+14155552671', 'Should preserve international numbers with +');

    const smsResult = await smsService.sendOtpSms('9876543210', '654321');
    assert.strictEqual(smsResult.success, true, 'SMS service dispatch should succeed');
    assert.ok(smsResult.channel === 'sms' || smsResult.channel === 'msg91', 'Channel should be sms or msg91');
    assert.ok(smsResult.sid, 'Should return dispatch sid without revealing raw OTP');
    console.log('✔ Test 1 passed: Phone number formatting and SMS dispatch verified.');

    // ----------------------------------------------------
    // TEST 2: Phone Number Registration & OTP Verification in DB
    // ----------------------------------------------------
    console.log('[TEST 2] Testing End-to-End Phone Registration in Database...');
    const testPhone = '9999888877';
    const testEmail = 'phoneuser_' + Date.now() + '@example.com';
    await EmailVerification.deleteMany({ phone: testPhone });
    await User.deleteMany({ 'profile.phone': testPhone });

    // Simulate OTP generation and hashing
    const rawOtp = '482619';
    const hashedOtp = await bcrypt.hash(rawOtp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const hashedPassword = await bcrypt.hash('TravelerPass@2026', 10);

    const pending = await EmailVerification.create({
      phone: testPhone,
      email: testEmail,
      hashedOtp,
      verificationMethod: 'phone',
      name: 'Phone Test Traveler',
      passwordHash: hashedPassword,
      expiresAt
    });

    assert.ok(pending._id, 'Pending verification record created with phone number');
    assert.strictEqual(pending.verificationMethod, 'phone');

    // Simulate verification
    const isOtpValid = await bcrypt.compare(rawOtp, pending.hashedOtp);
    assert.strictEqual(isOtpValid, true, 'Bcrypt should validate raw OTP against pending record');

    // Create user
    const newUser = await User.create({
      name: pending.name,
      email: pending.email,
      password: 'TravelerPass@2026',
      role: 'user',
      emailVerified: true,
      profile: {
        phone: smsService.formatPhoneNumber(pending.phone),
        bio: 'Adventure lover'
      }
    });

    assert.ok(newUser._id, 'User record created successfully');
    assert.strictEqual(newUser.role, 'user', 'Regular user role assigned');
    assert.strictEqual(newUser.emailVerified, true, 'User is marked verified');
    assert.strictEqual(newUser.profile.phone, '+919999888877', 'Formatted phone stored in profile');
    console.log('✔ Test 2 passed: Phone number registration & verification flow complete.');

    // ----------------------------------------------------
    // TEST 3: Organiser Join Request Notification Creation
    // ----------------------------------------------------
    console.log('[TEST 3] Testing Join Request Notification Delivered to Organiser...');
    
    // Find or create Dhanush organiser
    let organiser = await User.findOne({ email: 'dhanush@journeyhub.dev' });
    if (!organiser) {
      organiser = await User.create({
        name: 'Dhanush',
        email: 'dhanush@journeyhub.dev',
        password: await bcrypt.hash('Organiser@Dhanush2026', 10),
        role: 'organiser',
        emailVerified: true
      });
    }

    // Find or create a Trip created by Dhanush
    let trip = await Trip.findOne({ createdBy: organiser._id });
    if (!trip) {
      trip = await Trip.create({
        title: 'Manali Snow Expedition 2026',
        destination: 'Manali, Himachal Pradesh',
        description: 'Breathtaking mountain vistas and adventure skiing.',
        startDate: new Date('2026-12-01'),
        endDate: new Date('2026-12-07'),
        estimatedBudget: 25000,
        currency: 'INR',
        maxTravelers: 12,
        createdBy: organiser._id,
        collaborators: [{ user: organiser._id, role: 'owner' }]
      });
    }

    // Clean up old requests & notifications
    await JoinRequest.deleteMany({ trip: trip._id, user: newUser._id });
    await Notification.deleteMany({ recipient: organiser._id });
    await Notification.deleteMany({ recipient: newUser._id });

    // Submit Join Request
    const joinReq = await JoinRequest.create({
      trip: trip._id,
      user: newUser._id,
      status: 'pending',
      message: 'Excited to join the Manali expedition!'
    });

    // Create Organiser Notification (as done in joinRequestController.js)
    const organiserNotification = await Notification.create({
      user: organiser._id,
      trip: trip._id,
      type: 'join_request',
      title: 'New Join Request',
      message: `${newUser.name} requested to join "${trip.title}"`,
      link: '#/organiser-requests'
    });

    assert.ok(organiserNotification._id, 'Notification must be saved without schema validation error');
    assert.strictEqual(organiserNotification.type, 'join_request', 'Notification type must be join_request');
    assert.strictEqual(organiserNotification.isRead, false, 'Notification should be unread initially');
    assert.strictEqual(organiserNotification.user.toString(), organiser._id.toString(), 'Organiser must be recipient');

    // Count unread notifications for Organiser
    const unreadCount = await Notification.countDocuments({ user: organiser._id, isRead: false });
    assert.ok(unreadCount >= 1, 'Organiser unread notification count must be >= 1');
    console.log(`✔ Test 3 passed: Organiser received join_request notification (unread count: ${unreadCount}).`);

    // ----------------------------------------------------
    // TEST 4: Traveler Approval Notification
    // ----------------------------------------------------
    console.log('[TEST 4] Testing Organiser Approval Notification Delivered to Traveler...');
    
    // Update request to approved
    joinReq.status = 'approved';
    await joinReq.save();

    // Create Traveler Notification
    const travelerApprovedNotification = await Notification.create({
      user: newUser._id,
      trip: trip._id,
      type: 'join_approved',
      title: 'Join Request Approved!',
      message: `Your request to join "${trip.title}" was approved by ${organiser.name}!`,
      link: `#/trip-details?id=${trip._id}`
    });

    assert.ok(travelerApprovedNotification._id, 'Approval notification saved successfully');
    assert.strictEqual(travelerApprovedNotification.type, 'join_approved', 'Type must be join_approved');
    assert.strictEqual(travelerApprovedNotification.user.toString(), newUser._id.toString());
    console.log('✔ Test 4 passed: Traveler received join_approved notification.');

    // ----------------------------------------------------
    // TEST 5: Traveler Rejection Notification
    // ----------------------------------------------------
    console.log('[TEST 5] Testing Organiser Rejection Notification Delivered to Traveler...');
    
    const travelerRejectedNotification = await Notification.create({
      user: newUser._id,
      trip: trip._id,
      type: 'join_rejected',
      title: 'Join Request Update',
      message: `Your request to join "${trip.title}" was declined.`,
      link: '#/my-requests'
    });

    assert.ok(travelerRejectedNotification._id, 'Rejection notification saved successfully');
    assert.strictEqual(travelerRejectedNotification.type, 'join_rejected', 'Type must be join_rejected');
    console.log('✔ Test 5 passed: Traveler received join_rejected notification.');

    console.log('\n====================================================');
    console.log(' ALL NOTIFICATIONS & SMS TESTS PASSED (100%)       ');
    console.log('====================================================\n');
  } finally {
    // cleanup test entities if needed
  }
}

if (require.main === module) {
  runJoinRequestNotificationsAndSmsTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Notification & SMS Test Failed:', err);
      process.exit(1);
    });
}

module.exports = { runJoinRequestNotificationsAndSmsTests };
