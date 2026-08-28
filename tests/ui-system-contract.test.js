const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('index.html', 'utf8');
const uiState = fs.readFileSync('scripts/ui-state.js', 'utf8');
const premiumUi = fs.readFileSync('scripts/premium-ui.js', 'utf8');
const premiumCss = fs.readFileSync('premium-ui.css', 'utf8');
const onboarding = fs.readFileSync('onboarding.js', 'utf8');

assert.ok(index.includes('premium-ui.css'));
assert.ok(index.includes('scripts/ui-state.js'));
assert.ok(index.includes('scripts/premium-ui.js'));
assert.ok(index.indexOf('scripts/ui-state.js') < index.indexOf('scripts/premium-ui.js'));
assert.ok(!index.includes('premium-ui-refinement.js'));

for (const state of ['home', 'onboarding', 'playing', 'paused', 'settlement', 'run-complete']) {
  assert.ok(uiState.includes(`'${state}'`), `missing core UI state ${state}`);
}
for (const retiredOverlayState of ['leaderboard', 'account', 'custom-select']) {
  assert.ok(!uiState.includes(`${retiredOverlayState.toUpperCase().replace('-', '_')}: '${retiredOverlayState}'`), `overlay must not be a core lifecycle state: ${retiredOverlayState}`);
}
assert.ok(uiState.includes('root.dataset.layout = layout'));
assert.ok(uiState.includes("'(pointer: coarse)'"));
assert.ok(uiState.includes('window.FlappyKUiState'));
assert.ok(!uiState.includes('inferFromDom'));
assert.ok(!uiState.includes('new MutationObserver'));

for (const sourceContract of [
  'id="game-hud-rail"',
  'id="excess-meter"',
  'id="run-progress-panel"',
  'class="game-speed-control desktop-speed-control"',
  'id="mobile-controls"',
  'class="mobile-speed-control"',
  'id="settlement-summary"',
  'class="home-mode-stack"',
]) {
  assert.ok(index.includes(sourceContract), `missing canonical source structure: ${sourceContract}`);
}

assert.ok(premiumUi.includes('playerReturn - marketReturn'));
assert.ok(premiumUi.includes('changeSpeed(-1)'));
assert.ok(premiumUi.includes('changeSpeed(1)'));
assert.ok(premiumUi.includes('beginGuide'));
assert.ok(premiumUi.includes('renderSettlement'));
assert.ok(premiumUi.includes('navigator.vibrate'));
for (const retiredInstaller of ['buildSpeedControl', 'installMobileControls', 'installSettlementSummary', 'installHomeHierarchy', "meter.id = 'excess-meter'"]) {
  assert.ok(!premiumUi.includes(retiredInstaller), `behavior layer must not rebuild canonical DOM: ${retiredInstaller}`);
}

assert.ok(onboarding.includes('consumePending'));
assert.ok(!onboarding.includes('event.preventDefault()'));
assert.ok(!onboarding.includes("overlay.classList.add('active')"));

assert.ok(premiumCss.includes('--game-surface'));
assert.ok(premiumCss.includes('.excess-meter-track'));
assert.ok(premiumCss.includes('.mobile-speed-control'));
assert.ok(premiumCss.includes('.game-coachmark'));
assert.ok(premiumCss.includes('.settlement-summary'));
assert.ok(premiumCss.includes('.home-primary-actions'));

console.log('Core UI lifecycle, source DOM authority, layout, onboarding, controls, feedback, and settlement contracts passed');