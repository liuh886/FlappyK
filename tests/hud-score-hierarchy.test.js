const assert = require('node:assert/strict');
const fs = require('node:fs');

const base = fs.readFileSync('style.css', 'utf8');
const refinement = fs.readFileSync('premium-ui-refinement.css', 'utf8');
const refinementJs = fs.readFileSync('scripts/premium-ui-refinement.js', 'utf8');

for (const contract of [
  'one score-first hierarchy',
  'grid-template-columns: minmax(142px, 1.7fr) minmax(82px, 0.72fr) minmax(82px, 0.72fr)',
  ".stats-box[data-composition='returns-only'] .excess-meter",
  'grid-column: 1 !important',
  ".stats-box[data-composition='returns-only'] .hud-total",
  'grid-column: 2 !important',
  ".stats-box[data-composition='returns-only'] .hud-return",
  'grid-column: 3 !important',
  '#live-excess-display',
  'font-size: 17px !important',
  'color: #c7d2de !important',
  'grid-template-columns: minmax(124px, 1.55fr) minmax(68px, 0.72fr) minmax(68px, 0.72fr)',
  'font-size: 14px !important',
]) {
  assert.ok(base.includes(contract), `Missing score-first HUD visual contract: ${contract}`);
}

assert.ok(
  base.indexOf(".stats-box[data-composition='returns-only'] .excess-meter")
    < base.indexOf(".stats-box[data-composition='returns-only'] .hud-total"),
  'The formal HUD owner must define the primary Excess score before secondary bankroll metrics.',
);

for (const structuralContract of [
  "'performance controls'",
  "'weather progress'",
]) {
  assert.ok(refinement.includes(structuralContract), `Mobile HUD structure changed unexpectedly: ${structuralContract}`);
}

assert.ok(refinementJs.includes("rail.appendChild(element)"), 'HUD must keep the existing shared rail composition.');
assert.ok(!refinementJs.includes('style.textContent = `'), 'HUD presentation must remain in the stylesheet owner, not runtime CSS.');

console.log('Excess is the primary live score, bankroll metrics are secondary, and existing weather/run/control rail ownership is preserved.');
