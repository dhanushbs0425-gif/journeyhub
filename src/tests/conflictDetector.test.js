/**
 * Unit tests for Conflict Detector and Missed Activity Gap Slot Recovery
 */
const assert = require('assert');
const {
  detectConflicts,
  checkActivityConflict,
  findAvailableGapSlots,
  timeToMinutes,
  minutesToTime
} = require('../utils/conflictDetector');

function testTimeConversions() {
  assert.strictEqual(timeToMinutes('00:00'), 0);
  assert.strictEqual(timeToMinutes('09:30'), 570);
  assert.strictEqual(timeToMinutes('23:59'), 1439);

  assert.strictEqual(minutesToTime(0), '00:00');
  assert.strictEqual(minutesToTime(570), '09:30');
  console.log('✔ testTimeConversions passed');
}

function testConflictDetection() {
  const activities = [
    {
      id: '1',
      dayNumber: 1,
      title: 'Museum Tour',
      startTime: '09:00',
      endTime: '11:00',
      isMissed: false
    },
    {
      id: '2',
      dayNumber: 1,
      title: 'Cooking Class',
      startTime: '10:30', // Overlaps with Museum Tour (09:00-11:00)
      endTime: '12:30',
      isMissed: false
    },
    {
      id: '3',
      dayNumber: 1,
      title: 'Evening Cruise',
      startTime: '17:00',
      endTime: '19:00',
      isMissed: false
    }
  ];

  const conflicts = detectConflicts(activities);
  assert.strictEqual(conflicts.length, 1);
  assert.strictEqual(conflicts[0].overlapMinutes, 30);
  assert.strictEqual(conflicts[0].activity1.id, '1');
  assert.strictEqual(conflicts[0].activity2.id, '2');

  console.log('✔ testConflictDetection passed');
}

function testGapSlotRecovery() {
  // Day has activities from 10:00-12:00 and 15:00-17:00
  // Between 09:00 and 20:00:
  // Gap 1: 09:00 - 10:00 (60 mins)
  // Gap 2: 12:00 - 15:00 (180 mins)
  // Gap 3: 17:00 - 20:00 (180 mins)
  const dayActivities = [
    { title: 'Morning Hike', startTime: '10:00', endTime: '12:00', isMissed: false },
    { title: 'Afternoon Spa', startTime: '15:00', endTime: '17:00', isMissed: false }
  ];

  // Requesting a slot of 90 minutes (1.5 hours)
  const slots = findAvailableGapSlots(dayActivities, 90, '09:00', '20:00');
  // Gap 1 (60 mins) is too small (< 90 mins).
  // Gap 2 (180 mins) and Gap 3 (180 mins) can fit.
  assert.strictEqual(slots.length, 2);
  assert.strictEqual(slots[0].startTime, '12:00');
  assert.strictEqual(slots[0].endTime, '13:30');
  assert.strictEqual(slots[1].startTime, '17:00');
  assert.strictEqual(slots[1].endTime, '18:30');

  console.log('✔ testGapSlotRecovery passed (identified 2 valid reschedule slots)');
}

function runAll() {
  console.log('Running Conflict Detector Unit Tests...');
  testTimeConversions();
  testConflictDetection();
  testGapSlotRecovery();
  console.log('All Conflict Detector tests passed successfully!\n');
}

if (require.main === module) {
  runAll();
}

module.exports = { runAll };
