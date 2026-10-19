/**
 * Unit tests for Group Availability Matcher
 */
const assert = require('assert');
const { calculateBestTravelDates } = require('../utils/availabilityMatcher');

function testAvailabilityMatcherWindow() {
  const members = [
    {
      memberId: 'u1',
      name: 'Priya',
      intervals: [
        { startDate: '2026-11-01', endDate: '2026-11-10' }
      ]
    },
    {
      memberId: 'u2',
      name: 'Rohan',
      intervals: [
        { startDate: '2026-11-04', endDate: '2026-11-12' }
      ]
    },
    {
      memberId: 'u3',
      name: 'Ananya',
      intervals: [
        { startDate: '2026-11-03', endDate: '2026-11-08' }
      ]
    }
  ];

  // Common overlap for all 3: Nov 04 - Nov 08 (5 days)
  // Request 4-day trip
  const result = calculateBestTravelDates(members, 4);

  assert.ok(result.bestWindow);
  assert.strictEqual(result.bestWindow.availableCount, 3);
  assert.strictEqual(result.bestWindow.matchPercentage, 100);
  assert.strictEqual(result.bestWindow.availableMembers.length, 3);

  // Check that the best window starts around 2026-11-04
  assert.ok(['2026-11-04', '2026-11-05'].includes(result.bestWindow.startDate));

  console.log(`✔ testAvailabilityMatcherWindow passed (Best window: ${result.bestWindow.startDate} to ${result.bestWindow.endDate} with 100% attendance)`);
}

function runAll() {
  console.log('Running Group Availability Matcher Unit Tests...');
  testAvailabilityMatcherWindow();
  console.log('All Availability Matcher tests passed successfully!\n');
}

if (require.main === module) {
  runAll();
}

module.exports = { runAll };
