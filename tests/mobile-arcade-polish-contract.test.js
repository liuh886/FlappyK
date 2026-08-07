const assert = require('node:assert/strict');
const fs = require('node:fs');

const weatherSource = fs.readFileSync('scripts/market-weather.js', 'utf8');
const weatherStyles = fs.readFileSync('market-weather.css', 'utf8');
const uiStyles = fs.readFileSync('premium-ui-refinement.css', 'utf8');
const baseStyles = fs.readFileSync('style.css', 'utf8');

assert.ok(weatherSource.includes('function syncHomeUtilityPlacement()'));
assert.ok(weatherSource.includes("utilityBar.dataset.arcadePlacement = homeActive && topLine ? 'console' : 'game'"));
assert.ok(weatherSource.includes("window.addEventListener('orientationchange', scheduleSync)"));
assert.ok(weatherSource.includes('syncHomeUtilityPlacement,'));

// Home/mobile shell belongs to the curated presentation layer.
assert.ok(uiStyles.includes('env(safe-area-inset-top)'));
assert.ok(uiStyles.includes(".home-utility-bar[data-arcade-placement='console']"));
assert.ok(uiStyles.includes('min-height: 40px !important'));
assert.ok(uiStyles.includes('@media (max-width: 430px) and (max-height: 700px)'));
assert.ok(uiStyles.includes('(orientation: landscape) and (max-height: 500px)'));
assert.ok(uiStyles.includes('#mobile-controls .mobile-trade-primary'));
assert.ok(uiStyles.includes('font-size: 14px'));

// Gameplay control chrome remains owned by the established HUD/instrument system.
assert.ok(baseStyles.includes("#mobile-controls:not([hidden])"));
assert.ok(baseStyles.includes('#mobile-controls .mobile-btn'));
assert.ok(baseStyles.includes(':where(button, select, summary, a[href]):focus-visible'));
assert.ok(baseStyles.includes('touch-action: manipulation'));

// Weather presentation must not grow back into home/mobile layout ownership.
assert.ok(!weatherStyles.includes(".home-utility-bar[data-arcade-placement='console']"));
assert.ok(!weatherStyles.includes('#start-screen.arcade-home'));

console.log('Safe-area, curated home controls, gameplay instrument ownership, focus, short-screen, landscape, and isolated weather contracts passed.');