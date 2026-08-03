const assert = require('node:assert/strict');
const fs = require('node:fs');

const refinementJs = fs.readFileSync('scripts/premium-ui-refinement.js', 'utf8');
const refinementCss = fs.readFileSync('premium-ui-refinement.css', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

assert.ok(refinementJs.includes('const DESKTOP_CANVAS_WIDTH = 896'));
assert.ok(refinementJs.includes('const DESKTOP_CANVAS_HEIGHT = 672'));
assert.ok(refinementJs.includes("runPanel.id = 'run-progress-panel'"));
assert.ok(refinementJs.includes("topControls.insertBefore(speedControl, topControls.firstChild)"));
assert.ok(refinementJs.includes("gameContainer?.appendChild(controlsHint)"));
assert.ok(refinementJs.includes("stats.dataset.composition = 'returns-only'"));
assert.ok(refinementJs.includes('usesVirtualControls()'));

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

assert.ok(serviceWorker.includes("flappyk-app-v8"));
assert.ok(serviceWorker.includes("flappyk-runtime-v8"));

console.log('Modern pixel typography, 4px grid, hard shadows, enlarged frame, HUD placement, controls, and PWA cache contracts passed');