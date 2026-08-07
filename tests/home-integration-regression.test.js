const assert = require('node:assert/strict');
const fs = require('node:fs');

const homeStyles = fs.readFileSync('home-market.css', 'utf8');
const homeSource = fs.readFileSync('scripts/home-market.js', 'utf8');
const weatherSource = fs.readFileSync('scripts/market-weather.js', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

for (const contract of [
  "#start-screen.arcade-home:not(.active)",
  "display: none !important",
  ".home-market-sr-copy",
  "grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.82fr) minmax(0, 0.9fr) minmax(0, 1.13fr)",
  "#home-utility-bar .hao-account-trigger",
  "min-height: 40px !important",
]) {
  assert.ok(homeStyles.includes(contract), `Missing home integration contract: ${contract}`);
}

for (const contract of [
  "const challengeOwnsPrimaryAction = key === 'play'",
  "document.getElementById('friend-challenge-invite')",
  "if (!challengeOwnsPrimaryAction && text[key])",
]) {
  assert.ok(homeSource.includes(contract), `Missing dynamic primary-action ownership contract: ${contract}`);
}

for (const contract of [
  "options.source === 'live' && clockNow() < explicitWeatherUntil",
  "return requestedWeather",
]) {
  assert.ok(weatherSource.includes(contract), `Missing explicit weather hold contract: ${contract}`);
}

assert.ok(serviceWorker.includes("const APP_CACHE = 'flappyk-app-v22'"));
assert.ok(serviceWorker.includes("const RUNTIME_CACHE = 'flappyk-runtime-v22'"));

console.log('Home teardown, resource layout, touch target, challenge ownership, weather hold, and PWA v22 regression contracts passed');
