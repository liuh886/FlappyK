'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const mobile = fs.readFileSync('mobile-controls.css', 'utf8');
const premium = fs.readFileSync('premium-ui.css', 'utf8');
const cards = fs.readFileSync('indicator-cards.css', 'utf8');

for (const contract of [
  'grid-template-columns: minmax(36px, 1fr) 78px 108px 78px minmax(36px, 1fr);',
  'grid-column: 2;',
  'grid-column: 3;',
  'grid-column: 4;',
  'grid-template-columns: 44px 44px;',
  'Touch geometry only. Shared color, typography and button skin live in premium-ui.css.',
  'Runtime state decides whether this dock exists; viewport width does not.',
]) {
  assert.ok(mobile.includes(contract), `Missing mobile geometry contract: ${contract}`);
}

for (const retiredCrossOwner of [
  "html[data-ui-state='home'] body #game-container #start-screen.arcade-home",
  '#settlement-screen.active',
  'background: rgba(6, 12, 20, 0.44) !important;',
  'background: rgba(6, 12, 20, 0.3) !important;',
  'background: rgba(6, 12, 20, 0.08) !important;',
  'top: calc(max(6px, env(safe-area-inset-top)) + 88px)',
]) {
  assert.ok(!mobile.includes(retiredCrossOwner), `Cross-owner mobile visual rule returned: ${retiredCrossOwner}`);
}

assert.ok(premium.includes('#game-hud-rail'));
assert.ok(premium.includes("#game-hud-rail .weather-status"));
assert.ok(premium.includes('.profit-card'));
assert.ok(
  !mobile.includes(":has(#indicator-card-deck:not([hidden])) #game-canvas"),
  'Power-ups must not reserve a separate mobile tray above the command dock.',
);

for (const contract of [
  'bottom: calc(28px + env(safe-area-inset-bottom));',
  'z-index: 82;',
  'grid-template-columns: 60px 60px;',
  'justify-content: space-between;',
  'width: 60px;',
  'min-height: 44px;',
]) {
  assert.ok(cards.includes(contract), `Missing compact system power-up contract: ${contract}`);
}

assert.ok(!cards.includes('clip-path:'));
assert.ok(!cards.includes('#a98bff'));

console.log('Mobile visual balance enforces a centered command dock, 44px navigation, compact system power-ups, and no cross-owner HUD/home/settlement overrides.');
