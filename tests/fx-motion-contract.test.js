'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const canvas = read('scripts/market-canvas.js');
const haptics = read('scripts/haptics.js');
const game = read('game.js');
const premiumUiJs = read('scripts/premium-ui.js');
const premiumUiCss = read('premium-ui.css');
const serviceWorker = read('sw.js');
const indexHtml = read('index.html');
const tickerCss = read('legend-ticker.css');

// --- Stillness: the market stage is a still image between ticks --------------

for (const retired of [
    'requestBurst',
    'spawnParticle',
    'spawnBurst',
    'drawAmbient',
    'prefersReducedMotion',
    'requestAnimationFrame',
    'PARTICLE_POOL',
    'AMBIENT_POOL',
    'flarePulse',
]) {
    assert.ok(!canvas.includes(retired), `Canvas must not contain motion machinery: ${retired}`);
}

assert.ok(canvas.includes('window.FlappyKMarketCanvas'), 'Canvas renderer stays the single market visual owner.');
assert.ok(canvas.includes('ctx.imageSmoothingEnabled = false'), 'Canvas output stays hard-edged.');
assert.ok(!canvas.includes('shadowBlur'), 'Canvas must never use blurred shadows.');
assert.ok(canvas.includes('drawBackdrop'), 'Static skin scenery remains part of the stage.');

// --- Game core: no screen shake, no burst requests ----------------------------

for (const retired of [
    'triggerScreenShake',
    'is-shaking',
    "requestBurst?.('checkpoint')",
    "playSfx?.('weather')",
]) {
    assert.ok(!game.includes(retired), `Game core must not trigger retired feedback: ${retired}`);
}

for (const kind of ['checkpoint', 'speed', 'ui']) {
    assert.ok(game.includes(`type === '${kind}'`), `Missing SFX branch: ${kind}`);
}
assert.ok(!game.includes("type === 'weather'"), 'Weather SFX is retired with the weather system.');
assert.ok(game.includes('0.32 - speedMultiplier * 0.008'), 'Melody tempo must follow playback speed (15x keeps the 200ms step).');
assert.ok(game.includes("playActionSound('win')") && game.includes("playActionSound('fail')"), 'Stage win/fail chiptune remains.');
assert.ok(game.includes("playActionSound('checkpoint')"), 'Milestone days chime.');
assert.ok(game.includes('playSfx(kind)'), 'External modules request audio through controller.playSfx.');

// --- Shared presentation: no keyframes, no shake, no pop ----------------------

assert.ok(!premiumUiCss.includes('@keyframes'), 'Shared presentation must not define keyframe animations.');
assert.ok(!premiumUiCss.includes('arcade-screen-shake'), 'Screen shake must stay retired.');
assert.ok(!premiumUiCss.includes('arcade-medal-drop'), 'Medal drop must stay retired.');
assert.ok(!premiumUiCss.includes('arcade-score-pop'), 'Score pop must stay retired.');
assert.ok(!premiumUiJs.includes('rollUpExcessSummary'), 'Settlement numbers render statically.');
assert.ok(!tickerCss.includes('animation:'), 'Legend ticker must not scroll.');

for (const token of ['--motion-step-fast', '--motion-step-base', '--motion-step-slow']) {
    assert.ok(premiumUiCss.includes(`${token}:`), `Motion tokens remain available to skins: ${token}`);
}

// --- Haptics: progressive enhancement only -------------------------------------

assert.ok(haptics.includes("navigator.vibrate?.bind(navigator)"), 'Haptics must feature-detect the vibration API.');
assert.ok(haptics.includes("controller?.on('trade'") && haptics.includes("controller?.on('level-did-settle'"), 'Haptics subscribe through the controller.');
assert.ok(haptics.includes("flappyk:sound-changed"), 'Haptics respect the mute preference.');
assert.ok(indexHtml.includes('<script src="scripts/haptics.js"></script>'), 'haptics loads with the app shell.');
assert.ok(serviceWorker.includes("'./scripts/haptics.js'"), 'The offline shell caches haptics.');
assert.ok(!indexHtml.includes('fx-particles'), 'Retired fx-particles module must not return.');
assert.ok(!serviceWorker.includes("'./scripts/fx-particles.js'"), 'Retired fx-particles module must not be cached.');

console.log('Stillness contracts passed: a quiet stage, static scenery, audio-only feedback.');
