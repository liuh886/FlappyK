const assert = require('node:assert/strict');
const fs = require('node:fs');

const pacing = fs.readFileSync('scripts/game-pacing.js', 'utf8');
const css = fs.readFileSync('mobile-controls.css', 'utf8');

assert.ok(pacing.includes("window.matchMedia('(max-width: 1024px)')"));
assert.ok(pacing.includes("window.matchMedia('(pointer: coarse)')"));
assert.ok(pacing.includes('navigator.maxTouchPoints'));
assert.ok(pacing.includes('shouldShowVirtualControls'));
assert.ok(pacing.includes('mobileControls.hidden = !showMobileControls'));
assert.ok(pacing.includes("window.addEventListener('orientationchange'"));

assert.ok(css.includes('#mobile-controls:not([hidden])'));
assert.ok(css.includes('position: fixed !important'));
assert.ok(css.includes('bottom: 0 !important'));
assert.ok(css.includes('width: 100vw !important'));
assert.ok(css.includes('env(safe-area-inset-bottom)'));
assert.ok(css.includes('@media (max-width: 1024px)'));
assert.equal(css.includes('@media (max-width: 768px)'), false);

console.log('Fixed mobile control overlay checks passed');
