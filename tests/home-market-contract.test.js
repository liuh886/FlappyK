const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('index.html', 'utf8');
const homeJs = fs.readFileSync('scripts/home-market.js', 'utf8');
const homeCss = fs.readFileSync('home-market.css', 'utf8');
const pwa = fs.readFileSync('pwa.js', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

assert.ok(index.includes('<link rel="stylesheet" href="home-market.css">'));
assert.ok(index.includes('<script src="scripts/home-market.js"></script>'));
assert.ok(index.includes('id="home-market-canvas"'));
assert.ok(index.includes('id="home-demo-buy"'));
assert.ok(index.includes('id="home-demo-sell"'));
assert.ok(index.includes('id="home-demo-coins"'));
assert.ok(index.includes('id="home-demo-shares"'));
assert.ok(index.indexOf('home-market.css') > index.indexOf('premium-ui-refinement.css'));
assert.ok(index.indexOf('scripts/home-market.js') > index.indexOf('scripts/premium-ui-refinement.js'));
assert.ok(!index.includes('home-story.css'));
assert.ok(!index.includes('scripts/home-story.js'));

for (const contract of [
  "const TRADE_NOTIONAL = 1000",
  "const TRADE_FEE = 1",
  "const TICK_MS = 1150",
  "canvas.getContext('2d'",
  'function drawFloor(',
  'Math.pow(depth, 1.72)',
  'function drawCandles(',
  "event.key === 'ArrowUp'",
  "event.key === 'ArrowDown'",
  "event.preventDefault()",
  "startScreen.classList.contains('active')",
  "window.setInterval(appendCandle, TICK_MS)",
  "new ResizeObserver(resizeCanvas)",
  'function promoteGameCashResource()',
  "row.className = 'hud-stat-row hud-cash-resource'",
  "window.FlappyKHomeMarket",
  "像看盘一样读行情，只在关键时刻出手。",
]) {
  assert.ok(homeJs.includes(contract), `Missing interactive home behavior: ${contract}`);
}

for (const contract of [
  '.home-market-canvas',
  '.home-market-wallet',
  '.resource-glyph--coin',
  '.resource-glyph--stock',
  '.home-demo-trade--buy',
  '.home-demo-trade--sell',
  '.home-market-feedback.is-visible',
  '.hud-cash-resource',
  "grid-template-columns: repeat(4, minmax(0, 1fr))",
  '@media (max-width: 780px), (pointer: coarse)',
  '@media (orientation: landscape) and (max-height: 520px)',
  '@media (prefers-reduced-motion: reduce)',
]) {
  assert.ok(homeCss.includes(contract), `Missing interactive home visual contract: ${contract}`);
}

assert.ok(pwa.includes("ensureStylesheet('flappyk-market-weather-styles', './market-weather.css')"));
assert.ok(pwa.includes("ensureStylesheet('flappyk-home-market-styles', './home-market.css')"));
assert.ok(pwa.indexOf('flappyk-home-market-styles') > pwa.indexOf('flappyk-market-weather-styles'));
assert.ok(serviceWorker.includes("flappyk-app-v21"));
assert.ok(serviceWorker.includes("flappyk-runtime-v21"));
assert.ok(serviceWorker.includes("'./home-market.css'"));
assert.ok(serviceWorker.includes("'./scripts/home-market.js'"));
assert.ok(serviceWorker.includes("'./indicator-cards.css'"));
assert.ok(serviceWorker.includes("'./scripts/indicator-cards.js'"));
assert.ok(!serviceWorker.includes('home-story'));

console.log('Interactive 2.5D market home, keyboard/touch demo trading, shared coin resource language, retained tactical cards, responsive layout, and PWA v21 contracts passed');