const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const weatherScript = read('scripts/market-weather.js');
const weatherStyles = read('market-weather.css');
const baseStyles = read('style.css');
const pwa = read('pwa.js');
const serviceWorker = read('sw.js');

assert.match(weatherScript, /metrics\.playerReturn < -EPSILON/);
assert.match(weatherScript, /metrics\.excess < -EPSILON/);
assert.match(weatherScript, /return 'rain'/);
assert.match(weatherScript, /return 'cloudy'/);
assert.match(weatherScript, /return 'clear'/);

for (const boundaryMessage of [
  'RETURN BELOW ZERO',
  'BACK IN GREEN',
  'MARKET MOVES AHEAD',
  'AHEAD OF MARKET',
]) {
  assert.ok(weatherScript.includes(boundaryMessage), `Missing weather boundary feedback: ${boundaryMessage}`);
}

for (const stateSelector of [
  "[data-weather='cloudy']",
  "[data-weather='rain']",
  '.home-console-bezel',
  '.home-console-screen',
  '@media (prefers-reduced-motion: reduce)',
]) {
  assert.ok(weatherStyles.includes(stateSelector), `Missing weather visual contract: ${stateSelector}`);
}

for (const detailContract of [
  'installPrimaryActionIcon',
  'installPixelTradeGlyphs',
  "glyph.textContent = symbol",
  "'▲'",
  "'▼'",
  "event.key !== 'Enter' && event.key !== ' '",
  "status.style.transform = 'translateX(-50%) translateY(4px)'",
]) {
  assert.ok(weatherScript.includes(detailContract), `Missing arcade detail contract: ${detailContract}`);
}

assert.ok(baseStyles.includes('#start-btn.has-dom-play-icon::before'));
assert.ok(baseStyles.includes('.home-play-icon'));
assert.ok(baseStyles.includes('.pixel-trade-glyph'));
assert.ok(baseStyles.includes('.sell-btn .trade-emoji'));
assert.ok(baseStyles.includes(':where(button, select, summary, a[href]):focus-visible'));
assert.ok(!baseStyles.includes('"Apple Color Emoji"'), 'Native color emoji must not own trade-button styling.');

assert.ok(pwa.includes("'./market-weather.css'"), 'PWA loader must attach market-weather.css.');
assert.ok(pwa.includes("'./scripts/market-weather.js'"), 'PWA loader must attach market-weather.js.');
assert.ok(serviceWorker.includes("'./market-weather.css'"), 'Offline shell must cache market-weather.css.');
assert.ok(serviceWorker.includes("'./scripts/market-weather.js'"), 'Offline shell must cache market-weather.js.');
assert.ok(serviceWorker.includes("flappyk-app-v13"), 'The PWA cache version must advance for the detail polish release.');

console.log('Pixel weather arcade and detail polish contracts passed.');