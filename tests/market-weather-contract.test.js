const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const weatherScript = read('scripts/market-weather.js');
const weatherStyles = read('market-weather.css');
const homeStyles = read('home-market.css');
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
  "html[data-ui-state='home'] #game-container.arcade-weather-ready",
  '@media (prefers-reduced-motion: reduce)',
]) {
  assert.ok(weatherStyles.includes(stateSelector), `Missing weather visual contract: ${stateSelector}`);
}

for (const homeOwnershipContract of [
  '.home-market-screen',
  '.home-market-canvas',
  '.home-market-wallet',
  'width: 100%',
  'height: 100%',
]) {
  assert.ok(homeStyles.includes(homeOwnershipContract), `Missing static home ownership contract: ${homeOwnershipContract}`);
}
assert.ok(weatherStyles.includes('The home scene itself belongs to home-market.css.'));
assert.ok(!weatherStyles.includes('.home-console-screen'));
assert.ok(!weatherScript.includes('function installHomeConsole()'));
assert.ok(!weatherScript.includes('replaceChildren(bezel'));

for (const transitionContract of [
  "Object.freeze(['clear', 'cloudy', 'rain'])",
  'WEATHER_DEBOUNCE_MS',
  'WEATHER_STEP_MS',
  'EXPLICIT_WEATHER_HOLD_MS',
  'function weatherPath(from, to)',
  'function runWeatherTransition(target, token)',
  "layer.dataset.weatherTransition = `${fromState}-to-${nextState}`",
  'weatherTransitionToken += 1',
  "setWeatherState('clear', { immediate: true, source: 'system' })",
  "source === 'live' && currentTime < explicitWeatherUntil",
  "source === 'manual'",
  "applyMetrics(metrics, { source: 'live' })",
  'function clearWeatherEvent(options = {})',
  'if (options.silent) clearWeatherEvent()',
  'clearWeatherEvent({ restore: false })',
  'prefersReducedMotion()',
  'syncWeatherStatusPlacement',
  'function mutationElement(mutation)',
  'function isWeatherOwnedMutation(mutation)',
  'function scheduleSyncFromMutations(mutations)',
  "element?.closest?.('#market-weather-layer, #weather-status')",
  'new MutationObserver(scheduleSyncFromMutations)',
]) {
  assert.ok(weatherScript.includes(transitionContract), `Missing staged weather contract: ${transitionContract}`);
}

for (const detailContract of [
  'installPrimaryActionIcon',
  'installPixelTradeGlyphs',
  "glyph.textContent = symbol",
  "'▲'",
  "'▼'",
  "'#home-demo-buy'",
  "'#home-demo-sell'",
  "event.key !== 'Enter' && event.key !== ' '",
]) {
  assert.ok(weatherScript.includes(detailContract), `Missing arcade detail contract: ${detailContract}`);
}

assert.ok(baseStyles.includes('#start-btn.has-dom-play-icon::before'));
assert.ok(baseStyles.includes('.home-play-icon'));
assert.ok(baseStyles.includes('.pixel-trade-glyph'));
assert.ok(baseStyles.includes('.sell-btn .trade-emoji'));
assert.ok(baseStyles.includes(':where(button, select, summary, a[href]):focus-visible'));
assert.ok(baseStyles.includes('#game-hud-rail .weather-status::before'));
assert.ok(baseStyles.includes("html[data-market-weather='rain']"));
assert.ok(baseStyles.includes('--hud-warning:'));
assert.ok(!baseStyles.includes('"Apple Color Emoji"'), 'Native color emoji must not own trade-button styling.');

assert.ok(pwa.includes("'./market-weather.css'"), 'PWA loader must attach market-weather.css.');
assert.ok(pwa.includes("'./home-market.css'"), 'PWA loader must place home-market.css after weather styles.');
assert.ok(pwa.includes("'./scripts/market-weather.js'"), 'PWA loader must attach market-weather.js.');
assert.ok(pwa.includes("'./indicator-cards.css'"), 'PWA loader must retain indicator card styles.');
assert.ok(pwa.includes("'./scripts/indicator-cards.js'"), 'PWA loader must retain indicator card behavior.');
assert.ok(serviceWorker.includes("'./market-weather.css'"), 'Offline shell must cache market-weather.css.');
assert.ok(serviceWorker.includes("'./scripts/market-weather.js'"), 'Offline shell must cache scripts/market-weather.js.');
assert.ok(serviceWorker.includes("flappyk-app-v22"), 'The PWA cache version must advance for the integrated home release.');
assert.ok(serviceWorker.includes("'./home-market.css'"), 'Offline shell must cache the interactive home styles.');
assert.ok(serviceWorker.includes("'./scripts/home-market.js'"), 'Offline shell must cache the interactive home behavior.');
assert.ok(serviceWorker.includes("'./indicator-cards.css'"), 'Offline shell must retain tactical card styles.');
assert.ok(serviceWorker.includes("'./scripts/indicator-cards.js'"), 'Offline shell must retain tactical card behavior.');
assert.ok(serviceWorker.includes("'./account-integration.css'"), 'Offline shell must cache the account toolbar styles.');
assert.ok(serviceWorker.includes("'./scripts/account-cloud-sync.js'"), 'Offline shell must cache the account cloud bridge.');
assert.ok(!serviceWorker.includes('home-story'));

console.log('Staged market weather, static interactive home ownership, tactical cards, shared arcade feedback, account toolbar, cloud history, and v22 offline contracts passed.');