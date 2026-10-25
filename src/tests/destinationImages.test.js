/**
 * JourneyHub Destination Images & Fallback Test Suite
 *
 * Verifies:
 * 1. Distinct destination resolution for 5+ destinations (Ooty, Goa, Manali, Munnar, Jaipur).
 * 2. Never assigns one fixed image to all trips.
 * 3. Generic placeholders are upgraded to destination-specific images.
 * 4. Custom valid URLs are preserved without being overwritten.
 * 5. Safe error handling prevents infinite loops.
 */

const assert = require('assert');
const {
  resolveDestinationImage,
  isGenericPlaceholder,
  getTripCoverImage,
  DEFAULT_TRAVEL_IMAGE
} = require('../utils/destinationImages');

function runDestinationImageTests() {
  console.log('\n--- Running Destination Images & Fallback Tests ---');

  // Test 1: Test at least 5 different destinations and assert distinct URLs
  const destinations = [
    { dest: 'Ooty, Tamil Nadu', title: 'Nilgiri Tea Gardens & Lake' },
    { dest: 'Goa', title: 'South Goa Beach Retreat' },
    { dest: 'Manali, Himachal Pradesh', title: 'Solang Valley Adventure' },
    { dest: 'Munnar, Kerala', title: 'Munnar Mist & Mountain Trek' },
    { dest: 'Jaipur, Rajasthan', title: 'Pink City Heritage Walk' }
  ];

  const resolvedUrls = new Set();
  destinations.forEach(({ dest, title }) => {
    const url = resolveDestinationImage(dest, title);
    assert(url, `Expected image URL for ${dest}`);
    assert(url.startsWith('https://'), `Image URL for ${dest} must be HTTPS`);
    resolvedUrls.add(url);
    console.log(`  ✓ Destination "${dest}" resolved to: ${url.slice(0, 60)}...`);
  });

  // Verify that all 5 destinations produced distinct images (never one fixed image)
  assert.strictEqual(
    resolvedUrls.size,
    destinations.length,
    'Each destination must have a distinct, relevant image URL'
  );
  console.log('  ✓ 5 distinct destinations resolved to 5 distinct, verified images');

  // Test 2: Generic placeholder detection
  const oldPlaceholder = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80';
  const kyotoPlaceholder = 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80';
  const customUserPhoto = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80';

  assert.strictEqual(isGenericPlaceholder(oldPlaceholder), true, 'Should detect old placeholder photo-1488646953014-85cb44e25828');
  assert.strictEqual(isGenericPlaceholder(kyotoPlaceholder), true, 'Should detect Kyoto generic placeholder');
  assert.strictEqual(isGenericPlaceholder(customUserPhoto), false, 'Should not mark valid custom photo as generic placeholder');
  assert.strictEqual(isGenericPlaceholder(''), true, 'Empty string should be treated as needing resolution');
  assert.strictEqual(isGenericPlaceholder(null), true, 'Null should be treated as needing resolution');
  console.log('  ✓ Generic placeholder detector works accurately');

  // Test 3: Upgrade trip with generic placeholder to destination image
  const ootyTripWithOldCover = {
    title: 'Ooty Hills Escape',
    destination: 'Ooty',
    coverImage: oldPlaceholder
  };
  const ootyResolved = getTripCoverImage(ootyTripWithOldCover);
  assert.notStrictEqual(ootyResolved, oldPlaceholder, 'Generic placeholder must be upgraded');
  assert(ootyResolved.includes('photo-1589182373726'), 'Ooty trip must resolve to authentic Ooty photo');
  console.log('  ✓ Upgraded trip with generic placeholder to authentic destination photo');

  // Test 4: Preserve valid custom image
  const goaTripWithCustomPhoto = {
    title: 'Goa Sun & Sand',
    destination: 'Goa',
    coverImage: 'https://images.unsplash.com/photo-custom-valid-photographer-xyz?w=1200'
  };
  const preservedCover = getTripCoverImage(goaTripWithCustomPhoto);
  assert.strictEqual(
    preservedCover,
    'https://images.unsplash.com/photo-custom-valid-photographer-xyz?w=1200',
    'Valid custom coverImage must be preserved'
  );
  console.log('  ✓ Preserved valid custom cover image without overwriting');

  // Test 5: Fallback when destination is unknown or exotic
  const exoticTrip = {
    title: 'Remote Island Cruise',
    destination: 'Unknown Sandy Beach Shore',
    coverImage: ''
  };
  const exoticResolved = getTripCoverImage(exoticTrip);
  assert(exoticResolved.startsWith('https://'), 'Fallback must be valid HTTPS URL');
  assert(exoticResolved.includes('photo-1507525428034-b723cf961d3e'), 'Beach theme fallback resolved correctly');
  console.log('  ✓ Thematic category fallback works when city is unlisted');

  // Test 6: Safe error handling in client-side script
  const clientScript = require('fs').readFileSync('public/js/utils/destinationImages.js', 'utf8');
  assert(clientScript.includes('imgEl.onerror = null'), 'Client error handler must set onerror = null to prevent infinite loop');
  assert(clientScript.includes('handleImageError'), 'Client must export handleImageError');
  console.log('  ✓ Client-side image error handler prevents infinite loops');

  console.log('--- All Destination Image Tests Passed! ---\n');
  return true;
}

if (require.main === module) {
  try {
    runDestinationImageTests();
    process.exit(0);
  } catch (err) {
    console.error('Destination image test failure:', err);
    process.exit(1);
  }
}

module.exports = { runDestinationImageTests };
