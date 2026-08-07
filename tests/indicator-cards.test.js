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
  'const STARTER_COUNT = 3',
  'const DAILY_DRAW_LIMIT = 3',
  'accountState?.isPro === true',
  'window.HaoAccount.saveProductData',
  '[STATE_KEY]: payload',
  "window.addEventListener('hao:account-changed'",
  "emit('starter-granted'",
  "emit('drawn'",
]) {
  assert.ok(storeSource.includes(contract), `Missing account-backed card inventory contract: ${contract}`);
}
assert.ok(!storeSource.includes('localStorage'), 'Card inventory must use the account product state, not a local entitlement fallback.');

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
  "drawButton.hidden = true",
  "text('TACTICAL HAND', '战术手牌')",
  'function hasCardAccess()',
  'deck.hidden = !visible || !cardAccess',
  'visible && cardAccess && snapshot.data.length',
  'if (event.detail?.signedIn === false) clearActiveCards()',
]) {
  assert.ok(cardsSource.includes(contract), `Missing tactical indicator card contract: ${contract}`);
}
assert.ok(!cardsSource.includes('is-locked'), 'Guests must not receive a visible locked-card presentation.');
assert.ok(!cardsSource.includes('window.HaoAccount?.open?.()'), 'Hidden guest cards must not open account UI through secret keyboard shortcuts.');

for (const contract of [
  '#indicator-overlay',
  'z-index: 10',
  '.indicator-card-deck',
  '.indicator-hand-label',
  '.indicator-card.is-active',
  '.indicator-card.is-revealing',
  '@keyframes indicator-card-decode',
  "@media (max-width: 720px), (pointer: coarse)",
  'touch-action: manipulation',
  'var(--hud-shell',
]) {
  assert.ok(cardsStyles.includes(contract), `Missing tactical card visual contract: ${contract}`);
}
assert.ok(weatherStyles.includes('#game-canvas'));
assert.ok(weatherStyles.includes('z-index: 8'));
assert.ok(!cardsStyles.includes('.indicator-card.is-locked'), 'Retired guest-card styling must be deleted, not retained as a compatibility state.');

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

assert.ok(serviceWorkerSource.includes("const APP_CACHE = 'flappyk-app-v25'"));
assert.ok(serviceWorkerSource.includes("const RUNTIME_CACHE = 'flappyk-runtime-v25'"));
for (const asset of [
  "'./indicator-cards.css'",
  "'./scripts/indicator-core.js'",
  "'./scripts/indicator-history.js'",
  "'./scripts/indicator-card-store.js'",
  "'./scripts/indicator-cards.js'",
]) {
  assert.ok(serviceWorkerSource.includes(asset), `PWA v25 is missing ${asset}`);
}

console.log('BOLL, MACD, 285-row data readiness, guest gating, visible overlay stacking, tactical scan reveal, preserved P/L lane, account inventory, mobile controls, and PWA v25 contracts validated');
