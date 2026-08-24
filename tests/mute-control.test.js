'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('index.html', 'utf8');
const game = fs.readFileSync('game.js', 'utf8');
const i18nCore = fs.readFileSync('scripts/i18n-core.js', 'utf8');
const refinement = fs.readFileSync('scripts/premium-ui-refinement.js', 'utf8');
const premiumCss = fs.readFileSync('premium-ui.css', 'utf8');

for (const contract of [
    'id="sound-toggle-btn"',
    'aria-label="Mute sound"',
    'aria-pressed="false"',
]) {
    assert.ok(index.includes(contract), `Missing sound toggle markup contract: ${contract}`);
}

assert.ok(
    game.includes("'flappyk_sound_muted_v1'"),
    'The muted preference must persist under the stable storage key.',
);
assert.ok(game.includes('function setSoundMuted(muted)'), 'Sound muting must have a single setter.');
assert.ok(game.includes('function toggleSound()'), 'Keyboard and button paths must share one toggle.');
assert.ok(game.includes('window.FlappyKEvents?.emit?.(\'flappyk:sound-changed\''), 'Sound state changes must be published on the event bus.');

const gatedLoops = game.split('if (!soundMuted)').length - 1;
const gatedActions = game.split('if (!audioCtx || soundMuted) return;').length - 1;
assert.ok(gatedLoops >= 1, 'The background melody must respect the mute gate.');
assert.ok(gatedActions >= 1, 'Trade and settlement sound effects must respect the mute gate.');

assert.ok(
    game.includes("if (e.key === 'm' || e.key === 'M')"),
    'The M key must toggle sound.',
);
assert.ok(
    game.includes("soundToggleBtn?.addEventListener('click', () => toggleSound())"),
    'The sound button must route through the shared toggle.',
);

for (const entry of [
    "'Mute sound': '静音'",
    "'Unmute sound': '取消静音'",
    "'Mute [M]': '静音 [M]'",
    "'Unmute [M]': '取消静音 [M]'",
]) {
    assert.ok(i18nCore.includes(entry), `Missing bilingual sound dictionary entry: ${entry}`);
}

assert.ok(
    refinement.includes("document.getElementById('sound-toggle-btn')"),
    'HUD normalization must own the bilingual relabel of the sound control.',
);

assert.ok(premiumCss.includes('#sound-toggle-btn'), 'The canonical stylesheet must present the sound control.');
assert.ok(
    premiumCss.includes('grid-template-columns: minmax(132px, 1fr) 48px 48px 56px 48px;'),
    'Desktop top controls must reserve a column for the sound control.',
);
assert.ok(
    premiumCss.includes('grid-template-columns: 44px 44px 44px 44px;'),
    'Compact top controls must reserve a column for the sound control.',
);

console.log('Persistent mute control contracts passed.');
