const assert = require('node:assert/strict');
const fs = require('node:fs');

const hardeningJs = fs.readFileSync('core-hardening.js', 'utf8');
const gameJs = fs.readFileSync('game.js', 'utf8');
const refinementJs = fs.readFileSync('scripts/premium-ui-refinement.js', 'utf8');
const refinementCss = fs.readFileSync('premium-ui.css', 'utf8');
const baseStyles = fs.readFileSync('style.css', 'utf8');
const weatherCss = fs.readFileSync('market-weather.css', 'utf8');
const accountCss = fs.readFileSync('account-integration.css', 'utf8');
const pwaSource = fs.readFileSync('pwa.js', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

assert.ok(hardeningJs.includes('levelDisp.textContent = String(visibleGame)'));
assert.ok(!hardeningJs.includes('levelDisp.textContent = `${visibleGame}/3`'));

// JavaScript owns composition/state only; presentation must stay static and reviewable.
assert.ok(!refinementJs.includes('canvasElement.width ='));
assert.ok(!refinementJs.includes('canvasElement.height ='));
assert.ok(!refinementJs.includes('syncCanvasLayout'));
assert.ok(gameJs.includes('window.devicePixelRatio'));
assert.ok(gameJs.includes('ctx.setTransform(dpr, 0, 0, dpr, 0, 0)'));
assert.ok(!refinementJs.includes('DESKTOP_CANVAS_WIDTH'));
assert.ok(!refinementJs.includes('DESKTOP_CANVAS_HEIGHT'));
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
assert.ok(!refinementJs.includes('PIXEL_COMPATIBILITY_STYLE_ID'));
assert.ok(!refinementJs.includes('style.textContent = `'));
assert.ok(!refinementJs.includes('installPixelCompatibilityStyles'));

// Curated presentation layer owns typography, home, structural composition, and secondary screens.
assert.ok(!refinementCss.includes('width: min(896px'), 'Fixed desktop viewport width must not return.');
assert.ok(!refinementCss.includes('aspect-ratio: 4 / 3'), 'Fixed desktop viewport aspect ratio must not return.');
for (const contract of [
  "--pixel-font-display: 'Press Start 2P'",
  "--pixel-font-ui: 'Pixelify Sans'",
  '--pixel-grid: 4px',
  '--pixel-shadow-step: 4px 4px',
  '--pixel-cut: polygon',
  '--space-1: 4px',
  '--space-6: 24px',
  '#ui-layer[data-hud-composition=',
  '#game-hud-rail',
  '.hud-metric-label',
  "html[data-virtual-controls='true'] #game-top-controls .desktop-speed-control",
  "html[data-ui-state='home'] .controls-hint",
  "#game-hud-rail .stats-box[data-composition='returns-only']",
  "position: static !important",
  'grid-template-areas:',
  "'performance controls'",
  "'weather progress'",
  'grid-area: performance',
  'grid-area: controls',
  'grid-area: weather',
  'grid-area: progress',
]) {
  assert.ok(refinementCss.includes(contract), `Missing curated presentation contract: ${contract}`);
}

// The gameplay instrument system owns a readable score-first hierarchy at fullscreen scale.
assert.ok(!baseStyles.includes('font-size: 5px !important'), 'Gameplay UI must not regress to 5px labels.');
assert.ok(!baseStyles.includes('height: 52px !important'), 'Fullscreen HUD must not regress to the old 52px strip.');
for (const hudLanguageContract of [
  'Fullscreen gameplay HUD: readable hierarchy over a dominant chart.',
  '--hud-shell:',
  '--hud-divider:',
  '--hud-label:',
  '--hud-value:',
  '--hud-positive:',
  '--hud-negative:',
  '#game-hud-rail .weather-status::before',
  "html[data-market-weather='cloudy']",
  "grid-template-columns: minmax(210px, 1.55fr) minmax(110px, 0.8fr) minmax(110px, 0.8fr)",
  ".stats-box[data-composition='returns-only'] .excess-meter",
  '.run-progress-panel .hud-header',
  '#game-top-controls .speed-step:hover',
  '.trade-key-hint + .trade-key-hint',
  "#mobile-controls:not([hidden])",
  '#mobile-controls .mobile-btn',
  'min-height: 84px !important',
  'font-size: 26px !important',
  'font-size: 9px !important',
  'height: auto !important',
]) {
  assert.ok(baseStyles.includes(hudLanguageContract), `Missing readable HUD language contract: ${hudLanguageContract}`);
}

for (const homeShellContract of [
  "html[data-ui-state='home'] #game-container.arcade-weather-ready",
  '#start-screen.arcade-home',
  '.home-console-bezel',
  '.home-console-topline',
  '.home-console-screen',
  '.home-console-footer',
  'width: 100vw',
  'height: 100dvh',
  'grid-template-rows: auto minmax(0, 1fr) auto',
]) {
  assert.ok(refinementCss.includes(homeShellContract), `Missing curated web home contract: ${homeShellContract}`);
}

for (const hierarchyContract of [
  '.home-primary-actions #start-btn',
  '.local-records-summary',
  '.daily-mode-card',
  '.home-secondary-actions button',
  'min-height: 64px',
  'font-size: 22px',
  'min-height: 44px',
  'font-size: 16px',
  'box-shadow: var(--pixel-shadow-small) !important',
]) {
  assert.ok(refinementCss.includes(hierarchyContract), `Missing curated home hierarchy contract: ${hierarchyContract}`);
}

assert.ok(accountCss.includes('.home-utility-bar'));
assert.ok(accountCss.includes('.home-account-slot .hao-account-trigger'));
assert.ok(accountCss.includes("html:not([data-ui-state='home']) .home-utility-bar"));
assert.ok(!pwaSource.includes('hud-compact.css'));
assert.ok(!pwaSource.includes('flappyk-membership-client'));

// Weather owns weather only.
assert.ok(!weatherCss.includes('.home-console-bezel'), 'Weather stylesheet must not own home layout.');
assert.ok(!weatherCss.includes('.home-primary-actions'), 'Weather stylesheet must remain presentation-isolated.');
assert.ok(weatherCss.includes('.market-weather-layer'));
assert.ok(weatherCss.includes("[data-weather='rain']"));
assert.ok(weatherCss.includes('@media (prefers-reduced-motion: reduce)'));

assert.ok(serviceWorker.includes("const APP_CACHE = 'flappyk-app'"));
assert.ok(serviceWorker.includes("const RUNTIME_CACHE = 'flappyk-runtime'"));
assert.ok(serviceWorker.includes('isCriticalSameOriginAsset'));
assert.ok(serviceWorker.includes('? networkFirst(request)'));
assert.ok(!/flappyk-(?:app|runtime)-v\d+/.test(serviceWorker));
assert.ok(!serviceWorker.includes("'./hud-compact.css'"));
assert.ok(serviceWorker.includes("'./account-integration.css'"));
assert.ok(serviceWorker.includes("'./scripts/account-cloud-sync.js'"));
assert.ok(serviceWorker.includes("'./membership-config.js'"));
assert.ok(serviceWorker.includes("'./premium-ui.css'"));
assert.ok(!serviceWorker.includes("'./home-story.css'"));
assert.ok(serviceWorker.includes("'./scripts/home-story.js'"));
assert.ok(serviceWorker.includes("'./indicator-cards.css'"));
assert.ok(serviceWorker.includes("'./scripts/indicator-cards.js'"));
assert.ok(!serviceWorker.includes("'./scripts/cloud-run-sync-core.js'"));
assert.ok(!serviceWorker.includes("'./membership-sync.css'"));
assert.ok(serviceWorker.includes("'./market-weather.css'"));
assert.ok(serviceWorker.includes("'./scripts/market-weather.js'"));

console.log('Curated full-viewport home and gameplay, readable score-first HUD hierarchy, unified gameplay instruments, responsive controls, isolated weather, and stable PWA cache contracts passed.');
