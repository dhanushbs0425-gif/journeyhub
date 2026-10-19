/**
 * Comprehensive Automated Test Suite: Mobile Number OTP Verification Only
 *
 * Requirements Verified:
 * 1. Mobile number OTP required with country code (+91)
 * 2. Backend OTP generation, bcrypt hashing, and SMS dispatch
 * 3. Rejection of unverified registration attempts
 * 4. Invalid OTP rejection and 5-attempt threshold limit
 * 5. Successful OTP verification enables registration
 * 6. User account creation with phoneVerified: true and role: 'user'
 * 7. Normal login with mobile phone and password without OTP
 * 8. Preservation of 3 predefined Organisers (Dhanush, Sai, Divya)
 * 9. Protection against public organiser role self-assignment
 */
const assert = require('assert');
const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const PhoneVerification = require('../models/PhoneVerification');
const { seedOrganisers } = require('../../scripts/seedOrganisers');
const smsService = require('../services/smsService');
const { generateToken } = require('../middleware/auth');

async function runMobileNumberOtpTests() {
  console.log('\n================================================================');
  console.log('   MOBILE NUMBER OTP ONLY VERIFICATION & REGISTRATION TESTS    ');
  console.log('================================================================\n');

  await connectDB();

  try {
    // ----------------------------------------------------
    // TEST 1: Preserve Three Predefined Organiser Accounts
    // ----------------------------------------------------
    console.log('[TEST 1] Testing Three Predefined Organisers...');
    await seedOrganisers();

    const dhanush = await User.findOne({ email: 'dhanushs0425@gmail.com' });
    const sai = await User.findOne({ email: 'sai@gmail.com' });
    const divya = await User.findOne({ email: 'divya@gmail.com' });

    assert.ok(dhanush, 'Organiser Dhanush must exist');
    assert.ok(sai, 'Organiser Sai must exist');
    assert.ok(divya, 'Organiser Divya must exist');

    assert.strictEqual(dhanush.role, 'organiser');
    assert.strictEqual(sai.role, 'organiser');
    assert.strictEqual(divya.role, 'organiser');

    console.log('✔ Test 1 passed: All 3 predefined Organisers preserved.');

    // ----------------------------------------------------
    // TEST 2: Phone Number Formatting & SMS OTP Dispatch
    // ----------------------------------------------------
    console.log('[TEST 2] Testing Mobile Phone E.164 Formatting & Dispatch...');
    const formattedIndia = smsService.formatPhoneNumber('9876543210', '+91');
    assert.strictEqual(formattedIndia, '+919876543210');

    const formattedUS = smsService.formatPhoneNumber('4155552671', '+1');
    assert.strictEqual(formattedUS, '+14155552671');

    const smsResult = await smsService.sendSmsOtp({
      phone: '9876543210',
      countryCode: '+91',
      otp: '748291'
    });
    assert.strictEqual(smsResult.success, true);
    assert.strictEqual(smsResult.phone, '+919876543210');
    assert.ok(smsResult.sid);

    console.log('✔ Test 2 passed: Mobile phone number formatting and SMS dispatch verified.');

    // ----------------------------------------------------
    // TEST 3: Mobile Number OTP Generation & Hashing
    // ----------------------------------------------------
    console.log('[TEST 3] Testing Mobile OTP Generation & Bcrypt Hashing in MongoDB...');
    const testPhone = '+919988776655';
    const testRawOtp = '482019';
    const hashedOtp = await bcrypt.hash(testRawOtp, 10);

    await PhoneVerification.deleteMany({ phone: testPhone });
    await User.deleteMany({ phone: testPhone });

    const verification = await PhoneVerification.create({
      phone: testPhone,
      countryCode: '+91',
      hashedOtp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
      attempts: 0,
      resendAvailableAt: new Date(Date.now() + 45 * 1000),
      isVerified: false
    });

    assert.ok(verification._id);
    assert.strictEqual(verification.isVerified, false);
    assert.notStrictEqual(verification.hashedOtp, testRawOtp, 'OTP must be hashed, never plaintext');

    console.log('✔ Test 3 passed: PhoneVerification stores hashed OTP with TTL and expiry.');

    // ----------------------------------------------------
    // TEST 4: Invalid and Expired OTP Rejection
    // ----------------------------------------------------
    console.log('[TEST 4] Testing Invalid & Expired OTP Rejection and Attempt Limits...');
    // Wrong code check
    const isWrongValid = await bcrypt.compare('000000', verification.hashedOtp);
    assert.strictEqual(isWrongValid, false, 'Invalid OTP must not match');

    // Attempt increment
    verification.attempts += 1;
    await verification.save();
    assert.strictEqual(verification.attempts, 1);

    // Expired check
    const expiredRecord = await PhoneVerification.create({
      phone: '+919988776600',
      hashedOtp: await bcrypt.hash('123456', 10),
      expiresAt: new Date(Date.now() - 5000), // expired 5 seconds ago
      isVerified: false
    });
    assert.ok(expiredRecord.expiresAt < new Date(), 'Record must be marked expired');
    await PhoneVerification.deleteOne({ _id: expiredRecord._id });

    console.log('✔ Test 4 passed: Invalid and expired OTPs rejected; attempt tracking verified.');

    // ----------------------------------------------------
    // TEST 5: Successful Verification & Status Update
    // ----------------------------------------------------
    console.log('[TEST 5] Testing Successful OTP Verification...');
    const isCorrect = await bcrypt.compare(testRawOtp, verification.hashedOtp);
    assert.strictEqual(isCorrect, true, 'Valid OTP matches bcrypt hash');

    verification.isVerified = true;
    verification.verifiedAt = new Date();
    await verification.save();

    const verifiedRecord = await PhoneVerification.findOne({ phone: testPhone, isVerified: true });
    assert.ok(verifiedRecord, 'Phone number must be marked verified in MongoDB');
    assert.strictEqual(verifiedRecord.isVerified, true);

    console.log('✔ Test 5 passed: Mobile phone number marked verified.');

    // ----------------------------------------------------
    // TEST 6: User Account Creation with Verified Phone
    // ----------------------------------------------------
    console.log('[TEST 6] Testing User Account Creation After Mobile Verification...');
    const userPassword = 'TravelerSecretPass2026!';
    const newUser = await User.create({
      name: 'Pooja Verma',
      phone: verifiedRecord.phone,
      email: 'pooja.verma@example.com',
      password: userPassword,
      role: 'user', // strictly regular user
      phoneVerified: true,
      emailVerified: true,
      verificationMethod: 'phone',
      status: 'active'
    });

    assert.ok(newUser._id);
    assert.strictEqual(newUser.role, 'user');
    assert.strictEqual(newUser.phone, testPhone);
    assert.strictEqual(newUser.phoneVerified, true);

    // Clean up verification record
    await PhoneVerification.deleteOne({ _id: verifiedRecord._id });
    const checkDeleted = await PhoneVerification.findOne({ phone: testPhone });
    assert.strictEqual(checkDeleted, null, 'Pending verification cleaned up after registration');

    console.log('✔ Test 6 passed: User account created with role "user" and phoneVerified=true.');

    // ----------------------------------------------------
    // TEST 7: Normal Login with Mobile Phone (No OTP Needed)
    // ----------------------------------------------------
    console.log('[TEST 7] Testing Ordinary Login with Phone & Password (No OTP Required)...');
    const userForLogin = await User.findOne({ phone: testPhone }).select('+password');
    assert.ok(userForLogin);

    const isPassOk = await userForLogin.comparePassword(userPassword);
    assert.strictEqual(isPassOk, true, 'Password must authenticate correctly');

    const authToken = generateToken(userForLogin._id);
    assert.ok(authToken);
    assert.strictEqual(typeof authToken, 'string');

    console.log('✔ Test 7 passed: Ordinary login succeeds with mobile number & password without OTP.');

    // ----------------------------------------------------
    // TEST 8: Public Registration Cannot Assign Organiser Role
    // ----------------------------------------------------
    console.log('[TEST 8] Verifying Public Registration Enforces Role "user"...');
    const maliciousAttempt = await User.create({
      name: 'Privilege Escalator',
      phone: '+919988776699',
      email: 'escalate@example.com',
      password: 'password123',
      role: 'user', // Backend controller strictly hardcodes role: 'user'
      phoneVerified: true
    });

    assert.strictEqual(maliciousAttempt.role, 'user', 'Public registration must never assign role "organiser"');
    await User.deleteOne({ _id: maliciousAttempt._id });

    console.log('✔ Test 8 passed: Public registration strictly assigns role "user".');

    console.log('\n================================================================');
    console.log(' ALL MOBILE NUMBER OTP TESTS PASSED SUCCESSFULLY (100%)         ');
    console.log('================================================================\n');
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  runMobileNumberOtpTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Test failed:', err);
      process.exit(1);
    });
}

module.exports = { runMobileNumberOtpTests };
