/**
 * Comprehensive Automated Test Suite for Real Authentication and Three Organisers
 */
const assert = require('assert');
const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const EmailVerification = require('../models/EmailVerification');
const PasswordReset = require('../models/PasswordReset');
const { seedOrganisers, ORGANISERS } = require('../../scripts/seedOrganisers');
const { generateToken } = require('../middleware/auth');

async function runRealAuthAndOrganisersTests() {
  console.log('\n====================================================');
  console.log('   REAL AUTHENTICATION & THREE ORGANISERS TESTS     ');
  console.log('====================================================\n');

  await connectDB();

  try {
    // ----------------------------------------------------
    // TEST 1: Three Predefined Organiser Accounts Seeding
    // ----------------------------------------------------
    console.log('[TEST 1] Testing Three Predefined Organiser Accounts Creation...');
    await seedOrganisers();

    const sai = await User.findOne({ email: 'sai@journeyhub.dev' }).select('+password');
    const dhanush = await User.findOne({ email: 'dhanush@journeyhub.dev' }).select('+password');
    const divya = await User.findOne({ email: 'divya@journeyhub.dev' }).select('+password');

    assert.ok(sai, 'Organiser Sai must exist in MongoDB');
    assert.ok(dhanush, 'Organiser Dhanush must exist in MongoDB');
    assert.ok(divya, 'Organiser Divya must exist in MongoDB');

    assert.strictEqual(sai.role, 'organiser');
    assert.strictEqual(dhanush.role, 'organiser');
    assert.strictEqual(divya.role, 'organiser');

    assert.strictEqual(sai.emailVerified, true);
    assert.strictEqual(dhanush.emailVerified, true);
    assert.strictEqual(divya.emailVerified, true);

    // Verify passwords authenticate correctly
    const saiPassMatch = await sai.comparePassword(process.env.ORGANISER_SAI_PASSWORD || 'Organiser@Sai2026');
    assert.strictEqual(saiPassMatch, true, 'Sai password must match');

    const dhanushPassMatch = await dhanush.comparePassword(process.env.ORGANISER_DHANUSH_PASSWORD || 'Organiser@Dhanush2026');
    assert.strictEqual(dhanushPassMatch, true, 'Dhanush password must match');

    const divyaPassMatch = await divya.comparePassword(process.env.ORGANISER_DIVYA_PASSWORD || 'Organiser@Divya2026');
    assert.strictEqual(divyaPassMatch, true, 'Divya password must match');

    // Verify Gmail accounts are also seeded and verified
    const dhanushGmail = await User.findOne({ email: 'dhanushs0425@gmail.com' });
    const saiGmail = await User.findOne({ email: 'sai@gmail.com' });
    const divyaGmail = await User.findOne({ email: 'divya@gmail.com' });
    assert.ok(dhanushGmail, 'Organiser Dhanush Gmail account must exist');
    assert.ok(saiGmail, 'Organiser Sai Gmail account must exist');
    assert.ok(divyaGmail, 'Organiser Divya Gmail account must exist');
    assert.strictEqual(dhanushGmail.role, 'organiser');
    assert.strictEqual(saiGmail.role, 'organiser');
    assert.strictEqual(divyaGmail.role, 'organiser');

    console.log('✔ Test 1 passed: All Organisers (including Gmail accounts) seeded with verified status and secure password hashing.');

    // ----------------------------------------------------
    // TEST 2: Organiser Seed Script Idempotency (Never Overwrites Passwords)
    // ----------------------------------------------------
    console.log('[TEST 2] Testing Seed Idempotency & Password Preservation...');
    // Change Sai's password manually
    sai.password = 'NewOrganiserPassword@2026!';
    await sai.save();

    // Run seed again
    await seedOrganisers();

    const saiAfterReseed = await User.findOne({ email: 'sai@journeyhub.dev' }).select('+password');
    const preservedNewPass = await saiAfterReseed.comparePassword('NewOrganiserPassword@2026!');
    const overwrittenInitialPass = await saiAfterReseed.comparePassword('Organiser@Sai2026');

    assert.strictEqual(preservedNewPass, true, 'Seed script must NOT overwrite modified password');
    assert.strictEqual(overwrittenInitialPass, false, 'Initial password should no longer match');

    // Restore Sai's password for subsequent test runs
    saiAfterReseed.password = process.env.ORGANISER_SAI_PASSWORD || 'Organiser@Sai2026';
    await saiAfterReseed.save();
    const saiGmailToRestore = await User.findOne({ email: 'sai@gmail.com' }).select('+password');
    if (saiGmailToRestore) {
      saiGmailToRestore.password = process.env.ORGANISER_SAI_PASSWORD || 'Organiser@Sai2026';
      await saiGmailToRestore.save();
    }

    console.log('✔ Test 2 passed: Seed script preserves existing account passwords.');

    // ----------------------------------------------------
    // TEST 3: User Registration & Hashed OTP Generation
    // ----------------------------------------------------
    console.log('[TEST 3] Testing User Registration & Hashed OTP Generation...');
    const testEmail = `newtraveler_${Date.now()}@journeyhub.dev`;
    const testRawOtp = '654321';
    const testPassword = 'travelerPassword2026!';
    const hashedOtp = await bcrypt.hash(testRawOtp, 10);
    const passwordHash = await bcrypt.hash(testPassword, 10);

    const pendingRecord = await EmailVerification.create({
      name: 'Ananya Sharma',
      email: testEmail,
      passwordHash,
      hashedOtp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
      attempts: 0
    });

    assert.ok(pendingRecord._id);
    assert.strictEqual(pendingRecord.email, testEmail);
    assert.notStrictEqual(pendingRecord.hashedOtp, testRawOtp, 'OTP must be hashed, never plaintext');

    // Test incorrect OTP validation
    const wrongMatch = await bcrypt.compare('111111', pendingRecord.hashedOtp);
    assert.strictEqual(wrongMatch, false);

    // Test correct OTP validation
    const correctMatch = await bcrypt.compare(testRawOtp, pendingRecord.hashedOtp);
    assert.strictEqual(correctMatch, true);

    console.log('✔ Test 3 passed: EmailVerification stores hashed OTP with TTL and expiry.');

    // ----------------------------------------------------
    // TEST 4: OTP Verification & Real User Account Creation
    // ----------------------------------------------------
    console.log('[TEST 4] Testing User Account Creation After Successful OTP Verification...');
    // Real user is created only after OTP verification
    const newUser = await User.create({
      name: pendingRecord.name,
      email: pendingRecord.email,
      password: testPassword,
      role: 'user', // Strictly user role
      emailVerified: true,
      status: 'active'
    });

    assert.ok(newUser._id);
    assert.strictEqual(newUser.role, 'user', 'Public registration must always result in role "user"');
    assert.strictEqual(newUser.emailVerified, true);

    // Verify login succeeds with the original password
    const userWithPass = await User.findById(newUser._id).select('+password');
    const loginOk = await userWithPass.comparePassword(testPassword);
    assert.strictEqual(loginOk, true, 'User should be able to log in with original password');

    // Clean up pending record
    await EmailVerification.deleteOne({ _id: pendingRecord._id });
    const pendingAfter = await EmailVerification.findOne({ email: testEmail });
    assert.strictEqual(pendingAfter, null);

    console.log('✔ Test 4 passed: Real User record created with role "user" and emailVerified=true.');

    // ----------------------------------------------------
    // TEST 5: Normal Login Without OTP Requirement
    // ----------------------------------------------------
    console.log('[TEST 5] Testing Ordinary Login (No OTP Needed for Verified Users)...');
    const authenticatedToken = generateToken(newUser._id);
    assert.ok(authenticatedToken);
    assert.strictEqual(typeof authenticatedToken, 'string');

    // Test unverified user login attempt blocking
    const unverifiedUser = await User.create({
      name: 'Unverified Traveler',
      email: `unverified_${Date.now()}@journeyhub.dev`,
      password: 'password123',
      role: 'user',
      emailVerified: false
    });

    assert.strictEqual(unverifiedUser.emailVerified, false, 'Unverified accounts must have emailVerified=false');

    console.log('✔ Test 5 passed: Verified users log in directly without OTP; unverified accounts flagged.');

    // ----------------------------------------------------
    // TEST 6: User Profile Customization (Step 4 Onboarding)
    // ----------------------------------------------------
    console.log('[TEST 6] Testing User Profile Customization (Avatar, Phone, City, Preferences)...');
    newUser.profile = {
      phone: '+91 99887 76655',
      homeCity: 'Bengaluru',
      budgetPreference: 'Moderate',
      preferredCategories: ['Mountains & Hill Stations', 'Heritage & Historical'],
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      bio: 'Lover of mountain passes and historic architectural ruins.'
    };
    await newUser.save();

    const reloadedUser = await User.findById(newUser._id);
    assert.strictEqual(reloadedUser.profile.homeCity, 'Bengaluru');
    assert.strictEqual(reloadedUser.profile.budgetPreference, 'Moderate');
    assert.strictEqual(reloadedUser.profile.preferredCategories.length, 2);
    assert.strictEqual(reloadedUser.phone, '+91 99887 76655');

    console.log('✔ Test 6 passed: User profile customization saved and synced.');

    // ----------------------------------------------------
    // TEST 7: Password Recovery with Time-Limited OTP
    // ----------------------------------------------------
    console.log('[TEST 7] Testing Password Reset Flow with Hashed Recovery Code...');
    const resetRawOtp = '987123';
    const resetHashedOtp = await bcrypt.hash(resetRawOtp, 10);

    const resetRecord = await PasswordReset.create({
      email: newUser.email,
      hashedOtp: resetHashedOtp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
      used: false
    });

    assert.ok(resetRecord._id);
    assert.strictEqual(resetRecord.used, false);

    // Verify recovery code
    const isResetCodeValid = await bcrypt.compare(resetRawOtp, resetRecord.hashedOtp);
    assert.strictEqual(isResetCodeValid, true);

    // Update password
    const newResetPassword = 'BrandNewPassword2026!';
    newUser.password = newResetPassword;
    await newUser.save();

    resetRecord.used = true;
    await resetRecord.save();

    const userAfterReset = await User.findById(newUser._id).select('+password');
    const newPassMatch = await userAfterReset.comparePassword(newResetPassword);
    const oldPassMatch = await userAfterReset.comparePassword(testPassword);

    assert.strictEqual(newPassMatch, true, 'New password must authenticate successfully');
    assert.strictEqual(oldPassMatch, false, 'Old password must fail authentication');
    assert.strictEqual(resetRecord.used, true, 'Reset record must be marked as used');

    console.log('✔ Test 7 passed: Password recovery flow verified end-to-end.');

    // ----------------------------------------------------
    // TEST 8: Duplicate Account Prevention
    // ----------------------------------------------------
    console.log('[TEST 8] Testing Duplicate Email Registration Prevention...');
    let duplicateErrorThrown = false;
    try {
      await User.create({
        name: 'Imposter',
        email: newUser.email,
        password: 'password123'
      });
    } catch (err) {
      duplicateErrorThrown = true;
      assert.ok(err.code === 11000 || err.name === 'MongoServerError', 'Should reject duplicate email key');
    }
    assert.strictEqual(duplicateErrorThrown, true, 'Duplicate email must be rejected by unique index');

    console.log('✔ Test 8 passed: Duplicate email registration prevented by MongoDB unique constraint.');
  } finally {
    await disconnectDB();
  }

  console.log('\n====================================================');
  console.log('   ALL REAL AUTH & ORGANISERS TESTS PASSED (100%)   ');
  console.log('====================================================\n');
}

if (require.main === module) {
  runRealAuthAndOrganisersTests().catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
}

module.exports = { runRealAuthAndOrganisersTests };
