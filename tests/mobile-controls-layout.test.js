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
assert.ok(css.includes('Touch geometry only. Shared color, typography and button skin live in premium-ui.css.'));
assert.ok(css.includes('Runtime state decides whether this dock exists; viewport width does not.'));
assert.ok(css.includes('position: fixed'));
assert.ok(css.includes('inset: auto 0 0;'));
assert.ok(css.includes('display: grid'));
assert.ok(css.includes('width: 100vw'));
assert.ok(css.includes('env(safe-area-inset-bottom)'));
assert.ok(css.includes('grid-template-columns: minmax(36px, 1fr) 78px 108px 78px minmax(36px, 1fr)'));
assert.ok(css.includes('#mobile-controls #btn-buy'));
assert.ok(css.includes('grid-column: 2'));
assert.ok(css.includes('#mobile-controls #btn-sell'));
assert.ok(css.includes('grid-column: 4'));
assert.ok(css.includes('#mobile-controls .mobile-speed-control'));
assert.ok(css.includes('grid-column: 3'));
assert.ok(css.includes('Speed is secondary: keep it in the command dock instead of floating over market data.'));
assert.ok(css.includes("html[data-virtual-controls='true'] #game-top-controls"));
assert.ok(css.includes('grid-template-columns: 44px 44px'));
assert.ok(css.includes("data-ui-state='playing'"));
assert.ok(!css.includes(":has(#indicator-card-deck:not([hidden])) #game-canvas"));

// Touch geometry has one owner. Shared presentation stays in premium-ui.css.
assert.ok(premiumCss.includes('#btn-buy'));
assert.ok(premiumCss.includes('#btn-sell'));
assert.ok(premiumCss.includes('.mobile-speed-control .speed-readout'));
assert.ok(!premiumCss.includes('#mobile-controls:not([hidden]) {'));
assert.ok(!css.includes("html[data-ui-state='home'] body #game-container #start-screen.arcade-home"));
assert.ok(!css.includes('#settlement-screen.active'));
assert.ok(!css.includes('#game-hud-rail .weather-status'));
assert.ok(!css.includes('opacity: 0.68'));

console.log('Responsive state, dock-contained speed control, 44px navigation targets, and single-owner mobile presentation checks passed');
