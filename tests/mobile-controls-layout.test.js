const assert = require('node:assert/strict');
const fs = require('node:fs');

const pacing = fs.readFileSync('scripts/game-pacing.js', 'utf8');
const uiState = fs.readFileSync('scripts/ui-state.js', 'utf8');
const css = fs.readFileSync('mobile-controls.css', 'utf8');
const premiumCss = fs.readFileSync('premium-ui.css', 'utf8');

assert.ok(pacing.includes("window.matchMedia('(max-width: 719px)')"));
assert.ok(pacing.includes("window.matchMedia('(pointer: coarse)')"));
assert.ok(pacing.includes('window.FlappyKUiState'));
assert.ok(pacing.includes('sharedLayout.virtualControls'));
assert.ok(pacing.includes('navigator.maxTouchPoints'));
assert.ok(pacing.includes('shouldShowVirtualControls'));
assert.ok(pacing.includes('mobileControls.hidden = !showMobileControls'));
assert.ok(pacing.includes("window.addEventListener('flappyk:layout-state'"));
assert.ok(pacing.includes("window.addEventListener('orientationchange'"));

assert.ok(uiState.includes('const compactWidth = 720'));
assert.ok(uiState.includes('const nextVirtualControls = coarse || width < compactWidth'));
assert.ok(uiState.includes('get virtualControls()'));
assert.ok(uiState.includes('root.dataset.virtualControls'));

assert.ok(css.includes('#mobile-controls:not([hidden])'));
assert.ok(css.includes('position: fixed !important'));
assert.ok(css.includes('bottom: 0 !important'));
assert.ok(css.includes('width: 100vw !important'));
assert.ok(css.includes('env(safe-area-inset-bottom)'));
assert.ok(premiumCss.includes('#mobile-controls:not([hidden])'));
assert.ok(premiumCss.includes('grid-template-columns'));
assert.ok(premiumCss.includes('.mobile-speed-control'));

console.log('Shared responsive state and fixed virtual-control overlay checks passed');
