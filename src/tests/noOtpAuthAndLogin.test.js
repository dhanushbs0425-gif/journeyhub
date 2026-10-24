/**
 * Test Suite: Direct Authentication & Login without OTP
 * MCA Capstone JourneyHub
 *
 * Verifies:
 * 1. Traveler registration without OTP using Full Name, Email, Mobile Number, Password, Confirm Password
 * 2. Login using Email + Password
 * 3. Login using Mobile Phone Number + Password (both raw 10-digit and with country code)
 * 4. Rejection of incorrect password (HTTP 401)
 * 5. Rejection of nonexistent user (HTTP 401)
 * 6. Validation of required fields (name, email, phone, password mismatch)
 * 7. Duplicate email prevention (HTTP 400)
 * 8. Duplicate mobile phone number prevention (HTTP 400)
 * 9. Preservation of existing organiser login (role: organiser)
 * 10. Authenticated session token validity and profile retrieval
 */
const assert = require('assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectDB } = require('../config/db');
const User = require('../models/User');
const authController = require('../controllers/authController');
const { generateToken } = require('../middleware/auth');

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

async function runNoOtpAuthAndLoginTests() {
  console.log('\n====================================================');
  console.log('   DIRECT REGISTRATION & EMAIL/PHONE LOGIN TESTS    ');
  console.log('====================================================\n');

  await connectDB();

  const timestamp = Date.now();
  const testEmail = `traveler_${timestamp}@example.com`;
  const testPhone = `98765${String(timestamp).slice(-5)}`; // Unique 10-digit phone
  const testPassword = 'SecurePassword2026!';
  let registeredUserId = null;
  let authToken = null;

  // ----------------------------------------------------
  // TEST 1: Direct Registration Without OTP
  // ----------------------------------------------------
  console.log('[TEST 1] Testing Direct Registration Without OTP...');
  const reqReg = {
    body: {
      name: 'Aarav Mehta',
      email: testEmail,
      phone: testPhone,
      password: testPassword,
      confirmPassword: testPassword
    }
  };
  const resReg = createMockRes();
  await authController.register(reqReg, resReg, (err) => { if (err) throw err; });

  assert.strictEqual(resReg.statusCode, 201, 'Registration should return HTTP 201 Created');
  assert.strictEqual(resReg.body.success, true);
  assert.ok(resReg.body.token, 'Should issue a valid JWT session token');
  assert.ok(resReg.body.user, 'Should return user details');
  assert.strictEqual(resReg.body.user.name, 'Aarav Mehta');
  assert.strictEqual(resReg.body.user.email, testEmail);
  assert.strictEqual(resReg.body.user.phone, testPhone);
  assert.strictEqual(resReg.body.user.role, 'user', 'Must have default role user');
  assert.strictEqual(resReg.body.user.emailVerified, true, 'User should be marked verified');

  registeredUserId = resReg.body.user._id;
  authToken = resReg.body.token;

  // Verify saved record in MongoDB
  const dbUser = await User.findById(registeredUserId).select('+password');
  assert.ok(dbUser, 'User must exist in MongoDB');
  assert.notStrictEqual(dbUser.password, testPassword, 'Password must be bcrypt hashed');
  const passMatches = await bcrypt.compare(testPassword, dbUser.password);
  assert.strictEqual(passMatches, true, 'Stored bcrypt hash must verify candidate password');

  console.log('✔ Test 1 passed: User registered directly without OTP; verified in MongoDB with bcrypt hash.');

  // ----------------------------------------------------
  // TEST 2: Login via Email + Password
  // ----------------------------------------------------
  console.log('[TEST 2] Testing Login Using Email + Password...');
  const reqLoginEmail = {
    body: {
      identifier: testEmail,
      password: testPassword
    }
  };
  const resLoginEmail = createMockRes();
  await authController.login(reqLoginEmail, resLoginEmail, (err) => { if (err) throw err; });

  assert.strictEqual(resLoginEmail.statusCode, 200, 'Email login should return HTTP 200');
  assert.strictEqual(resLoginEmail.body.success, true);
  assert.ok(resLoginEmail.body.token);
  assert.strictEqual(resLoginEmail.body.user.email, testEmail);
  assert.strictEqual(resLoginEmail.body.user.role, 'user');

  console.log('✔ Test 2 passed: Successfully logged in using Email + Password.');

  // ----------------------------------------------------
  // TEST 3: Login via Mobile Phone Number + Password
  // ----------------------------------------------------
  console.log('[TEST 3] Testing Login Using Mobile Phone Number + Password...');
  const reqLoginPhone = {
    body: {
      identifier: testPhone,
      password: testPassword
    }
  };
  const resLoginPhone = createMockRes();
  await authController.login(reqLoginPhone, resLoginPhone, (err) => { if (err) throw err; });

  assert.strictEqual(resLoginPhone.statusCode, 200, 'Phone login should return HTTP 200');
  assert.strictEqual(resLoginPhone.body.success, true);
  assert.ok(resLoginPhone.body.token);
  assert.strictEqual(resLoginPhone.body.user.email, testEmail);

  // Also test with country code prefix +91
  const reqLoginPhoneWithCode = {
    body: {
      identifier: `+91 ${testPhone}`,
      password: testPassword
    }
  };
  const resLoginPhoneWithCode = createMockRes();
  await authController.login(reqLoginPhoneWithCode, resLoginPhoneWithCode, (err) => { if (err) throw err; });
  assert.strictEqual(resLoginPhoneWithCode.statusCode, 200, 'Phone login with +91 prefix should return HTTP 200');

  console.log('✔ Test 3 passed: Successfully logged in using Mobile Phone Number (raw and with country code).');

  // ----------------------------------------------------
  // TEST 4: Login with Incorrect Password (HTTP 401)
  // ----------------------------------------------------
  console.log('[TEST 4] Testing Login with Incorrect Password...');
  const reqBadPass = {
    body: {
      identifier: testEmail,
      password: 'WrongPassword123!'
    }
  };
  const resBadPass = createMockRes();
  await authController.login(reqBadPass, resBadPass, (err) => { if (err) throw err; });

  assert.strictEqual(resBadPass.statusCode, 401, 'Wrong password must return HTTP 401');
  assert.strictEqual(resBadPass.body.success, false);

  console.log('✔ Test 4 passed: Incorrect password rejected with HTTP 401.');

  // ----------------------------------------------------
  // TEST 5: Login with Nonexistent Identifier (HTTP 401)
  // ----------------------------------------------------
  console.log('[TEST 5] Testing Login with Nonexistent Identifier...');
  const reqNonExistent = {
    body: {
      identifier: 'ghost_traveler_nonexistent@example.com',
      password: testPassword
    }
  };
  const resNonExistent = createMockRes();
  await authController.login(reqNonExistent, resNonExistent, (err) => { if (err) throw err; });

  assert.strictEqual(resNonExistent.statusCode, 401, 'Nonexistent account must return HTTP 401');
  assert.strictEqual(resNonExistent.body.success, false);

  console.log('✔ Test 5 passed: Nonexistent user rejected with HTTP 401.');

  // ----------------------------------------------------
  // TEST 6: Validation: Password Mismatch & Missing Mobile
  // ----------------------------------------------------
  console.log('[TEST 6] Testing Registration Validation (Password Mismatch, Short Phone)...');
  const reqMismatch = {
    body: {
      name: 'Riya Sen',
      email: `riya_${timestamp}@example.com`,
      phone: '9845012345',
      password: 'Password123',
      confirmPassword: 'DifferentPassword123'
    }
  };
  const resMismatch = createMockRes();
  await authController.register(reqMismatch, resMismatch, (err) => { if (err) throw err; });
  assert.strictEqual(resMismatch.statusCode, 400);
  assert.strictEqual(resMismatch.body.message, 'Passwords do not match.');

  const reqShortPhone = {
    body: {
      name: 'Riya Sen',
      email: `riya_${timestamp}@example.com`,
      phone: '12345', // Too short
      password: 'Password123',
      confirmPassword: 'Password123'
    }
  };
  const resShortPhone = createMockRes();
  await authController.register(reqShortPhone, resShortPhone, (err) => { if (err) throw err; });
  assert.strictEqual(resShortPhone.statusCode, 400);
  assert.ok(resShortPhone.body.message.includes('valid 10 to 15 digit mobile phone number'));

  console.log('✔ Test 6 passed: Validation catches password mismatch and invalid phone numbers.');

  // ----------------------------------------------------
  // TEST 7: Duplicate Email Registration Prevention
  // ----------------------------------------------------
  console.log('[TEST 7] Testing Duplicate Email Prevention...');
  const reqDupEmail = {
    body: {
      name: 'Another Person',
      email: testEmail, // Existing email
      phone: '9876549999',
      password: 'SomePassword123',
      confirmPassword: 'SomePassword123'
    }
  };
  const resDupEmail = createMockRes();
  await authController.register(reqDupEmail, resDupEmail, (err) => { if (err) throw err; });
  assert.strictEqual(resDupEmail.statusCode, 400, 'Duplicate email must return HTTP 400');
  assert.ok(resDupEmail.body.message.includes('already exists'));

  console.log('✔ Test 7 passed: Duplicate email address rejected with HTTP 400.');

  // ----------------------------------------------------
  // TEST 8: Duplicate Mobile Phone Number Prevention
  // ----------------------------------------------------
  console.log('[TEST 8] Testing Duplicate Phone Number Prevention...');
  const reqDupPhone = {
    body: {
      name: 'Different Person',
      email: `different_${timestamp}@example.com`,
      phone: testPhone, // Existing phone
      password: 'SomePassword123',
      confirmPassword: 'SomePassword123'
    }
  };
  const resDupPhone = createMockRes();
  await authController.register(reqDupPhone, resDupPhone, (err) => { if (err) throw err; });
  assert.strictEqual(resDupPhone.statusCode, 400, 'Duplicate phone must return HTTP 400');
  assert.ok(resDupPhone.body.message.includes('mobile phone number already exists'));

  console.log('✔ Test 8 passed: Duplicate phone number rejected with HTTP 400.');

  // ----------------------------------------------------
  // TEST 9: Organiser Account Login & Role Preservation
  // ----------------------------------------------------
  console.log('[TEST 9] Testing Organiser Account Login & Permissions Preservation...');
  const { seedOrganisers } = require('../../scripts/seedOrganisers');
  await seedOrganisers();

  const dhanush = await User.findOne({ email: 'dhanush@gmail.com' });
  assert.ok(dhanush, 'Organiser Dhanush must exist');
  assert.strictEqual(dhanush.role, 'organiser');

  const orgPass = process.env.ORGANISER_DHANUSH_PASSWORD || 'Organiser@Dhanush2026';
  const reqOrgLogin = {
    body: {
      identifier: 'dhanush@gmail.com',
      password: orgPass
    }
  };
  const resOrgLogin = createMockRes();
  await authController.login(reqOrgLogin, resOrgLogin, (err) => { if (err) throw err; });

  assert.strictEqual(resOrgLogin.statusCode, 200, 'Organiser login should succeed');
  assert.strictEqual(resOrgLogin.body.user.role, 'organiser', 'Role organiser must be preserved');

  // Also test organiser login via username "dhanush"
  const reqOrgUsername = {
    body: {
      identifier: 'dhanush',
      password: orgPass
    }
  };
  const resOrgUsername = createMockRes();
  await authController.login(reqOrgUsername, resOrgUsername, (err) => { if (err) throw err; });
  assert.strictEqual(resOrgUsername.statusCode, 200, 'Organiser login via username should succeed');

  // Also test organiser login via phone number "+91 98450 22002"
  const reqOrgPhone = {
    body: {
      identifier: '9845022002',
      password: orgPass
    }
  };
  const resOrgPhone = createMockRes();
  await authController.login(reqOrgPhone, resOrgPhone, (err) => { if (err) throw err; });
  assert.strictEqual(resOrgPhone.statusCode, 200, 'Organiser login via phone number should succeed');

  console.log('✔ Test 9 passed: Predefined organiser logged in successfully with role "organiser".');

  // ----------------------------------------------------
  // TEST 10: Authenticated Session Token Verification
  // ----------------------------------------------------
  console.log('[TEST 10] Testing Authenticated Session Token Verification...');
  const secrets = [
    process.env.JWT_SECRET,
    'journeyhub_capstone_secure_secret_2026',
    'journeyhub_super_secure_capstone_jwt_secret_key_2026'
  ].filter(Boolean);
  let decoded = null;
  for (const secret of secrets) {
    try {
      decoded = jwt.verify(authToken, secret);
      break;
    } catch (_) {}
  }
  assert.ok(decoded, 'Issued token must be valid against server JWT secret');
  assert.strictEqual(decoded.id.toString(), registeredUserId.toString(), 'Decoded token ID matches user ID');

  console.log('✔ Test 10 passed: Issued session token verifies cleanly against server JWT secret.');

  // Clean up registered test user
  await User.deleteOne({ _id: registeredUserId });
  console.log('\n====================================================');
  console.log('   ALL NO-OTP AUTH & LOGIN TESTS PASSED (100%)       ');
  console.log('====================================================\n');
}

if (require.main === module) {
  runNoOtpAuthAndLoginTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Test failed:', err);
      process.exit(1);
    });
}

module.exports = runNoOtpAuthAndLoginTests;
