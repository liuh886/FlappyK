const assert = require('node:assert/strict');
const fs = require('node:fs');

const hardeningJs = fs.readFileSync('core-hardening.js', 'utf8');
const refinementJs = fs.readFileSync('scripts/premium-ui-refinement.js', 'utf8');
const refinementCss = fs.readFileSync('premium-ui-refinement.css', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

assert.ok(hardeningJs.includes('levelDisp.textContent = String(visibleGame)'));
assert.ok(!hardeningJs.includes('levelDisp.textContent = `${visibleGame}/3`'));

assert.ok(refinementJs.includes('const DESKTOP_CANVAS_WIDTH = 896'));
assert.ok(refinementJs.includes('const DESKTOP_CANVAS_HEIGHT = 672'));
assert.ok(refinementJs.includes("runPanel.id = 'run-progress-panel'"));
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
assert.ok(refinementCss.includes("font-size: 17px"));
assert.ok(refinementCss.includes("font-size: 15px"));
assert.ok(refinementCss.includes('backdrop-filter: none'));
assert.ok(refinementCss.includes("html[data-virtual-controls='true'] #game-top-controls .desktop-speed-control"));

assert.ok(serviceWorker.includes("flappyk-app-v9"));
assert.ok(serviceWorker.includes("flappyk-runtime-v9"));
assert.ok(serviceWorker.includes("'./scripts/cloud-run-sync-core.js'"));
assert.ok(serviceWorker.includes("'./membership-sync.css'"));

console.log('Modern pixel typography, semantic run counter, normalized HUD labels, hard utility chrome, enlarged frame, controls, reliable cloud sync, and PWA cache contracts passed');
