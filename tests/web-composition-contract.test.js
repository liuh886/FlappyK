const assert = require('node:assert/strict');
const fs = require('node:fs');

const hardeningJs = fs.readFileSync('core-hardening.js', 'utf8');
const refinementJs = fs.readFileSync('scripts/premium-ui-refinement.js', 'utf8');
const refinementCss = fs.readFileSync('premium-ui-refinement.css', 'utf8');
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

for (const homeShellContract of [
  "html[data-ui-state='home'] #game-container.arcade-weather-ready",
  "html[data-ui-state='home'] .home-console-bezel",
  "html[data-ui-state='home'] .home-console-screen",
  'width: 100vw',
  'height: 100dvh',
  'grid-template-rows: auto minmax(0, 1fr) auto',
]) {
  assert.ok(weatherCss.includes(homeShellContract), `Missing web home shell contract: ${homeShellContract}`);
}

assert.ok(serviceWorker.includes("flappyk-app-v17"));
assert.ok(serviceWorker.includes("flappyk-runtime-v17"));
assert.ok(!serviceWorker.includes("'./hud-compact.css'"));
assert.ok(serviceWorker.includes("'./account-integration.css'"));
assert.ok(serviceWorker.includes("'./scripts/account-cloud-sync.js'"));
assert.ok(serviceWorker.includes("'./membership-config.js'"));
assert.ok(!serviceWorker.includes("'./scripts/cloud-run-sync-core.js'"));
assert.ok(!serviceWorker.includes("'./membership-sync.css'"));
assert.ok(serviceWorker.includes("'./market-weather.css'"));
assert.ok(serviceWorker.includes("'./scripts/market-weather.js'"));

console.log('Full-viewport web home, unified weather-performance-progress-control rail, dedicated account toolbar, coordinated input dock, modern pixel typography, semantic counters, responsive controls, personal cloud history, and PWA v17 cache contracts passed');
