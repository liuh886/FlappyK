const assert = require('node:assert/strict');
const fs = require('node:fs');

const canonical = fs.readFileSync('premium-ui.css', 'utf8');
const mobile = fs.readFileSync('mobile-controls.css', 'utf8');
const base = fs.readFileSync('style.css', 'utf8');
const refinementJs = fs.readFileSync('scripts/premium-ui-refinement.js', 'utf8');

for (const structuralContract of [
  'grid-template-rows: minmax(0, 1fr)',
  'min-height: 0 !important',
  "'performance controls'",
  "'weather progress'",
  '#game-hud-rail',
]) {
  assert.ok(canonical.includes(structuralContract), `Missing canonical HUD geometry contract: ${structuralContract}`);
}

for (const visualContract of [
  'MARKET ARCADE pass',
  'border-radius: 0',
  'backdrop-filter: none',
  'box-shadow: 0 7px 0 #8e7520',
  'border-right: 1px solid var(--game-border)',
  '@keyframes arcade-rail-scan',
  '@keyframes arcade-score-pop',
]) {
  assert.ok(canonical.includes(visualContract), `Missing readable Market Arcade visual contract: ${visualContract}`);
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
  'grid-template-columns: 44px 44px;',
]) {
  assert.ok(mobile.includes(mobileContract), `Missing feature-owned mobile geometry contract: ${mobileContract}`);
}

assert.ok(!canonical.includes('#mobile-controls:not([hidden]) {'), 'premium-ui.css must not take over command-dock positioning.');
assert.ok(!canonical.includes('--pixel-cut:'), 'Decorative clipped-corner geometry must not return.');
assert.ok(!canonical.includes('shadowBlur'), 'Canvas-era neon glow language must not enter shared CSS.');
assert.ok(!base.includes('html body #game-container #game-hud-rail'), 'style.css must not regain HUD-specific high-specificity rules.');
assert.ok(!base.includes('--hud-shell:'), 'Legacy HUD theme variables must not return to style.css.');
assert.ok(!base.includes('.profit-card'), 'Base CSS must not regain settlement presentation ownership.');
assert.ok(!mobile.includes('#settlement-screen.active'), 'Mobile geometry must not own settlement composition.');
assert.ok(!mobile.includes('#game-hud-rail .weather-status'), 'Mobile geometry must not own HUD/weather presentation.');
assert.ok(!mobile.includes('top: calc(max(6px, env(safe-area-inset-top)) + 88px)'), 'Mobile speed control must stay out of the market canvas.');
assert.ok(!refinementJs.includes('style.textContent = `'));
assert.ok(!refinementJs.includes('installPixelCompatibilityStyles'));

console.log('Single-owner Market Arcade presentation, minimal base styles, purposeful game depth, and dock-contained state-driven mobile command geometry remain separated.');
