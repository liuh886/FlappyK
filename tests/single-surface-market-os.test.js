'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const css = fs.readFileSync('premium-ui.css', 'utf8');
const base = fs.readFileSync('style.css', 'utf8');
const mobile = fs.readFileSync('mobile-controls.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const weather = fs.readFileSync('scripts/market-weather.js', 'utf8');
const premiumUi = fs.readFileSync('scripts/premium-ui.js', 'utf8');
const refinement = fs.readFileSync('scripts/premium-ui-refinement.js', 'utf8');
const story = fs.readFileSync('scripts/home-story.js', 'utf8');
const i18n = fs.readFileSync('scripts/i18n.js', 'utf8');
const direction = fs.readFileSync('docs/ARCADE_VISUAL_DIRECTION.md', 'utf8');

for (const contract of [
  'FLAPPY K / SINGLE-SURFACE MARKET OS',
  "--pixel-font-display: 'Press Start 2P'",
  "--pixel-font-ui: 'Pixelify Sans'",
  '--game-accent:',
  '--game-system:',
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
  '.home-mode-stack',
  '.home-primary-actions #start-btn',
  '.home-world-strip',
  'Story: analysis mode, not a second visual world',
  '.home-story-slide',
  'Settlement: same market surface',
  '.profit-card',
  'Run complete: no separate celebration skin',
  '.legend-terminal-head',
  "html[data-flappyk-language='zh']",
  "'ZCOOL QingKe HuangYou'",
  '@media (max-width: 719px)',
  '@media (prefers-reduced-motion: reduce)',
]) {
  assert.ok(css.includes(contract), `Missing Single-Surface Market OS contract: ${contract}`);
}

for (const contract of [
  '#mobile-controls:not([hidden])',
  'Touch geometry only. Shared color, typography and button skin live in premium-ui.css.',
  'Runtime state decides whether this dock exists; viewport width does not.',
  'position: fixed;',
  'display: grid;',
  'width: 100vw;',
]) {
  assert.ok(mobile.includes(contract), `Missing mobile geometry owner contract: ${contract}`);
}

assert.ok(!css.includes('#mobile-controls:not([hidden]) {'), 'Shared theme must not take ownership of mobile dock geometry.');
assert.ok(base.includes('.home-story-equation'));
assert.ok(base.includes('pointer-events: none;'));

for (const retired of [
  'Settlement as a score receipt',
  'Story / field-manual page',
  'background: #e7e2d4',
  '--pixel-cut:',
  'clip-path: var(--pixel-cut)',
  'box-shadow: 8px 8px',
]) {
  assert.ok(!css.includes(retired), `Retired mixed visual metaphor returned: ${retired}`);
}

for (const retiredBase of [
  '.card-theme-crypto',
  '.card-theme-ashare',
  '.card-theme-usstock',
  '.export-area',
  '.action-btn',
  '.trade-emoji',
]) {
  assert.ok(!base.includes(retiredBase), `Legacy base visual owner returned: ${retiredBase}`);
}

for (const retiredMobileOwner of [
  '#settlement-screen.active',
  "html[data-ui-state='home'] body #game-container #start-screen.arcade-home",
  '#game-hud-rail .weather-status',
]) {
  assert.ok(!mobile.includes(retiredMobileOwner), `Cross-owner mobile rule returned: ${retiredMobileOwner}`);
}

for (const retiredInline of [
  'style="display:none;',
  'style="background-color:',
  'style="color:',
  'style="flex-direction:',
]) {
  assert.ok(!index.includes(retiredInline), `Legacy inline visual styling returned: ${retiredInline}`);
}

assert.ok(index.includes('class="settlement-actions"'));
assert.ok(index.includes('class="legend-terminal-head"'));
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
  'Canonical direction: Single-Surface Market OS',
  'one continuous dark market surface',
  'There is no alternative legacy skin',
  'Chinese and English are one product, not two layouts.',
  '`premium-ui.css` is the single canonical owner',
]) {
  assert.ok(direction.includes(principle), `Missing visual-direction principle: ${principle}`);
}

console.log('Single-Surface Market OS, deleted legacy base skin, bilingual parity, state-driven mobile geometry, and single-owner shared visual contracts passed.');
