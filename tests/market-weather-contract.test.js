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
  "html[data-ui-state='home'] #game-container.arcade-weather-ready",
  "html[data-ui-state='home'] .home-console-bezel",
  "html[data-ui-state='home'] .home-console-screen",
  '@media (prefers-reduced-motion: reduce)',
]) {
  assert.ok(weatherStyles.includes(stateSelector), `Missing weather visual contract: ${stateSelector}`);
}

for (const homeShellContract of [
  'width: 100vw',
  'height: 100dvh',
  'grid-template-rows: auto minmax(0, 1fr) auto',
  'clip-path: none',
  'justify-content: center',
  'The web home owns the viewport; the arcade cabinet belongs to gameplay.',
]) {
  assert.ok(weatherStyles.includes(homeShellContract), `Missing full-viewport home contract: ${homeShellContract}`);
}

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
assert.ok(serviceWorker.includes("flappyk-app-v16"), 'The PWA cache version must advance for the account-cloud release.');
assert.ok(serviceWorker.includes("'./scripts/account-cloud-sync.js'"), 'Offline shell must cache the account cloud bridge.');

console.log('Pixel weather arcade, staged transition, explicit ownership, stale-event cleanup, full-viewport home shell, account-cloud cache, and interaction detail contracts passed.');
