/**
 * Master Test Runner for JourneyHub
 */
process.env.NODE_ENV = 'test';
const debtTest = require('./debtSimplifier.test');
const conflictTest = require('./conflictDetector.test');
const availabilityTest = require('./availabilityMatcher.test');
const { runApiIntegrationTests } = require('./api.test');
const { runRoleAndFeaturesTests } = require('./roleBasedAndFeatures.test');
const { runRealAuthAndOrganisersTests } = require('./realAuthAndOrganisers.test');
const { runJoinRequestNotificationsAndSmsTests } = require('./joinRequestNotificationsAndSms.test');
const runGmailEmailOtpTests = require('./gmailEmailOtp.test');
const runJoinRequestVisibilityAndSyncTests = require('./joinRequestVisibilityAndSync.test');
const runPublishedTripsVisibilityTests = require('./publishedTripsVisibility.test');
const runMyTripsAndDetailsNavTests = require('./myTripsAndDetailsNav.test');
const runBugs123Tests = require('./bugs123EndToEnd.test');
const runNoOtpAuthAndLoginTests = require('./noOtpAuthAndLogin.test');
const { runDestinationImageTests } = require('./destinationImages.test');
const { runSmartTripSuggestionsTests } = require('./smartTripSuggestions.test');

console.log('====================================================');
console.log('   JOURNEYHUB MCA CAPSTONE - COMPLETE TEST SUITE    ');
console.log('====================================================\n');

(async () => {
  try {
    debtTest.runAll();
    conflictTest.runAll();
    availabilityTest.runAll();
    await runApiIntegrationTests();
    await runRoleAndFeaturesTests();
    await runRealAuthAndOrganisersTests();
    await runJoinRequestNotificationsAndSmsTests();
    await runGmailEmailOtpTests();
    await runJoinRequestVisibilityAndSyncTests();
    await runPublishedTripsVisibilityTests();
    await runMyTripsAndDetailsNavTests();
    await runNoOtpAuthAndLoginTests();
    await runBugs123Tests();
    runDestinationImageTests();
    await runSmartTripSuggestionsTests();
    console.log('====================================================');
    console.log('       ALL UNIT & INTEGRATION TESTS PASSED (100%)   ');
    console.log('====================================================');
    const { disconnectDB } = require('../config/db');
    await disconnectDB(true);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test Suite Failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
