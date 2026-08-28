const assert = require('node:assert/strict');
const fs = require('node:fs');

const canonical = fs.readFileSync('premium-ui.css', 'utf8');
const mobile = fs.readFileSync('mobile-controls.css', 'utf8');
const base = fs.readFileSync('style.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const premiumUi = fs.readFileSync('scripts/premium-ui.js', 'utf8');

for (const structuralContract of [
  'grid-template-rows: minmax(0, 1fr)',
  'min-height: 0 !important',
  "'performance controls'",
  "'progress progress'",
  '#game-hud-rail',
]) {
  assert.ok(canonical.includes(structuralContract), `Missing canonical HUD geometry contract: ${structuralContract}`);
}

for (const visualContract of [
  'MARKET ARCADE pass',
  'PIXEL MARKET ARCADE',
  'border-radius: 0',
  'backdrop-filter: none',
  'box-shadow: 7px 7px 0 #8e7520',
  'box-shadow: 5px 5px 0 var(--game-depth)',
  'text-shadow: var(--pixel-outline)',
  'steps(2, end)',
]) {
  assert.ok(canonical.includes(visualContract), `Missing hard-edged Pixel Market Arcade visual contract: ${visualContract}`);
}

for (const mobileContract of [
  '#mobile-controls:not([hidden])',
  'Touch geometry only. Shared color, typography and button skin live in premium-ui.css.',
  'Runtime state decides whether this dock exists; viewport width does not.',
  'position: fixed;',
  'display: grid;',
  'width: 100vw;',
  'grid-template-columns: minmax(36px, 1fr) 78px 108px 78px minmax(36px, 1fr);',
  'grid-column: 3;',
  'grid-template-columns: 44px 44px 44px;',
  '@media (orientation: landscape) and (max-height: 500px)',
]) {
  assert.ok(mobile.includes(mobileContract), `Missing feature-owned mobile geometry contract: ${mobileContract}`);
}

for (const sourceContract of [
  'id="game-hud-rail"',
  'id="run-progress-panel"',
  'id="game-top-controls"',
  'id="mobile-controls"',
]) {
  assert.ok(index.includes(sourceContract), `Canonical geometry structure must live in index.html: ${sourceContract}`);
}

assert.ok(!canonical.includes('#mobile-controls:not([hidden]) {'), 'premium-ui.css must not take over command-dock positioning.');
assert.ok(!canonical.includes('--pixel-cut:'), 'Decorative clipped-corner geometry must not return.');
assert.ok(!canonical.includes('shadowBlur'), 'Canvas-era neon glow language must not enter shared CSS.');
assert.ok(!canonical.includes('radial-gradient('), 'Ambient radial lighting must not return to the canonical pixel-game surface.');
assert.ok(!canonical.includes('linear-gradient('), 'Gradient decoration must not replace hard pixel structure.');
assert.ok(!canonical.includes('@keyframes'), 'Shared presentation must stay free of keyframe motion.');
assert.ok(!canonical.includes('0 18px 46px'), 'Soft dashboard elevation must stay retired.');
assert.ok(!canonical.includes('0 14px 34px'), 'Soft HUD shadow must stay retired.');
assert.ok(!base.includes('html body #game-container #game-hud-rail'), 'style.css must not regain HUD-specific high-specificity rules.');
assert.ok(!base.includes('--hud-shell:'), 'Legacy HUD theme variables must not return to style.css.');
assert.ok(!base.includes('.profit-card'), 'Base CSS must not regain settlement presentation ownership.');
assert.ok(!mobile.includes('#settlement-screen.active'), 'Mobile geometry must not own settlement composition.');
assert.ok(!mobile.includes('#game-hud-rail .weather-status'), 'Mobile geometry must not own HUD/weather presentation.');
assert.ok(!mobile.includes('top: calc(max(6px, env(safe-area-inset-top)) + 88px)'), 'Mobile speed control must stay out of the market canvas.');
assert.ok(!index.includes('premium-ui-refinement.js'), 'The retired runtime geometry layer must stay deleted.');
assert.ok(!premiumUi.includes('style.textContent = `'));
assert.ok(!premiumUi.includes('installPixelCompatibilityStyles'));

console.log('Single-owner Pixel Market Arcade presentation, source-owned geometry, and state-driven mobile command layout remain separated.');