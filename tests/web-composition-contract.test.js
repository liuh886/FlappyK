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

assert.ok(refinementCss.includes("family=Pixelify+Sans"));
assert.ok(refinementCss.includes("--pixel-font-display: 'Press Start 2P'"));
assert.ok(refinementCss.includes("--pixel-font-ui: 'Pixelify Sans'"));
assert.ok(refinementCss.includes('--pixel-grid: 4px'));
assert.ok(refinementCss.includes('--pixel-shadow-step: 4px 4px'));
assert.ok(refinementCss.includes('--pixel-cut: polygon'));
assert.ok(refinementCss.includes('--space-1: 4px'));
assert.ok(refinementCss.includes('--space-6: 24px'));
assert.ok(refinementCss.includes(".stats-box[data-composition='returns-only']"));
assert.ok(refinementCss.includes('.run-progress-panel'));
assert.ok(refinementCss.includes('width: min(896px'));
assert.ok(refinementCss.includes('.trade-key-hints'));
assert.ok(refinementCss.includes('#game-hud-rail #game-top-controls .desktop-speed-control'));
assert.ok(refinementCss.includes('backdrop-filter: none'));
assert.ok(refinementCss.includes("html[data-virtual-controls='true'] #game-top-controls .desktop-speed-control"));
assert.ok(refinementCss.includes("grid-template-areas:"));
assert.ok(refinementCss.includes("'performance controls'"));
assert.ok(refinementCss.includes("'weather progress'"));
assert.ok(refinementCss.includes("#mobile-controls:not([hidden])"));
assert.ok(refinementCss.includes('transform: translateX(-50%)'));
assert.ok(refinementCss.includes('.run-progress-panel .hud-details'));
assert.ok(refinementCss.includes('.hud-metric-label'));
assert.ok(refinementCss.includes('white-space: nowrap'));
assert.ok(refinementCss.includes('box-shadow: none'));
assert.ok(refinementCss.includes('clip-path: none'));
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
  "grid-template-columns: repeat(3, minmax(0, 1fr))",
  '.run-progress-panel .hud-header',
  '#game-top-controls .speed-step:hover',
  '.trade-key-hint + .trade-key-hint',
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
  'min-height: 58px',
  'min-height: 42px',
  'border: 1px solid rgba(216, 207, 255, 0.55)',
]) {
  assert.ok(refinementCss.includes(hierarchyContract), `Missing curated home hierarchy contract: ${hierarchyContract}`);
}

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

console.log('Curated full-viewport home, static UI ownership, unified HUD instrument language, tactical indicator deck, account toolbar, coordinated input dock, responsive controls, and PWA v23 cache contracts passed');