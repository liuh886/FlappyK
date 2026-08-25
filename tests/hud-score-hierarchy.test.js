const assert = require('node:assert/strict');
const fs = require('node:fs');

const base = fs.readFileSync('style.css', 'utf8');
const canonicalUi = fs.readFileSync('premium-ui.css', 'utf8');
const refinementJs = fs.readFileSync('scripts/premium-ui-refinement.js', 'utf8');

assert.ok(!base.includes('Fullscreen gameplay HUD: readable hierarchy over a dominant chart.'), 'Base CSS must not own the HUD visual system.');
assert.ok(!base.includes('html body #game-container #game-hud-rail'), 'High-specificity legacy HUD rules must not return to style.css.');

for (const contract of [
  '#game-hud-rail',
  ".stats-box[data-composition='returns-only']",
  '.hud-main',
  '.hud-total',
  '.hud-return',
  '.excess-meter',
  '#run-progress-panel',
  '#game-top-controls',
  '.controls-hint',
  "'performance controls'",
  "'progress progress'",
  '--game-green:',
  '--game-red:',
  '--game-accent:',
  '--game-system:',
]) {
  assert.ok(canonicalUi.includes(contract), `Missing canonical HUD contract: ${contract}`);
}

assert.ok(canonicalUi.includes('gap: 0;'), 'The HUD should read as one continuous command surface.');
assert.ok(canonicalUi.includes('border-right: 1px solid var(--game-border);'), 'HUD hierarchy should use separators rather than independent cards.');
assert.ok(!canonicalUi.includes('--game-yellow:'), 'The retired generic yellow token must not return; primary action uses --game-accent.');

assert.ok(refinementJs.includes("rail.appendChild(element)"), 'HUD must keep the existing shared rail composition.');
assert.ok(!refinementJs.includes('style.textContent = `'), 'HUD presentation must remain in the stylesheet owner, not runtime CSS.');

console.log('Single-surface HUD composition and semantic color ownership remain stable.');