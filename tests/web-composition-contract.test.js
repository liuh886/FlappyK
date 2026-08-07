const assert = require('node:assert/strict');
const fs = require('node:fs');

const hardeningJs = fs.readFileSync('core-hardening.js', 'utf8');
const refinementJs = fs.readFileSync('scripts/premium-ui-refinement.js', 'utf8');
const refinementCss = fs.readFileSync('premium-ui-refinement.css', 'utf8');
const baseStyles = fs.readFileSync('style.css', 'utf8');
const weatherCss = fs.readFileSync('market-weather.css', 'utf8');
const accountCss = fs.readFileSync('account-integration.css', 'utf8');
const pwaSource = fs.readFileSync('pwa.js', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

assert.ok(hardeningJs.includes('levelDisp.textContent = String(visibleGame)'));
assert.ok(!hardeningJs.includes('levelDisp.textContent = `${visibleGame}/3`'));

// JavaScript owns composition/state only; presentation must stay static and reviewable.
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
assert.ok(!refinementJs.includes('PIXEL_COMPATIBILITY_STYLE_ID'));
assert.ok(!refinementJs.includes('style.textContent = `'));
assert.ok(!refinementJs.includes('installPixelCompatibilityStyles'));

// Curated presentation layer owns typography, home, structural composition, and secondary screens.
for (const contract of [
  "family=Pixelify+Sans",
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
  'width: min(896px',
  "html[data-virtual-controls='true'] #game-top-controls .desktop-speed-control",
  "html[data-ui-state='home'] .controls-hint",
]) {
  assert.ok(refinementCss.includes(contract), `Missing curated presentation contract: ${contract}`);
}

// The established gameplay instrument system remains the sole owner of HUD/control visual details.
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
  "grid-template-columns: repeat(3, minmax(0, 1fr))",
  '.run-progress-panel .hud-header',
  '#game-top-controls .speed-step:hover',
  '.trade-key-hint + .trade-key-hint',
  "#mobile-controls:not([hidden])",
  '#mobile-controls .mobile-btn',
]) {
  assert.ok(baseStyles.includes(hudLanguageContract), `Missing unified HUD language contract: ${hudLanguageContract}`);
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

assert.ok(serviceWorker.includes("flappyk-app-v23"));
assert.ok(serviceWorker.includes("flappyk-runtime-v23"));
assert.ok(!serviceWorker.includes("'./hud-compact.css'"));
assert.ok(serviceWorker.includes("'./account-integration.css'"));
assert.ok(serviceWorker.includes("'./scripts/account-cloud-sync.js'"));
assert.ok(serviceWorker.includes("'./membership-config.js'"));
assert.ok(serviceWorker.includes("'./home-story.css'"));
assert.ok(serviceWorker.includes("'./scripts/home-story.js'"));
assert.ok(serviceWorker.includes("'./indicator-cards.css'"));
assert.ok(serviceWorker.includes("'./scripts/indicator-cards.js'"));
assert.ok(!serviceWorker.includes("'./scripts/cloud-run-sync-core.js'"));
assert.ok(!serviceWorker.includes("'./membership-sync.css'"));
assert.ok(serviceWorker.includes("'./market-weather.css'"));
assert.ok(serviceWorker.includes("'./scripts/market-weather.js'"));

console.log('Curated full-viewport home, static presentation ownership, unified gameplay instrument system, responsive controls, isolated weather, and PWA v23 contracts passed.');