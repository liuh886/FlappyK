const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('index.html', 'utf8');
const mobile = fs.readFileSync('mobile-controls.css', 'utf8');
const cards = fs.readFileSync('indicator-cards.css', 'utf8');

const identityStart = index.indexOf('settlement-market-identity');
const detailsStart = index.indexOf('<div class="card-details">');
assert.ok(identityStart >= 0, 'Settlement must expose a permanent market-identity block.');
assert.ok(detailsStart > identityStart, 'Asset and period must appear before the collapsible detail block.');
assert.ok(index.indexOf('id="card-asset"') < detailsStart, 'Asset must never be hidden inside settlement details.');
assert.ok(index.indexOf('id="card-period"') < detailsStart, 'Period must never be hidden inside settlement details.');
assert.equal((index.match(/id="card-asset"/g) || []).length, 1, 'Asset ID must stay unique.');
assert.equal((index.match(/id="card-period"/g) || []).length, 1, 'Period ID must stay unique.');

for (const contract of [
  "grid-template-columns: minmax(72px, 1fr) auto minmax(72px, 1fr)",
  '#mobile-controls #btn-buy',
  '#mobile-controls #btn-sell',
  'grid-column: 1',
  'grid-column: 3',
  '#mobile-controls .mobile-speed-control',
  'position: fixed',
  'top: calc(max(6px, env(safe-area-inset-top)) + 88px)',
  'right: max(10px, env(safe-area-inset-right))',
  'grid-template-columns: 28px 38px 28px',
  'opacity: 0.68',
  'background: transparent',
  "data-ui-state='playing'",
  ':has(#indicator-card-deck:not([hidden])) #game-canvas',
  'margin-bottom: 184px',
]) {
  assert.ok(mobile.includes(contract), `Missing mobile gameplay hierarchy contract: ${contract}`);
}

for (const contract of [
  'left: 50%',
  'transform: translateX(-50%)',
  'width: min(190px',
  'width: min(180px',
  '.indicator-card-copy small',
  'display: none',
  'grid-template-columns: minmax(0, 1fr) auto',
  'min-height: 44px',
  'border-width: 1px',
  'justify-self: center',
  'background: transparent',
]) {
  assert.ok(cards.includes(contract), `Missing mini mobile tactical-hand contract: ${contract}`);
}

assert.ok(!mobile.includes('grid-template-columns: 88px minmax(106px, 1fr) 88px'), 'The oversized centered speed-control layout must not return to the mobile spatial owner.');
assert.ok(!cards.includes('width: min(248px, calc(100% - 28px))'), 'The previous oversized mobile tactical tray must not return.');

console.log('Top speed utility, bottom thumb hierarchy, mini tactical cards, and always-visible settlement identity contracts passed.');
