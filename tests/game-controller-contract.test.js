'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const game = read('game.js');
const eventBus = read('scripts/event-bus.js');

// --- Controller kernel contract -------------------------------------------

assert.ok(game.includes('window.FlappyKGameController = {'), 'game.js must expose the GameController kernel.');
for (const hook of [
    "'level-will-start'",
    "'level-did-start'",
    "'tick'",
    "'trade'",
    "'level-will-settle'",
    "'level-did-settle'",
]) {
    assert.ok(game.includes(hook), `Missing authoritative lifecycle hook: ${hook}`);
}
assert.ok(
    /DATA_SOURCE_PRIORITY\s*=\s*\{\s*daily:\s*40,\s*friend:\s*30,\s*custom:\s*20\s*\}/.test(game),
    'Data-source priority must stay daily > friend > custom regardless of script order.',
);
assert.ok(game.includes("emitHook('data-resolved'"), 'Market resolution must publish data-resolved.');
assert.ok(game.includes("emitHook('level-did-settle'"), 'Settlement must publish the structured result payload.');
assert.ok(game.includes('window.FlappyKMarketPassRule.evaluate'), 'The controller must evaluate through the shared pass rule.');

// The bus must carry the settle-intent event.
assert.ok(eventBus.includes("LEVEL_WILL_SETTLE: 'flappyk:level-will-settle'"));

// --- No monkey-patch wrappers may return -----------------------------------

const RUNTIME_FILES = [
    'game.js',
    'results.js',
    'legend-ticker.js',
    'custom-challenge.js',
    'core-hardening.js',
    'experience.js',
    'friend-challenge.js',
    'daily-run.js',
    'analytics.js',
    'leaderboard.js',
    'share-challenge.js',
    'card-export.js',
    'qqq-loader.js',
    'data-loader.js',
    'membership-config.js',
    'pwa.js',
    'scripts/market-pass-rule.js',
    'scripts/market-goal-ui.js',
    'scripts/game-pacing.js',
    'scripts/ui-state.js',
    'scripts/premium-ui.js',
    'scripts/market-canvas.js',
];

for (const file of RUNTIME_FILES) {
    const source = read(file);
    const banned = source.match(/(previous|original)(StartLevel|EndLevel|PickRandomData)/g) || [];
    assert.deepEqual(
        banned,
        [],
        `${file} reintroduced a lifecycle monkey-patch wrapper: ${banned.join(', ')}`,
    );
}

// The pass rule is pure math again; it must not own settlement rendering.
const passRule = read('scripts/market-pass-rule.js');
assert.ok(!passRule.includes('settlementScreen'), 'market-pass-rule must stay free of settlement rendering.');
assert.ok(passRule.includes('isSuccess: excessReturn > 0'), 'The positive-excess rule is the authoritative verdict.');

// --- Every feature module subscribes instead of wrapping --------------------

const SUBSCRIBERS = {
    'results.js': ["window.FlappyKGameController?.on('level-did-settle'"],
    'custom-challenge.js': ['registerDataSource', "on('level-did-start'", "on('level-did-settle'"],
    'core-hardening.js': ["on('level-will-settle'", "on('level-did-settle'"],
    'friend-challenge.js': ['registerDataSource', "on('data-resolved'"],
    'daily-run.js': ['registerDataSource', "on('level-did-start'"],
    'analytics.js': ["on('level-will-start'", "on('level-did-start'", "on('level-did-settle'"],
    'scripts/game-pacing.js': [
        "on('level-will-start')".replace(')', ''),
        "on('level-did-start'",
        "on('level-will-settle'",
        "on('level-did-settle'",
    ],
    'scripts/ui-state.js': ["on('level-did-start'", "on('level-will-settle'"],
    'scripts/premium-ui.js': ["on('level-did-start'", "on('level-did-settle'"],
};

for (const [file, contracts] of Object.entries(SUBSCRIBERS)) {
    const source = read(file);
    for (const contract of contracts) {
        assert.ok(source.includes(contract), `${file} must subscribe via ${contract}`);
    }
}

// Goal label ownership: market-goal-ui writes it; daily-run may override after.
assert.ok(read('scripts/market-goal-ui.js').includes("'BEAT THE MARKET'"));
assert.ok(read('daily-run.js').includes("'DAILY · BEAT THE MARKET'"));

// did-start subscribers fire in script order, so the Daily goal override only
// wins while market-goal-ui loads first. Pin that ordering explicitly.
const indexSource = read('index.html');
const goalAt = indexSource.indexOf('scripts/market-goal-ui.js');
const dailyAt = indexSource.indexOf('daily-run.js');
const customAt = indexSource.indexOf('custom-challenge.js');
assert.ok(goalAt >= 0 && dailyAt > goalAt, 'market-goal-ui.js must load before daily-run.js so DAILY can override the goal label.');
assert.ok(customAt >= 0 && goalAt > customAt, 'custom-challenge.js must load before market-goal-ui.js to keep the documented label precedence.');

console.log('GameController lifecycle, explicit UI state, data-source registry, and zero-wrapper contracts passed.');