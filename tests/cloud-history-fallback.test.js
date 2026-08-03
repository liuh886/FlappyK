const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const membership = readFileSync(join(__dirname, '..', 'membership.js'), 'utf8');

assert.match(
  membership,
  /const profileBestValue = profileResult\.data\?\.best_excess;/,
  'cloud history must retain the raw nullable profile value before numeric conversion',
);
assert.match(
  membership,
  /const profileBest = profileBestValue == null \? null : Number\(profileBestValue\);/,
  'null or missing profile best must fall back to run-derived history instead of coercing to zero',
);
assert.doesNotMatch(
  membership,
  /const profileBest = Number\(profileResult\.data\?\.best_excess\);/,
  'Number(null) must not override a non-zero best Excess Return from completed runs',
);

console.log('Cloud history null fallback contract passed.');
