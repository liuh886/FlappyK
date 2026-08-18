'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const css = fs.readFileSync('premium-ui.css', 'utf8');
const mobile = fs.readFileSync('mobile-controls.css', 'utf8');
const weather = fs.readFileSync('scripts/market-weather.js', 'utf8');
const premiumUi = fs.readFileSync('scripts/premium-ui.js', 'utf8');
const refinement = fs.readFileSync('scripts/premium-ui-refinement.js', 'utf8');
const story = fs.readFileSync('scripts/home-story.js', 'utf8');
const i18n = fs.readFileSync('scripts/i18n.js', 'utf8');
const direction = fs.readFileSync('docs/ARCADE_VISUAL_DIRECTION.md', 'utf8');

for (const contract of [
  'FLAPPY K / HIDDEN MARKET TERMINAL',
  "--pixel-font-display: 'Press Start 2P'",
  "--pixel-font-ui: 'Pixelify Sans'",
  '--pixel-cut: polygon',
  '--arcade-sky:',
  '--arcade-horizon:',
  "#ui-layer[data-hud-composition='rail']",
  '#ui-layer[hidden]',
  '#game-hud-rail',
  "'performance controls'",
  "'weather progress'",
  ".stats-box[data-composition='returns-only']",
  '.excess-meter-track',
  '#btn-buy',
  '#btn-sell',
  "html[data-ui-state='home'] #game-container.arcade-weather-ready",
  '#start-screen.arcade-home',
  '.home-console-bezel',
  '.home-console-screen',
  "'title profile'",
  '.local-records-summary',
  '.home-mode-stack',
  '.home-primary-actions #start-btn',
  '.home-world-strip',
  '.home-story-slide',
  'Story / field-manual page',
  '.profit-card',
  'Settlement as a score receipt',
  "html[data-flappyk-language='zh']",
  "'ZCOOL QingKe HuangYou'",
  '@media (max-width: 720px), (pointer: coarse)',
  '@media (prefers-reduced-motion: reduce)',
]) {
  assert.ok(css.includes(contract), `Missing Hidden Market Terminal contract: ${contract}`);
}

for (const contract of [
  '#mobile-controls:not([hidden])',
  'position: fixed;',
  'width: 100vw;',
  'grid-template-columns: minmax(64px, 1fr) 78px 10px 78px minmax(64px, 1fr) !important;',
]) {
  assert.ok(mobile.includes(contract), `Missing mobile geometry owner contract: ${contract}`);
}

assert.ok(!css.includes('#mobile-controls:not([hidden]) {'), 'Shared theme must not take ownership of mobile dock geometry.');

for (const forbidden of [
  'visual-redesign-v1.css',
  'mobile-home-quality.css',
  'mobile-arcade-polish.css',
  'backdrop-filter: blur(',
]) {
  assert.ok(!css.includes(forbidden), `Retired visual layer returned: ${forbidden}`);
}

assert.ok(weather.includes('function installHomeConsole()'));
assert.ok(weather.includes('function installPixelTradeGlyphs()'));
assert.ok(premiumUi.includes('function installHomeHierarchy()'));
assert.ok(premiumUi.includes('function installHud()'));
assert.ok(premiumUi.includes('function installMobileControls()'));
assert.ok(premiumUi.includes('function installSettlementSummary()'));
assert.ok(refinement.includes("const HUD_RAIL_ID = 'game-hud-rail'"));
assert.ok(!refinement.includes('style.textContent = `'));
assert.ok(story.includes("startScreen.classList.toggle('is-story-active'"));
assert.ok(story.includes('最好的交易，往往很安静。'));
assert.ok(i18n.includes('document.documentElement.dataset.flappykLanguage = language'));

for (const principle of [
  'Canonical direction: Hidden Market Terminal',
  'There is no alternative legacy skin',
  'Chinese and English are one product, not two layouts.',
  '`premium-ui.css` is the single canonical owner',
]) {
  assert.ok(direction.includes(principle), `Missing visual-direction principle: ${principle}`);
}

console.log('Hidden Market Terminal, bilingual parity, feature-owned mobile geometry, field-note story, score receipt, and single-owner shared visual contracts passed.');
