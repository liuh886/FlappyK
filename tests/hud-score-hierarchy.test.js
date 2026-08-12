const assert = require('node:assert/strict');
const fs = require('node:fs');

const base = fs.readFileSync('style.css', 'utf8');
const refinement = fs.readFileSync('premium-ui-refinement.css', 'utf8');
const refinementJs = fs.readFileSync('scripts/premium-ui-refinement.js', 'utf8');

for (const contract of [
  'Fullscreen gameplay HUD: readable hierarchy over a dominant chart.',
  'grid-template-columns: minmax(210px, 1.55fr) minmax(110px, 0.8fr) minmax(110px, 0.8fr)',
  ".stats-box[data-composition='returns-only'] .excess-meter",
  'grid-column: 1 !important',
  ".stats-box[data-composition='returns-only'] .hud-total",
  'grid-column: 2 !important',
  ".stats-box[data-composition='returns-only'] .hud-return",
  'grid-column: 3 !important',
  '#live-excess-display',
  'font-size: 26px !important',
  'color: #d2dbe5 !important',
  'grid-template-columns: minmax(118px, 1.5fr) minmax(64px, 0.72fr) minmax(64px, 0.72fr)',
  'font-size: 18px !important',
]) {
  assert.ok(base.includes(contract), `Missing readable score-first HUD visual contract: ${contract}`);
}

assert.ok(
  base.indexOf(".stats-box[data-composition='returns-only'] .excess-meter")
    < base.indexOf(".stats-box[data-composition='returns-only'] .hud-total"),
  'The formal HUD owner must define the primary Excess score before secondary bankroll metrics.',
);
assert.ok(!base.includes('font-size: 5px !important'), 'Gameplay labels must not regress to unreadable 5px text.');
assert.ok(!base.includes('height: 52px !important'), 'Fullscreen gameplay must not regress to the stretched 52px HUD strip.');

for (const structuralContract of [
  "'performance controls'",
  "'weather progress'",
]) {
  assert.ok(refinement.includes(structuralContract), `Mobile HUD structure changed unexpectedly: ${structuralContract}`);
}

assert.ok(refinementJs.includes("rail.appendChild(element)"), 'HUD must keep the existing shared rail composition.');
assert.ok(!refinementJs.includes('style.textContent = `'), 'HUD presentation must remain in the stylesheet owner, not runtime CSS.');

console.log('Excess remains the primary live score, fullscreen typography is readable, and weather/run/control rail ownership is preserved.');
