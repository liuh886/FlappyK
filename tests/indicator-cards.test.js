const assert = require('node:assert/strict');
const fs = require('node:fs');

const previousWindow = global.window;
global.window = {};
const core = require('../scripts/indicator-core.js');
global.window = previousWindow;

const flat = Array.from({ length: 40 }, (_, index) => ({ date: `D${index}`, close: 10 }));
const flatBands = core.bollingerBands(flat);
assert.equal(flatBands[18], null);
assert.deepEqual(flatBands[19], { middle: 10, upper: 10, lower: 10 });

const rising = Array.from({ length: 60 }, (_, index) => ({ close: index + 1 }));
const risingBands = core.bollingerBands(rising);
assert.equal(risingBands.length, rising.length);
assert.ok(Math.abs(risingBands[19].middle - 10.5) < 1e-10);
assert.ok(risingBands[19].upper > risingBands[19].middle);
assert.ok(risingBands[19].lower < risingBands[19].middle);

const risingMacd = core.macd(rising);
assert.equal(risingMacd.length, rising.length);
assert.equal(risingMacd[24], null);
assert.ok(Number.isFinite(risingMacd[25].line));
assert.equal(risingMacd[32].signal, null);
assert.ok(Number.isFinite(risingMacd[33].signal));
assert.ok(Number.isFinite(risingMacd[33].histogram));

const historySource = fs.readFileSync('scripts/indicator-history.js', 'utf8');
const storeSource = fs.readFileSync('scripts/indicator-card-store.js', 'utf8');
const cardsSource = fs.readFileSync('scripts/indicator-cards.js', 'utf8');
const cardsStyles = fs.readFileSync('indicator-cards.css', 'utf8');
const dailyRunSource = fs.readFileSync('daily-run.js', 'utf8');
const auditSource = fs.readFileSync('scripts/audit_bundled_data.py', 'utf8');
const refreshSource = fs.readFileSync('fetch_all_data.py', 'utf8');
const weatherStyles = fs.readFileSync('market-weather.css', 'utf8');
const pwaSource = fs.readFileSync('pwa.js', 'utf8');
const serviceWorkerSource = fs.readFileSync('sw.js', 'utf8');

for (const contract of [
  'const WARMUP_DAYS = 35',
  'stockData?.[market]?.[asset]',
  'fullSeries.findIndex',
  'startIndex - WARMUP_DAYS',
]) {
  assert.ok(historySource.includes(contract), `Missing non-forward-looking indicator history contract: ${contract}`);
}

for (const contract of [
  "const STATE_KEY = 'indicator_cards'",
  'const VERSION = 2',
  'const DAILY_PRO_GRANT = 3',
  'const DAILY_TRIAL_GRANT = 1',
  'accountState?.isPro === true',
  'dailyGrantDate',
  'function hasCardAccess()',
  "window.addEventListener('flappyk:daily-run-started'",
  "window.addEventListener('flappyk:daily-run-ended'",
  'window.HaoAccount.saveProductData',
  '[STATE_KEY]: payload',
  "window.addEventListener('hao:account-changed'",
  "emit('pro-daily-granted'",
  "emit('daily-trial-started'",
]) {
  assert.ok(storeSource.includes(contract), `Missing Pro/Daily Run power-up inventory contract: ${contract}`);
}
for (const retired of ['STARTER_COUNT', 'DAILY_DRAW_LIMIT', 'starterGranted', 'drawsUsed', 'drawDate']) {
  assert.ok(!storeSource.includes(retired), `Retired power-up economy still exists: ${retired}`);
}
assert.ok(!storeSource.includes('localStorage'), 'Power-up inventory must use account product state, not a browser-local entitlement fallback.');
for (const contract of [
  "new CustomEvent('flappyk:daily-run-started'",
  "new CustomEvent('flappyk:daily-run-ended'",
]) {
  assert.ok(dailyRunSource.includes(contract), `Daily Run must expose power-up trial lifecycle: ${contract}`);
}

for (const contract of [
  "event.key === '1'",
  "activate('boll')",
  "event.key === '2'",
  "activate('macd')",
  "core.bollingerBands(data, 20, 2)",
  "core.macd(data, 12, 26, 9)",
  "overlay.id = 'indicator-overlay'",
  "deck.id = 'indicator-card-deck'",
  "if (active[type])",
  "if (!store.consume(type))",
  'const REVEAL_MS = 440',
  'function revealProgress',
  'function drawScanEdge',
  'function drawProfitLane',
  "context.fillText('P/L'",
  "text('POWER-UP HAND', '战术道具')",
  "text('DAILY TRIAL · 1 EACH', '每日挑战体验 · 各 1 张')",
  "text('VOLATILITY SCAN', '波动扫描')",
  "text('MOMENTUM SCAN', '动量扫描')",
  'BOLL power-up deployed',
  'MACD power-up deployed',
  'function hasCardAccess()',
  'deck.hidden = !visible || !cardAccess',
  'visible && cardAccess && snapshot.data.length',
  'if (event.detail?.isPro !== true && event.detail?.isDailyTrial !== true) clearActiveCards()',
]) {
  assert.ok(cardsSource.includes(contract), `Missing tactical power-up contract: ${contract}`);
}
assert.ok(!cardsSource.includes('is-locked'), 'Unavailable cards must stay hidden rather than render a locked compatibility state.');
assert.ok(!cardsSource.includes('window.HaoAccount?.open?.()'), 'Hidden cards must not open account UI through secret keyboard shortcuts.');
assert.ok(!cardsSource.includes('indicator-card-draw'), 'Retired random-draw controls must be deleted rather than hidden or shimmed.');
assert.ok(!cardsSource.includes('function drawCard'), 'Retired random-draw runtime must stay deleted.');

for (const contract of [
  '#indicator-overlay',
  'z-index: 10',
  '.indicator-card-deck',
  '.indicator-hand-label',
  '.indicator-hand-label::before',
  '--card-glow:',
  '.indicator-card-count',
  '.indicator-card.is-active',
  '.indicator-card.is-empty',
  '.indicator-card.is-revealing',
  '@keyframes indicator-card-decode',
  '@keyframes indicator-power-active',
  "@media (max-width: 720px), (pointer: coarse)",
  'touch-action: manipulation',
  'min-height: 44px',
  'var(--hud-shell',
  'var(--pixel-yellow',
]) {
  assert.ok(cardsStyles.includes(contract), `Missing tactical power-up visual contract: ${contract}`);
}
assert.ok(weatherStyles.includes('#game-canvas'));
assert.ok(weatherStyles.includes('z-index: 8'));
assert.ok(!cardsStyles.includes('.indicator-card.is-locked'), 'Retired guest-card styling must stay deleted.');
assert.ok(!cardsStyles.includes('width: min(248px, calc(100% - 28px))'), 'The oversized mobile tactical tray must not return.');

for (const contract of [
  'CHALLENGE_DAYS = 250',
  'INDICATOR_WARMUP_DAYS = 35',
  'MIN_INDICATOR_ROWS = CHALLENGE_DAYS + INDICATOR_WARMUP_DAYS',
  'audit_indicator_history(data)',
]) {
  assert.ok(auditSource.includes(contract), `Missing bundled indicator-data readiness contract: ${contract}`);
}
assert.ok(refreshSource.includes('DAYS_REQUIRED = 300'), 'Data refresh must retain more than the 285 rows required for a 250-day challenge plus indicator warm-up.');

for (const contract of [
  "ensureStylesheet('flappyk-indicator-card-styles', './indicator-cards.css')",
  "loadScript('flappyk-indicator-core', './scripts/indicator-core.js')",
  "loadScript('flappyk-indicator-history', './scripts/indicator-history.js')",
  "loadScript('flappyk-indicator-card-store', './scripts/indicator-card-store.js')",
  "loadScript('flappyk-indicator-cards', './scripts/indicator-cards.js')",
]) {
  assert.ok(pwaSource.includes(contract), `Missing indicator runtime load contract: ${contract}`);
}

assert.ok(serviceWorkerSource.includes("const APP_CACHE = 'flappyk-app'"));
assert.ok(serviceWorkerSource.includes("const RUNTIME_CACHE = 'flappyk-runtime'"));
assert.ok(serviceWorkerSource.includes('isCriticalSameOriginAsset'));
assert.ok(serviceWorkerSource.includes('? networkFirst(request)'));
assert.ok(!/flappyk-(?:app|runtime)-v\d+/.test(serviceWorkerSource));
for (const asset of [
  "'./indicator-cards.css'",
  "'./scripts/indicator-core.js'",
  "'./scripts/indicator-history.js'",
  "'./scripts/indicator-card-store.js'",
  "'./scripts/indicator-cards.js'",
]) {
  assert.ok(serviceWorkerSource.includes(asset), `Stable PWA shell is missing ${asset}`);
}

console.log('BOLL/MACD math, Pro daily grants, Daily Run trials, scarce power-up visuals, overlay stacking, mobile controls, retired draw deletion, and stable PWA contracts validated');
