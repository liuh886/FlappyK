const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const weatherScript = read('scripts/market-weather.js');
const weatherStyles = read('market-weather.css');
const uiStyles = read('premium-ui.css');
const baseStyles = read('style.css');
const pwa = read('pwa.js');
const serviceWorker = read('sw.js');

assert.match(weatherScript, /metrics\.playerReturn < -EPSILON/);
assert.match(weatherScript, /metrics\.excess < -EPSILON/);
assert.match(weatherScript, /return 'rain'/);
assert.match(weatherScript, /return 'cloudy'/);
assert.match(weatherScript, /return 'clear'/);
assert.match(
  weatherScript,
  /function applyMetrics\(metrics, options = \{\}\) \{\s+if \(options\.source === 'live' && clockNow\(\) < explicitWeatherUntil\) \{\s+return requestedWeather;/s,
  'Live observers must not overwrite an explicit/manual weather event during its hold window.',
);

for (const boundaryMessage of [
  'RETURN BELOW ZERO',
  'BACK IN GREEN',
  'MARKET MOVES AHEAD',
  'AHEAD OF MARKET',
]) {
  assert.ok(weatherScript.includes(boundaryMessage), `Missing weather boundary feedback: ${boundaryMessage}`);
}

for (const stateSelector of [
  '.market-weather-layer',
  "[data-weather='cloudy']",
  "[data-weather='rain']",
  '.weather-status',
  '@media (prefers-reduced-motion: reduce)',
]) {
  assert.ok(weatherStyles.includes(stateSelector), `Missing weather visual contract: ${stateSelector}`);
}

assert.ok(!weatherStyles.includes('.home-console-bezel'), 'Weather styles must not own the home shell.');
assert.ok(!weatherStyles.includes('.home-console-screen'), 'Weather styles must not own the home screen composition.');
assert.ok(!weatherStyles.includes('.home-primary-actions'), 'Weather styles must not own home action hierarchy.');

for (const homeShellContract of [
  "html[data-ui-state='home'] #game-container.arcade-weather-ready",
  '#start-screen.arcade-home',
  '.home-console-bezel',
  '.home-console-screen',
  'width: 100vw',
  'height: 100dvh',
  'grid-template-rows: auto minmax(0, 1fr) auto',
]) {
  assert.ok(uiStyles.includes(homeShellContract), `Missing curated home shell contract: ${homeShellContract}`);
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
assert.ok(!baseStyles.includes('#game-hud-rail .weather-status::before'), 'Base CSS must not regain weather/HUD presentation ownership.');
assert.ok(uiStyles.includes('#game-hud-rail .weather-status::before'));
assert.ok(uiStyles.includes("html[data-market-weather='rain']"));
assert.ok(uiStyles.includes('--game-yellow:'));
assert.ok(!baseStyles.includes('"Apple Color Emoji"'), 'Native color emoji must not own trade-button styling.');

assert.ok(pwa.includes("'./market-weather.css'"), 'PWA loader must attach market-weather.css.');
assert.ok(pwa.includes("'./scripts/market-weather.js'"), 'PWA loader must attach market-weather.js.');
assert.ok(serviceWorker.includes("'./market-weather.css'"), 'Offline shell must cache market-weather.css.');
assert.ok(serviceWorker.includes("'./scripts/market-weather.js'"), 'Offline shell must cache scripts/market-weather.js.');
assert.ok(serviceWorker.includes("const APP_CACHE = 'flappyk-app'"), 'PWA must use the stable app cache lifecycle.');
assert.ok(serviceWorker.includes("const RUNTIME_CACHE = 'flappyk-runtime'"), 'PWA must use the stable runtime cache lifecycle.');
assert.ok(serviceWorker.includes('isCriticalSameOriginAsset'), 'Critical same-origin assets must be refreshed network-first.');
assert.ok(!/flappyk-(?:app|runtime)-v\d+/.test(serviceWorker), 'Feature-numbered cache names must not return.');
assert.ok(serviceWorker.includes("'./premium-ui.css'"), 'Offline shell must cache the canonical home and pixel UI styles.');
assert.ok(!serviceWorker.includes("'./home-story.css'"), 'Retired home-story stylesheet path must not return.');
assert.ok(serviceWorker.includes("'./scripts/home-story.js'"), 'Offline shell must cache the second home panel behavior.');
assert.ok(serviceWorker.includes("'./account-integration.css'"), 'Offline shell must cache the account toolbar styles.');
assert.ok(serviceWorker.includes("'./scripts/account-cloud-sync.js'"), 'Offline shell must cache the account cloud bridge.');

console.log('Isolated market weather, staged transitions, explicit event ownership, canonical terminal HUD ownership, account toolbar, cloud history, and stable PWA cache contracts passed.');
