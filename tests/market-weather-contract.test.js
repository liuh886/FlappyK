const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const index = read('index.html');
const baseStyles = read('style.css');
const weatherStyles = read('market-weather.css');
const weatherScript = read('scripts/market-weather.js');
const pwa = read('pwa.js');
const serviceWorker = read('sw.js');
const game = read('game.js');
const experience = read('experience.js');
const uiState = read('scripts/ui-state.js');

for (const requiredAsset of [
  '<link rel="stylesheet" href="market-weather.css">',
  '<script src="scripts/market-weather.js"></script>',
]) {
  assert.ok(pwa.includes(requiredAsset), `Missing generated weather asset in PWA loader: ${requiredAsset}`);
}

for (const requiredMarkup of [
  'id="home-weather-stage"',
  'id="home-weather-sky"',
  'id="home-weather-clouds"',
  'id="home-weather-rain"',
  'id="home-weather-haze"',
  'id="home-weather-lightning"',
  'id="home-weather-label"',
  'id="home-weather-detail"',
  'id="home-weather-player"',
  'id="home-weather-market"',
  'id="home-weather-excess"',
  'id="home-weather-explanation"',
]) {
  assert.ok(index.includes(requiredMarkup), `Missing weather HUD markup: ${requiredMarkup}`);
}

for (const visualContract of [
  '.home-weather-stage',
  '.home-weather-sky',
  '.home-weather-clouds',
  '.home-weather-rain',
  '.home-weather-haze',
  '.home-weather-lightning',
  '.home-weather-stage[data-weather="clear"]',
  '.home-weather-stage[data-weather="cloudy"]',
  '.home-weather-stage[data-weather="rain"]',
  '.home-weather-stage[data-weather="storm"]',
  '.home-weather-stage.is-transitioning',
]) {
  assert.ok(weatherStyles.includes(visualContract), `Missing weather visual contract: ${visualContract}`);
}

for (const stateContract of [
  'function deriveWeatherState',
  'clear',
  'cloudy',
  'rain',
  'storm',
  'transitionWeather',
  'weatherRevision',
  'window.setTimeout',
  'transitionDurationMs',
  'document.documentElement.dataset.marketWeather',
]) {
  assert.ok(weatherScript.includes(stateContract), `Missing weather state-machine contract: ${stateContract}`);
}

for (const integrationContract of [
  'window.FlappyKMarketWeather',
  'updateWeatherHud',
  'transitionWeather',
  'playerReturn',
  'marketReturn',
  'excessReturn',
]) {
  assert.ok(game.includes(integrationContract) || experience.includes(integrationContract), `Missing gameplay weather integration: ${integrationContract}`);
}

for (const staleCleanupContract of [
  'weatherRevision += 1',
  'window.clearTimeout(weatherTransitionTimer)',
  'window.clearTimeout(weatherSettleTimer)',
]) {
  assert.ok(weatherScript.includes(staleCleanupContract), `Missing stale weather cleanup: ${staleCleanupContract}`);
}

for (const homeContract of [
  'home-surface-active',
  'fullscreen-home-active',
  'syncHomeViewportState',
]) {
  assert.ok(uiState.includes(homeContract) || baseStyles.includes(homeContract), `Missing full-viewport home contract: ${homeContract}`);
}

for (const detailContract of [
  "'▲'",
  "'▼'",
  "event.key !== 'Enter' && event.key !== ' '",
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
assert.ok(serviceWorker.includes("flappyk-app-v16"), 'The PWA cache version must include the account-cloud release.');
assert.ok(serviceWorker.includes("'./scripts/account-cloud-sync.js'"), 'Offline shell must cache the account cloud bridge.');

console.log('Pixel weather arcade, staged transition, explicit ownership, stale-event cleanup, full-viewport home shell, account-cloud cache, and interaction detail contracts passed.');
