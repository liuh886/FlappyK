const assert = require('node:assert/strict');
const fs = require('node:fs');

const weatherSource = fs.readFileSync('scripts/market-weather.js', 'utf8');
const weatherStyles = fs.readFileSync('market-weather.css', 'utf8');
const homeStyles = fs.readFileSync('home-market.css', 'utf8');
const accountStyles = fs.readFileSync('account-integration.css', 'utf8');
const baseStyles = fs.readFileSync('style.css', 'utf8');

assert.ok(weatherSource.includes('function syncHomeUtilityPlacement()'));
assert.ok(weatherSource.includes("utilityBar.dataset.arcadePlacement = homeActive && topLine ? 'console' : 'game'"));
assert.ok(weatherSource.includes("window.addEventListener('orientationchange', scheduleSync)"));
assert.ok(weatherSource.includes('syncHomeUtilityPlacement,'));

assert.ok(weatherStyles.includes('env(safe-area-inset-top)'));
assert.ok(weatherStyles.includes("html[data-ui-state='home'] #game-container.arcade-weather-ready"));
assert.ok(accountStyles.includes('.home-utility-bar'));
assert.ok(accountStyles.includes('.home-account-slot .hao-account-trigger'));
assert.ok(accountStyles.includes('min-height: 40px'));
assert.ok(accountStyles.includes('@media (max-width: 640px)'));
assert.ok(homeStyles.includes('@media (max-width: 430px) and (max-height: 720px)'));
assert.ok(homeStyles.includes('@media (orientation: landscape) and (max-height: 520px)'));
assert.ok(homeStyles.includes('min-height: 42px'));
assert.ok(homeStyles.includes('env(safe-area-inset-bottom)'));
assert.ok(baseStyles.includes(':where(button, select, summary, a[href]):focus-visible'));

console.log('Safe-area, explicit utility ownership, touch targets, focus, short-screen, and landscape arcade contracts passed.');