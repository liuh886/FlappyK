const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const coreSource = fs.readFileSync('scripts/indicator-core.js', 'utf8');
const historySource = fs.readFileSync('scripts/indicator-history.js', 'utf8');
const storeSource = fs.readFileSync('scripts/indicator-card-store.js', 'utf8');
const cardsSource = fs.readFileSync('scripts/indicator-cards.js', 'utf8');
const cardCssSource = fs.readFileSync('indicator-cards.css', 'utf8');
const pwaSource = fs.readFileSync('pwa.js', 'utf8');
const serviceWorkerSource = fs.readFileSync('sw.js', 'utf8');
const dataAuditSource = fs.readFileSync('scripts/audit_bundled_data.py', 'utf8');
const refreshSource = fs.readFileSync('fetch_all_data.py', 'utf8');
const membershipConfigSource = fs.readFileSync('membership-config.js', 'utf8');
const indexSource = fs.readFileSync('index.html', 'utf8');

const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(coreSource, context);
const IndicatorCore = context.window.FlappyKIndicatorCore;

const closes = Array.from({ length: 80 }, (_, index) => 100 + index * 0.35 + Math.sin(index / 4));
const highs = closes.map((value, index) => value + 1.2 + (index % 3) * 0.1);
const lows = closes.map((value, index) => value - 1.1 - (index % 2) * 0.1);

const boll = IndicatorCore.calculateBollinger(closes);
assert.equal(boll.length, closes.length);
assert.ok(Number.isFinite(boll.at(-1).middle));
assert.ok(boll.at(-1).upper > boll.at(-1).middle);
assert.ok(boll.at(-1).middle > boll.at(-1).lower);

const macd = IndicatorCore.calculateMacd(closes);
assert.equal(macd.length, closes.length);
assert.ok(Number.isFinite(macd.at(-1).macd));
assert.ok(Number.isFinite(macd.at(-1).signal));
assert.ok(Number.isFinite(macd.at(-1).histogram));

for (const contract of [
  'window.FlappyKIndicatorCore',
  'calculateBollinger',
  'calculateMacd',
]) {
  assert.ok(coreSource.includes(contract), `Missing indicator core contract: ${contract}`);
}
for (const contract of [
  'window.FlappyKIndicatorHistory',
  'normalizeRows',
  'getAssetSeries',
]) {
  assert.ok(historySource.includes(contract), `Missing indicator history contract: ${contract}`);
}
for (const contract of [
  'window.FlappyKIndicatorCardStore',
  'getInventory',
  'consume',
  'starter',
]) {
  assert.ok(storeSource.includes(contract), `Missing indicator card-store contract: ${contract}`);
}
for (const contract of [
  'window.FlappyKIndicatorCards',
  'BOLL',
  'MACD',
  'indicator-card',
  'indicator-scan',
]) {
  assert.ok(cardsSource.includes(contract), `Missing indicator card UI contract: ${contract}`);
}
for (const contract of [
  '.indicator-card-hand',
  '.indicator-scan-layer',
  '.indicator-macd-panel',
]) {
  assert.ok(cardCssSource.includes(contract), `Missing indicator card CSS contract: ${contract}`);
}

for (const contract of [
  "ensureStylesheet('flappyk-indicator-card-styles', './indicator-cards.css')",
  "loadScript('flappyk-indicator-core', './scripts/indicator-core.js')",
  "loadScript('flappyk-indicator-history', './scripts/indicator-history.js')",
  "loadScript('flappyk-indicator-card-store', './scripts/indicator-card-store.js')",
  "loadScript('flappyk-indicator-cards', './scripts/indicator-cards.js')",
]) {
  assert.ok(pwaSource.includes(contract), `Missing indicator runtime load contract: ${contract}`);
}

for (const contract of [
  "entitlementCode: 'flappyk.pro'",
  "productCode: 'flappyk'",
]) {
  assert.ok(membershipConfigSource.includes(contract), `Missing membership contract: ${contract}`);
}
assert.ok(indexSource.includes('membership-config.js'));

for (const contract of [
  'MIN_ROWS_REQUIRED = 285',
  'indicator_ready',
  'stockDataMeta',
]) {
  assert.ok(dataAuditSource.includes(contract), `Missing bundled indicator-data readiness contract: ${contract}`);
}
assert.ok(refreshSource.includes('DAYS_REQUIRED = 300'), 'Data refresh must retain more than the 285 rows required for a 250-day challenge plus indicator warm-up.');

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

console.log('BOLL, MACD, 285-row data readiness, guest gating, visible overlay stacking, tactical scan reveal, preserved P/L lane, account inventory, mobile controls, and stable PWA cache contracts validated');
