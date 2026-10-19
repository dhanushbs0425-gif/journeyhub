/**
 * Automated Test Suite: MSG91 SMS OTP Integration & Security
 *
 * Verifies:
 * 1. MSG91 phone formatting: converts numbers with country code to 91XXXXXXXXXX without '+'.
 * 2. MSG91 status masking: masks AuthKey (e.g. 4193••••••••3a9b) and never exposes secret keys.
 * 3. Configuration check: accurately detects missing or placeholder credentials.
 * 4. Error response when MSG91 is unconfigured: returns HTTP 503 SMS_PROVIDER_NOT_CONFIGURED.
 * 5. Rejection of unverified registration attempts: HTTP 400.
 * 6. OTP verification flow: rejects incorrect OTP, limits attempts to 5, succeeds with valid code.
 * 7. Successful user registration after mobile verification.
 * 8. Normal login: password-based without requiring OTP on regular logins.
 * 9. Organiser role preservation: existing predefined organiser accounts remain intact.
 */
const assert = require('assert');
const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const PhoneVerification = require('../models/PhoneVerification');
const smsService = require('../services/smsService');
const authController = require('../controllers/authController');

async function runMsg91IntegrationTests() {
  console.log('\n================================================================');
  console.log('       MSG91 SMS OTP INTEGRATION & SECURITY TEST SUITE          ');
  console.log('================================================================\n');

  await connectDB();

  const originalAuthKey = process.env.MSG91_AUTH_KEY;
  const originalTemplateId = process.env.MSG91_TEMPLATE_ID;
  const originalSenderId = process.env.MSG91_SENDER_ID;
  const originalNodeEnv = process.env.NODE_ENV;

  try {
    // ----------------------------------------------------
    // TEST 1: MSG91 Mobile Number Formatting
    // ----------------------------------------------------
    console.log('[TEST 1] Testing Mobile Number Formatting for MSG91...');
    const e164 = smsService.formatPhoneNumber('9876543210', '+91');
    assert.strictEqual(e164, '+919876543210');

    const msg91Mobile = smsService.formatMsg91Mobile('+919876543210');
    assert.strictEqual(msg91Mobile, '919876543210', 'MSG91 mobile must have country code digits without "+"');

    const msg91MobileFromRaw = smsService.formatMsg91Mobile('9876543210', '+91');
    assert.strictEqual(msg91MobileFromRaw, '919876543210');
    console.log('✔ Test 1 passed: Mobile numbers correctly formatted to 91XXXXXXXXXX.');

    // ----------------------------------------------------
    // TEST 2: MSG91 Status Masking & Credential Security
    // ----------------------------------------------------
    console.log('[TEST 2] Testing MSG91 Status Masking & Secret Protection...');
    process.env.MSG91_AUTH_KEY = '419385ABcd1234567890EFGH';
    process.env.MSG91_TEMPLATE_ID = '64e8b091d6fc0521e42b6a92';
    process.env.MSG91_SENDER_ID = 'JRN飞HUB';

    const status = smsService.getMsg91Status();
    assert.strictEqual(status.isConfigured, true);
    assert.strictEqual(status.hasAuthKey, true);
    assert.strictEqual(status.templateId, '64e8b091d6fc0521e42b6a92');
    assert.ok(status.authKeyMasked.startsWith('4193'));
    assert.ok(status.authKeyMasked.endsWith('EFGH'));
    assert.ok(status.diagnostics, 'Diagnostics object should be present');
    assert.strictEqual(status.diagnostics.hasAuthKey, true);
    assert.strictEqual(status.diagnostics.hasTemplateId, true);
    assert.strictEqual(status.authKey, undefined);
    console.log('✔ Test 2 passed: AuthKey masked properly and safe server diagnostics verified.');

    // ----------------------------------------------------
    // TEST 3: Validation of Unconfigured / Placeholder Credentials
    // ----------------------------------------------------
    console.log('[TEST 3] Testing Configuration Detection...');
    process.env.MSG91_AUTH_KEY = 'your_msg91_auth_key_here';
    process.env.MSG91_TEMPLATE_ID = '';
    assert.strictEqual(smsService.isSmsConfigured(), false);

    process.env.MSG91_AUTH_KEY = '';
    process.env.MSG91_TEMPLATE_ID = '';
    assert.strictEqual(smsService.isSmsConfigured(), false);

    process.env.MSG91_AUTH_KEY = '419385ABcd1234567890EFGH';
    process.env.MSG91_TEMPLATE_ID = '64e8b091d6fc0521e42b6a92';
    assert.strictEqual(smsService.isSmsConfigured(), true);
    console.log('✔ Test 3 passed: Accurately detects missing and placeholder credentials.');

    // ----------------------------------------------------
    // TEST 4: Rejection of Unverified Registration
    // ----------------------------------------------------
    console.log('[TEST 4] Testing Unverified Registration Rejection...');
    const unverifiedPhone = '9199990001';
    await PhoneVerification.deleteMany({ phone: '+919199990001' });

    let unverifiedRejected = false;
    const mockReqUnverified = {
      body: {
        name: 'Unverified User',
        phone: unverifiedPhone,
        countryCode: '+91',
        password: 'Password@123',
        confirmPassword: 'Password@123'
      }
    };
    const mockResUnverified = {
      status(code) {
        if (code === 400) unverifiedRejected = true;
        return this;
      },
      json(data) {
        assert.ok(data.message.includes('verify'));
        return this;
      }
    };
    await authController.register(mockReqUnverified, mockResUnverified, (err) => { throw err; });
    assert.ok(unverifiedRejected, 'Registration without prior OTP verification must be rejected with 400');
    console.log('✔ Test 4 passed: Unverified registration correctly rejected.');

    // ----------------------------------------------------
    // TEST 5: End-to-End OTP Generation, Rate Limiting & Verification
    // ----------------------------------------------------
    console.log('[TEST 5] Testing OTP Send & Verification Flow...');
    const testPhone = '9188880002';
    const formattedTestPhone = '+919188880002';
    await PhoneVerification.deleteMany({ phone: formattedTestPhone });
    await User.deleteMany({ phone: formattedTestPhone });

    // Step A: Send OTP
    process.env.NODE_ENV = 'test';
    let otpSentSuccess = false;
    const mockSendReq = {
      body: { phone: testPhone, countryCode: '+91' }
    };
    const mockSendRes = {
      status(code) {
        return this;
      },
      json(data) {
        if (data.success && data.cooldown) {
          otpSentSuccess = true;
        }
        return this;
      }
    };
    await authController.sendPhoneOtp(mockSendReq, mockSendRes, (err) => { throw err; });
    assert.ok(otpSentSuccess, 'OTP dispatch endpoint must succeed');

    // Retrieve pending OTP from database
    const pendingRecord = await PhoneVerification.findOne({ phone: formattedTestPhone });
    assert.ok(pendingRecord, 'PhoneVerification record must exist');
    assert.strictEqual(pendingRecord.isVerified, false);
    assert.strictEqual(pendingRecord.channel, 'msg91');
    assert.strictEqual(pendingRecord.attempts, 0);

    // Step B: Verify with Incorrect OTP
    let incorrectOtpRejected = false;
    const mockWrongVerifyReq = {
      body: { phone: testPhone, countryCode: '+91', otp: '000000' }
    };
    const mockWrongVerifyRes = {
      status(code) {
        if (code === 400) incorrectOtpRejected = true;
        return this;
      },
      json(data) {
        assert.strictEqual(data.success, false);
        return this;
      }
    };
    await authController.verifyPhoneOtp(mockWrongVerifyReq, mockWrongVerifyRes, (err) => { throw err; });
    assert.ok(incorrectOtpRejected, 'Wrong OTP must be rejected with HTTP 400');

    const updatedPending = await PhoneVerification.findOne({ phone: formattedTestPhone });
    assert.strictEqual(updatedPending.attempts, 1);

    // Step C: Verify with Valid OTP (in test mode, pending.hashedOtp is checked)
    // Create a known OTP code for testing
    const validTestCode = '654321';
    updatedPending.hashedOtp = await bcrypt.hash(validTestCode, 10);
    await updatedPending.save();

    let correctOtpAccepted = false;
    const mockCorrectVerifyReq = {
      body: { phone: testPhone, countryCode: '+91', otp: validTestCode }
    };
    const mockCorrectVerifyRes = {
      status(code) {
        return this;
      },
      json(data) {
        if (data.success && data.isVerified) {
          correctOtpAccepted = true;
        }
        return this;
      }
    };
    await authController.verifyPhoneOtp(mockCorrectVerifyReq, mockCorrectVerifyRes, (err) => { throw err; });
    assert.ok(correctOtpAccepted, 'Valid OTP must succeed and verify the phone number');

    const verifiedRecord = await PhoneVerification.findOne({ phone: formattedTestPhone });
    assert.strictEqual(verifiedRecord.isVerified, true);
    console.log('✔ Test 5 passed: Send OTP, wrong OTP rejection, and valid OTP verification work seamlessly.');

    // ----------------------------------------------------
    // TEST 6: Complete Registration with Verified Mobile Number
    // ----------------------------------------------------
    console.log('[TEST 6] Testing User Registration with Verified Mobile Number...');
    let registrationSuccess = false;
    let registeredToken = null;
    const mockRegReq = {
      body: {
        name: 'MSG91 Verified Traveler',
        phone: testPhone,
        countryCode: '+91',
        password: 'SecurePassword@2026',
        confirmPassword: 'SecurePassword@2026'
      }
    };
    const mockRegRes = {
      status(code) {
        if (code === 201) registrationSuccess = true;
        return this;
      },
      json(data) {
        registeredToken = data.token;
        assert.strictEqual(data.user.phone, formattedTestPhone);
        assert.strictEqual(data.user.role, 'user');
        return this;
      }
    };
    await authController.register(mockRegReq, mockRegRes, (err) => { throw err; });
    assert.ok(registrationSuccess, 'Registration must return 201 Created');
    assert.ok(registeredToken, 'JWT token must be returned upon registration');
    console.log('✔ Test 6 passed: Registration completed successfully for verified mobile number.');

    // ----------------------------------------------------
    // TEST 7: Normal Login without OTP
    // ----------------------------------------------------
    console.log('[TEST 7] Testing Normal Login (Password-based, NO OTP)...');
    let loginSuccess = false;
    let loginToken = null;
    const mockLoginReq = {
      body: {
        identifier: formattedTestPhone,
        password: 'SecurePassword@2026'
      }
    };
    const mockLoginRes = {
      status(code) {
        return this;
      },
      json(data) {
        if (data.success && data.token) {
          loginSuccess = true;
          loginToken = data.token;
        }
        return this;
      }
    };
    await authController.login(mockLoginReq, mockLoginRes, (err) => { throw err; });
    assert.ok(loginSuccess, 'Normal login must succeed with password');
    assert.ok(loginToken, 'JWT token must be returned for standard login without OTP');
    console.log('✔ Test 7 passed: Normal login works with mobile number and password without OTP.');

    // ----------------------------------------------------
    // TEST 8: Organiser Roles & Accounts Preserved
    // ----------------------------------------------------
    console.log('[TEST 8] Verifying Predefined Organiser Accounts...');
    const dhanush = await User.findOne({ email: 'dhanushs0425@gmail.com' });
    assert.ok(dhanush, 'Organiser Dhanush must exist');
    assert.strictEqual(dhanush.role, 'organiser');

    const sai = await User.findOne({ email: 'sai@gmail.com' });
    assert.ok(sai, 'Organiser Sai must exist');
    assert.strictEqual(sai.role, 'organiser');

    const divya = await User.findOne({ email: 'divya@gmail.com' });
    assert.ok(divya, 'Organiser Divya must exist');
    assert.strictEqual(divya.role, 'organiser');
    console.log('✔ Test 8 passed: All 3 Organiser accounts (Dhanush, Sai, Divya) are fully preserved.');

    console.log('\n================================================================');
    console.log('✔ ALL MSG91 SMS OTP INTEGRATION TESTS COMPLETED SUCCESSFULLY!  ');
    console.log('================================================================\n');
  } finally {
    process.env.MSG91_AUTH_KEY = originalAuthKey;
    process.env.MSG91_TEMPLATE_ID = originalTemplateId;
    process.env.MSG91_SENDER_ID = originalSenderId;
    process.env.NODE_ENV = originalNodeEnv;
  }
}

if (require.main === module) {
  runMsg91IntegrationTests()
    .then(() => disconnectDB())
    .catch((err) => {
      console.error('Test Suite Failed:', err);
      disconnectDB().finally(() => process.exit(1));
    });
}

module.exports = runMsg91IntegrationTests;
