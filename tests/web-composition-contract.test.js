const assert = require('node:assert/strict');
const fs = require('node:fs');

const hardeningJs = fs.readFileSync('core-hardening.js', 'utf8');
const gameJs = fs.readFileSync('game.js', 'utf8');
const refinementJs = fs.readFileSync('scripts/premium-ui-refinement.js', 'utf8');
const canonicalCss = fs.readFileSync('premium-ui.css', 'utf8');
const mobileCss = fs.readFileSync('mobile-controls.css', 'utf8');
const baseStyles = fs.readFileSync('style.css', 'utf8');
const accountCss = fs.readFileSync('account-integration.css', 'utf8');
const pwaSource = fs.readFileSync('pwa.js', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

// The authoritative level display stays semantic: the controller writes the bare
// number and no layer may re-wrap it with a `/3` suffix.
assert.ok(gameJs.includes('levelDisp.innerText = level;'));
assert.ok(!gameJs.includes('`${level}/3`'));
// Settlement title normalization now lives in the hardening subscriber.
assert.ok(hardeningJs.includes("title.textContent = 'PROFIT CARD'"));

assert.ok(!refinementJs.includes('canvasElement.width ='));
assert.ok(!refinementJs.includes('canvasElement.height ='));
assert.ok(!refinementJs.includes('syncCanvasLayout'));
assert.ok(gameJs.includes('window.devicePixelRatio'));
assert.ok(gameJs.includes('ctx.setTransform(dpr, 0, 0, dpr, 0, 0)'));
assert.ok(refinementJs.includes("const HUD_RAIL_ID = 'game-hud-rail'"));
assert.ok(refinementJs.includes('function ensureHudRail()'));
assert.ok(refinementJs.includes("runPanel.id = 'run-progress-panel'"));
assert.ok(refinementJs.includes('usesVirtualControls()'));
assert.ok(!refinementJs.includes('style.textContent = `'));

for (const contract of [
  'FLAPPY K / SINGLE-SURFACE MARKET OS',
  "--pixel-font-display: 'Press Start 2P'",
  "--pixel-font-ui: 'Pixelify Sans'",
  '--game-accent:',
  '--game-system:',
  '--space-1: 4px',
  '--space-6: 24px',
  "#ui-layer[data-hud-composition='rail']",
  '#ui-layer[hidden]',
  '#game-hud-rail',
  '.hud-metric-label',
  "'performance controls'",
  "'progress progress'",
  'grid-area: performance',
  'grid-area: controls',
  'grid-area: progress',
  "html[data-ui-state='home'] #game-container",
  '#start-screen.arcade-home',
  '.home-console-bezel',
  '.home-console-screen',
  '.home-console-footer',
  '.home-primary-actions #start-btn',
  '.local-records-summary',
  '.daily-mode-card',
  '.home-secondary-actions button',
  '.settlement-summary',
  '.legend-terminal-head',
  "html[data-flappyk-language='zh']",
]) {
  assert.ok(canonicalCss.includes(contract), `Missing canonical presentation contract: ${contract}`);
}

for (const mobileContract of [
  '#mobile-controls:not([hidden])',
  'Touch geometry only. Shared color, typography and button skin live in premium-ui.css.',
  'Runtime state decides whether this dock exists; viewport width does not.',
  'position: fixed;',
  'display: grid;',
  'width: 100vw;',
  'grid-template-columns: minmax(36px, 1fr) 78px 108px 78px minmax(36px, 1fr);',
  'grid-column: 3;',
  'grid-template-columns: 44px 44px 44px;',
]) {
  assert.ok(mobileCss.includes(mobileContract), `Missing mobile feature geometry contract: ${mobileContract}`);
}

assert.ok(!canonicalCss.includes('#mobile-controls:not([hidden]) {'), 'Shared visual theme must not position the mobile dock.');
assert.ok(!canonicalCss.includes('--pixel-cut:'), 'Decorative clipped-corner visual grammar must not return.');
assert.ok(!canonicalCss.includes('background: #e7e2d4'), 'Paper surfaces must not return.');
assert.ok(!baseStyles.includes('html body #game-container #game-hud-rail'), 'Legacy high-specificity HUD owner must not return.');
assert.ok(!baseStyles.includes('--hud-shell:'), 'Legacy HUD theme variables must not return to style.css.');
assert.ok(!baseStyles.includes('.profit-card'), 'Base CSS must not regain settlement styling.');
assert.ok(!mobileCss.includes('#settlement-screen.active'), 'Touch geometry must not own settlement layout.');
assert.ok(!mobileCss.includes('#game-hud-rail .weather-status'), 'Touch geometry must not own shared HUD presentation.');
assert.ok(!mobileCss.includes('top: calc(max(6px, env(safe-area-inset-top)) + 88px)'), 'Touch speed control must not float over market data.');
assert.ok(!canonicalCss.includes('width: min(896px'), 'Fixed desktop viewport width must not return.');
assert.ok(!canonicalCss.includes('aspect-ratio: 4 / 3'), 'Fixed desktop viewport aspect ratio must not return.');

assert.ok(accountCss.includes('.home-utility-bar'));
assert.ok(accountCss.includes('.home-account-slot .hao-account-trigger'));
assert.ok(accountCss.includes("html:not([data-ui-state='home']) .home-utility-bar"));

assert.ok(!pwaSource.includes('hud-compact.css'));
assert.ok(!pwaSource.includes('flappyk-membership-client'));
assert.ok(!pwaSource.includes('market-weather'));
assert.ok(serviceWorker.includes("const APP_CACHE = 'flappyk-app'"));
assert.ok(serviceWorker.includes("const RUNTIME_CACHE = 'flappyk-runtime'"));
assert.ok(serviceWorker.includes('isCriticalSameOriginAsset'));
assert.ok(serviceWorker.includes('? networkFirst(request)'));
assert.ok(serviceWorker.includes("'./account-integration.css'"));
assert.ok(serviceWorker.includes("'./scripts/account-cloud-sync.js'"));
assert.ok(serviceWorker.includes("'./premium-ui.css'"));
assert.ok(serviceWorker.includes("'./scripts/home-console.js'"));
assert.ok(!serviceWorker.includes("'./market-weather.css'"));
assert.ok(!serviceWorker.includes("'./scripts/market-weather.js'"));
assert.ok(!serviceWorker.includes("'./home-story.css'"));
assert.ok(!/flappyk-(?:app|runtime)-v\d+/.test(serviceWorker));

console.log('Single-Surface Market OS has one shared CSS owner, dock-contained runtime touch geometry, stable DOM composition, a quiet stage, account placement, responsive state, and stable PWA cache contracts.');
