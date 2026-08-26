const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('index.html', 'utf8');
const mobile = fs.readFileSync('mobile-controls.css', 'utf8');
const premium = fs.readFileSync('premium-ui.css', 'utf8');
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
  '#mobile-controls:not([hidden])',
  'display: grid',
  'grid-template-columns: minmax(36px, 1fr) 78px 108px 78px minmax(36px, 1fr)',
  '#mobile-controls #btn-buy',
  '#mobile-controls #btn-sell',
  'grid-column: 2',
  'grid-column: 4',
  '#mobile-controls .mobile-speed-control',
  'grid-column: 3',
  'position: static',
  'grid-template-columns: 30px 44px 30px',
  "html[data-virtual-controls='true'] #game-top-controls",
  'grid-template-columns: 44px 44px',
  'width: 44px',
  'height: 44px',
  "data-ui-state='playing'",
  'height: calc(100% - 102px - env(safe-area-inset-bottom))',
]) {
  assert.ok(mobile.includes(contract), `Missing mobile gameplay hierarchy contract: ${contract}`);
}

assert.ok(premium.includes('.mobile-speed-control .speed-readout'));
assert.ok(premium.includes('#btn-buy'));
assert.ok(premium.includes('#btn-sell'));
assert.ok(!mobile.includes('opacity: 0.68'), 'Mobile geometry must not encode visual hierarchy through opacity.');
assert.ok(!mobile.includes('background: rgba(6, 12, 20'), 'Mobile geometry must not own HUD translucency.');
assert.ok(!mobile.includes('top: calc(max(6px, env(safe-area-inset-top)) + 88px)'), 'Speed must not float over the market canvas.');
assert.ok(!mobile.includes('margin-bottom: 102px'), 'The fixed dock must reduce the canvas drawing box instead of overlaying a full-height stage.');

for (const contract of [
  'right: max(6px, env(safe-area-inset-right))',
  'left: max(6px, env(safe-area-inset-left))',
  'z-index: 82',
  'grid-template-columns: 64px 64px',
  'justify-content: space-between',
  'width: 64px',
  '.indicator-card-copy small',
  'display: none',
  'grid-template-columns: 1fr',
  'grid-template-rows: auto auto',
  'min-height: 48px',
  'font-size: 9px',
  'border-width: 2px',
  'background: var(--game-bg, #06080c)',
  'box-shadow: 3px 3px 0 var(--game-bg',
  'transform: translate(2px, 2px)',
]) {
  assert.ok(cards.includes(contract), `Missing tactile outer mobile power-up contract: ${contract}`);
}

assert.ok(!cards.includes('clip-path:'), 'Power-up controls must not return to clipped-card decoration.');
assert.ok(!cards.includes('#a98bff'), 'Purple power-up styling must not return.');
assert.ok(!cards.includes('box-shadow: inset 0'), 'Mobile power-ups must use physical hard depth instead of inset terminal styling.');
assert.ok(!mobile.includes('grid-template-columns: 88px minmax(106px, 1fr) 88px'), 'The oversized centered speed-control layout must not return to the mobile spatial owner.');
assert.ok(!mobile.includes(":has(#indicator-card-deck:not([hidden])) #game-canvas"), 'Power-ups must not reserve a separate tray above the mobile command dock.');
assert.ok(!cards.includes('width: min(248px, calc(100% - 28px))'), 'The previous oversized mobile tactical tray must not return.');

console.log('State-driven touch geometry, dock-contained speed, reserved canvas stage, 44px navigation, tactile pixel power-ups, and always-visible settlement identity contracts passed.');
