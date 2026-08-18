'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const mobile = fs.readFileSync('mobile-controls.css', 'utf8');
const cards = fs.readFileSync('indicator-cards.css', 'utf8');

for (const contract of [
  "html[data-ui-state='home'] body #game-container #start-screen.arcade-home .home-console-screen",
  'justify-content: center !important;',
  '#settlement-screen.active',
  'background: rgba(6, 12, 20, 0.44) !important;',
  'background: rgba(6, 12, 20, 0.3) !important;',
  'background: rgba(6, 12, 20, 0.08) !important;',
  'grid-template-columns: minmax(64px, 1fr) 78px 10px 78px minmax(64px, 1fr);',
  'grid-column: 2;',
  'grid-column: 4;',
  'Virtual-control geometry is driven by runtime state, not viewport width.',
]) {
  assert.ok(mobile.includes(contract), `Missing mobile visual-balance contract: ${contract}`);
}

assert.ok(
  !mobile.includes(":has(#indicator-card-deck:not([hidden])) #game-canvas"),
  'Power-ups must not reserve a separate mobile tray above the command dock.',
);

for (const contract of [
  'bottom: calc(28px + env(safe-area-inset-bottom));',
  'z-index: 82;',
  'grid-template-columns: 64px 64px;',
  'justify-content: space-between;',
  'width: 64px;',
  'min-height: 44px;',
]) {
  assert.ok(cards.includes(contract), `Missing outer power-up contract: ${contract}`);
}

console.log('Mobile visual balance contracts passed.');
