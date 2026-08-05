const assert = require('node:assert/strict');
const fs = require('node:fs');

const weatherSource = fs.readFileSync('scripts/market-weather.js', 'utf8');
const weatherStyles = fs.readFileSync('market-weather.css', 'utf8');

assert.ok(weatherSource.includes('function syncHomeUtilityPlacement()'));
assert.ok(weatherSource.includes("utilityBar.dataset.arcadePlacement = homeActive && topLine ? 'console' : 'game'"));
assert.ok(weatherSource.includes("window.addEventListener('orientationchange', scheduleSync)"));
assert.ok(weatherSource.includes('syncHomeUtilityPlacement,'));

assert.ok(weatherStyles.includes('env(safe-area-inset-top)'));
assert.ok(weatherStyles.includes(".home-utility-bar[data-arcade-placement='console']"));
assert.ok(weatherStyles.includes('min-height: 44px !important'));
assert.ok(weatherStyles.includes('@media (max-width: 430px) and (max-height: 700px)'));
assert.ok(weatherStyles.includes('@media (orientation: landscape) and (max-height: 500px)'));
assert.ok(weatherStyles.includes('#start-screen.arcade-home button:focus-visible'));
assert.ok(weatherStyles.includes('touch-action: manipulation'));
assert.ok(weatherStyles.includes('overscroll-behavior: contain'));

console.log('Safe-area, utility placement, touch target, focus, short-screen, and landscape arcade contracts passed.');
