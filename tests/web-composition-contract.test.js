const assert = require('node:assert/strict');
const fs = require('node:fs');

const hardeningJs = fs.readFileSync('core-hardening.js', 'utf8');
const refinementJs = fs.readFileSync('scripts/premium-ui-refinement.js', 'utf8');
const refinementCss = fs.readFileSync('premium-ui-refinement.css', 'utf8');
const baseStyles = fs.readFileSync('style.css', 'utf8');
const weatherCss = fs.readFileSync('market-weather.css', 'utf8');
const homeCss = fs.readFileSync('home-market.css', 'utf8');
const homeJs = fs.readFileSync('scripts/home-market.js', 'utf8');
const indicatorCss = fs.readFileSync('indicator-cards.css', 'utf8');
const indicatorJs = fs.readFileSync('scripts/indicator-cards.js', 'utf8');
const accountCss = fs.readFileSync('account-integration.css', 'utf8');
const pwaSource = fs.readFileSync('pwa.js', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

assert.ok(hardeningJs.includes('levelDisp.textContent = String(visibleGame)'));
assert.ok(!hardeningJs.includes('levelDisp.textContent = `${visibleGame}/3`'));

assert.ok(refinementJs.includes('const DESKTOP_CANVAS_WIDTH = 896'));
assert.ok(refinementJs.includes('const DESKTOP_CANVAS_HEIGHT = 672'));
assert.ok(refinementJs.includes("const HUD_RAIL_ID = 'game-hud-rail'"));
assert.ok(refinementJs.includes('function ensureHudRail()'));
assert.ok(refinementJs.includes("rail.id = HUD_RAIL_ID"));
assert.ok(refinementJs.includes("uiLayer.dataset.hudComposition = 'rail'"));
assert.ok(refinementJs.includes("runPanel.id = 'run-progress-panel'"));
assert.ok(refinementJs.includes("[status, stats, runPanel, topControls]"));
assert.ok(refinementJs.includes("topControls.insertBefore(speedControl, topControls.firstChild)"));
assert.ok(refinementJs.includes("gameContainer?.appendChild(controlsHint)"));
assert.ok(refinementJs.includes("stats.dataset.composition = 'returns-only'"));
assert.ok(refinementJs.includes('usesVirtualControls()'));
assert.ok(refinementJs.includes('function normalizeMetricRows()'));
assert.ok(refinementJs.includes("labelElement.className = 'hud-metric-label'"));
assert.ok(refinementJs.includes("button.textContent = ''"));
assert.ok(refinementJs.includes("font-size: 15px !important"));
assert.ok(refinementJs.includes("font-size: 12px !important"));
assert.ok(refinementJs.includes("border-radius: 0 !important"));
assert.ok(refinementJs.includes("white-space: nowrap"));
assert.ok(refinementJs.includes("grid-template-areas:"));
assert.ok(refinementJs.includes("'performance controls'"));
assert.ok(refinementJs.includes("'weather progress'"));
assert.ok(refinementJs.includes("#mobile-controls:not([hidden])"));
assert.ok(refinementJs.includes(".controls-hint"));
assert.ok(refinementJs.includes("transform: translateX(-50%)"));

assert.ok(refinementCss.includes("family=Pixelify+Sans"));
assert.ok(refinementCss.includes("--pixel-font-display: 'Press Start 2P'"));
assert.ok(refinementCss.includes("--pixel-font-ui: 'Pixelify Sans'"));
assert.ok(refinementCss.includes('--pixel-grid: 4px'));
assert.ok(refinementCss.includes('--pixel-shadow-step: 4px 4px'));
assert.ok(refinementCss.includes('--pixel-cut: polygon'));
assert.ok(refinementCss.includes(".stats-box[data-composition='returns-only']"));
assert.ok(refinementCss.includes('.run-progress-panel'));
assert.ok(refinementCss.includes('width: min(896px'));
assert.ok(refinementCss.includes('.trade-key-hints'));
assert.ok(refinementCss.includes('#game-top-controls .desktop-speed-control'));
assert.ok(refinementCss.includes('backdrop-filter: none'));
assert.ok(refinementCss.includes("html[data-virtual-controls='true'] #game-top-controls .desktop-speed-control"));
assert.ok(refinementCss.includes("width: min(316px, calc(100% - 108px))"));
assert.ok(refinementCss.includes('width: 176px'));
assert.ok(refinementCss.includes('font-size: 13px'));
assert.ok(refinementCss.includes('font-size: 12px'));
assert.ok(refinementCss.includes('box-shadow: none'));
assert.ok(refinementCss.includes('clip-path: none'));
assert.ok(refinementCss.includes('.run-progress-panel .hud-details'));
assert.ok(accountCss.includes('.home-utility-bar'));
assert.ok(accountCss.includes('.home-account-slot .hao-account-trigger'));
assert.ok(accountCss.includes("html:not([data-ui-state='home']) .home-utility-bar"));
assert.ok(!pwaSource.includes('hud-compact.css'));
assert.ok(!pwaSource.includes('flappyk-membership-client'));

for (const hudLanguageContract of [
  'HUD instrument system: one shell, one divider, one label/value hierarchy.',
  '--hud-shell:',
  '--hud-divider:',
  '--hud-label:',
  '--hud-value:',
  '--hud-positive:',
  '--hud-negative:',
  '#game-hud-rail .weather-status::before',
  "html[data-market-weather='cloudy']",
  '.run-progress-panel .hud-header',
  '#game-top-controls .speed-step:hover',
  '.trade-key-hint + .trade-key-hint',
]) {
  assert.ok(baseStyles.includes(hudLanguageContract), `Missing unified HUD language contract: ${hudLanguageContract}`);
}

for (const homeSceneContract of [
  '.home-market-screen',
  '.home-market-canvas',
  '.home-market-wallet',
  '.home-market-controls',
  '.home-market-menu',
  '.resource-glyph--coin',
  '.resource-glyph--stock',
  '.hud-cash-resource',
  "grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.82fr) minmax(0, 0.9fr) minmax(0, 1.13fr)",
  '@media (max-width: 780px), (pointer: coarse)',
]) {
  assert.ok(homeCss.includes(homeSceneContract), `Missing interactive home composition contract: ${homeSceneContract}`);
}

for (const homeBehaviorContract of [
  'function drawFloor(',
  'function drawCandles(',
  "event.key === 'ArrowUp'",
  "event.key === 'ArrowDown'",
  'function promoteGameCashResource()',
  "window.FlappyKHomeMarket",
]) {
  assert.ok(homeJs.includes(homeBehaviorContract), `Missing interactive home behavior contract: ${homeBehaviorContract}`);
}

for (const indicatorContract of [
  '#indicator-overlay',
  '.indicator-card-deck',
  '.indicator-card.is-active',
  "@media (max-width: 720px), (pointer: coarse)",
]) {
  assert.ok(indicatorCss.includes(indicatorContract), `Missing tactical card composition contract: ${indicatorContract}`);
}
for (const indicatorBehavior of [
  "event.key === '1'",
  "event.key === '2'",
  "overlay.id = 'indicator-overlay'",
  "deck.id = 'indicator-card-deck'",
]) {
  assert.ok(indicatorJs.includes(indicatorBehavior), `Missing tactical card behavior contract: ${indicatorBehavior}`);
}

assert.ok(weatherCss.includes("html[data-ui-state='home'] #game-container.arcade-weather-ready"));
assert.ok(weatherCss.includes('width: 100vw'));
assert.ok(weatherCss.includes('height: 100dvh'));
assert.ok(weatherCss.includes('The home scene itself belongs to home-market.css.'));
assert.ok(!weatherCss.includes('.home-console-screen'));

assert.ok(serviceWorker.includes("flappyk-app-v22"));
assert.ok(serviceWorker.includes("flappyk-runtime-v22"));
assert.ok(!serviceWorker.includes("'./hud-compact.css'"));
assert.ok(serviceWorker.includes("'./account-integration.css'"));
assert.ok(serviceWorker.includes("'./scripts/account-cloud-sync.js'"));
assert.ok(serviceWorker.includes("'./membership-config.js'"));
assert.ok(serviceWorker.includes("'./home-market.css'"));
assert.ok(serviceWorker.includes("'./scripts/home-market.js'"));
assert.ok(serviceWorker.includes("'./indicator-cards.css'"));
assert.ok(serviceWorker.includes("'./scripts/indicator-cards.js'"));
assert.ok(!serviceWorker.includes('home-story'));
assert.ok(!serviceWorker.includes("'./scripts/cloud-run-sync-core.js'"));
assert.ok(!serviceWorker.includes("'./membership-sync.css'"));
assert.ok(serviceWorker.includes("'./market-weather.css'"));
assert.ok(serviceWorker.includes("'./scripts/market-weather.js'"));

console.log('Interactive market home, unified coin HUD, tactical indicator deck, explicit ownership, coordinated controls, pixel typography, responsive layout, cloud history, and PWA v22 contracts passed');