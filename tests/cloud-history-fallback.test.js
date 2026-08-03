const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const membership = readFileSync(join(__dirname, '..', 'membership.js'), 'utf8');

assert.match(
  membership,
  /const localBestValue = profile\.bestExcess;/,
  'profile upload must retain the raw nullable local best before numeric conversion',
);
assert.match(
  membership,
  /best_excess: localBestValue == null\s*\? null/,
  'a local profile without a completed run must upload null rather than Number(null) as zero',
);
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
assert.match(
  membership,
  /const bestExcess = \[profileBest, bestFromRuns\]\.reduce/,
  'cloud history must reconcile the profile cache with run-derived facts',
);
assert.match(
  membership,
  /Number\.isFinite\(value\) && \(best === null \|\| value > best\)/,
  'a stale or zero profile cache must not lower a stronger completed-run result',
);
assert.doesNotMatch(
  membership,
  /const profileBest = Number\(profileResult\.data\?\.best_excess\);/,
  'Number(null) must not override a non-zero best Excess Return from completed runs',
);

console.log('Cloud history upload, null, and stale-cache fallback contracts passed.');
