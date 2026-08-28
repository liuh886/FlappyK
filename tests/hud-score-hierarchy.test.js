const assert = require('node:assert/strict');
const fs = require('node:fs');

const base = fs.readFileSync('style.css', 'utf8');
const canonicalUi = fs.readFileSync('premium-ui.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const premiumJs = fs.readFileSync('scripts/premium-ui.js', 'utf8');

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
assert.ok(!canonicalUi.includes('--game-yellow:'), 'The retired generic yellow token must not return; primary action uses --game-accent.');

for (const contract of [
  'id="game-hud-rail"',
  'id="run-progress-panel"',
  'data-composition="returns-only"',
  'class="game-speed-control desktop-speed-control"',
  'class="controls-hint"',
]) {
  assert.ok(index.includes(contract), `Final HUD composition must live in index.html: ${contract}`);
}
assert.ok(!index.includes('premium-ui-refinement.js'), 'The retired runtime composition layer must remain deleted.');
for (const retiredInstaller of ['installHud', 'installDesktopControls', 'installMobileControls']) {
  assert.ok(!premiumJs.includes(retiredInstaller), `premium-ui.js must remain behavior-only: ${retiredInstaller}`);
}

console.log('Single-surface HUD source composition and semantic color ownership remain stable.');