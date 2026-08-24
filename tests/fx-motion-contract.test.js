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
const fxParticles = read('scripts/fx-particles.js');

// --- Particle pool: capped, zero-allocation, reduced-motion aware ------------

assert.ok(canvas.includes('const PARTICLE_POOL = 64'), 'The particle pool must stay capped at 64.');
assert.ok(canvas.includes('new Float32Array(PARTICLE_POOL'), 'Particle state must live in a preallocated typed array.');
assert.ok(/spawnBurst\(kind[\s\S]{0,200}prefersReducedMotion\(\)\)\s*return;/.test(canvas), 'Particles must be skipped under prefers-reduced-motion.');
assert.ok(canvas.includes("if (kind !== 'buy' && kind !== 'sell' && kind !== 'checkpoint') return;"), 'Burst kinds are whitelisted.');

// --- Haptics: progressive enhancement only -----------------------------------

assert.ok(haptics.includes("navigator.vibrate?.bind(navigator)"), 'Haptics must feature-detect the vibration API.');
assert.ok(haptics.includes("controller?.on('trade'") && haptics.includes("controller?.on('level-did-settle'"), 'Haptics subscribe through the controller.');
assert.ok(haptics.includes("flappyk:sound-changed"), 'Haptics respect the mute preference.');

// --- SFX coverage + tempo-following melody ------------------------------------

for (const kind of ['checkpoint', 'speed', 'weather', 'ui']) {
    assert.ok(game.includes(`type === '${kind}'`), `Missing SFX branch: ${kind}`);
}
assert.ok(game.includes('0.32 - speedMultiplier * 0.008'), 'Melody tempo must follow playback speed (15x keeps the 200ms step).');
assert.ok(game.includes('playActionSound(\'win\')') && game.includes('playActionSound(\'fail\')'), 'Stage win/fail chiptune is part of the documented game feel.');
assert.ok(game.includes('playActionSound(\'checkpoint\')'), 'Milestone days chime.');
assert.ok(game.includes('window.FlappyKMarketCanvas?.requestBurst?.(\'checkpoint\')'), 'Milestone days flash on the stage rail.');
assert.ok(game.includes('playSfx(kind)'), 'External modules request audio through controller.playSfx.');

// --- FX module wiring ----------------------------------------------------------

assert.ok(fxParticles.includes("controller?.on('trade'"), 'fx-particles translates trade hooks into burst requests.');
assert.ok(indexHtml.includes('<script src="scripts/fx-particles.js"></script>'), 'fx-particles loads with the app shell.');
assert.ok(indexHtml.includes('<script src="scripts/haptics.js"></script>'), 'haptics loads with the app shell.');
assert.ok(serviceWorker.includes("'./scripts/fx-particles.js'") && serviceWorker.includes("'./scripts/haptics.js'"), 'The offline shell caches both FX modules.');

// --- Motion tokens -------------------------------------------------------------

for (const token of ['--motion-step-fast', '--motion-step-base', '--motion-step-slow']) {
    assert.ok(premiumUiCss.includes(`${token}:`), `Missing motion token: ${token}`);
}
assert.ok(premiumUiCss.includes('arcade-screen-shake var(--motion-step-fast)'), 'Screen shake reads the motion token.');
assert.ok(premiumUiCss.includes('arcade-medal-drop var(--motion-step-slow)'), 'Medal drop reads the motion token.');

// --- Settlement count-up ---------------------------------------------------------

assert.ok(premiumUiJs.includes('function rollUpExcessSummary'), 'Settlement excess reveals through a stepped roll-up.');
assert.ok(
    premiumUiJs.match(/rollUpExcessSummary[\s\S]{0,400}prefers-reduced-motion/s),
    'The roll-up must bypass animation under prefers-reduced-motion.',
);

console.log('Feedback FX, motion tokens, and reduced-motion contracts passed.');
