const assert = require('node:assert/strict');
const fs = require('node:fs');

const game = fs.readFileSync('game.js', 'utf8');
const css = fs.readFileSync('mobile-controls.css', 'utf8');

// Touch, mouse and keyboard activation converge on native click semantics.
for (const control of ['btnBuy', 'btnSell', 'btnSpeedUp', 'btnSpeedDown']) {
  assert.ok(game.includes(`${control}?.addEventListener('click'`), `${control} must use the canonical click path`);
}
for (const legacyEvent of ['touchstart', 'mousedown']) {
  for (const control of ['btnBuy', 'btnSell', 'btnSpeedUp', 'btnSpeedDown']) {
    assert.ok(!game.includes(`${control}.addEventListener('${legacyEvent}'`), `${control} must not retain ${legacyEvent}`);
  }
}

// The fixed command dock must reserve actual stage height, not cover the canvas.
assert.ok(css.includes("html[data-virtual-controls='true'][data-ui-state='playing'] #game-canvas"));
assert.ok(css.includes('height: calc(100% - 102px - env(safe-area-inset-bottom))'));
assert.ok(css.includes('height: calc(100% - 94px - env(safe-area-inset-bottom))'));
assert.ok(css.includes('height: calc(100% - 86px - env(safe-area-inset-bottom))'));
assert.ok(!css.includes('margin-bottom: calc(102px + env(safe-area-inset-bottom))'));
assert.ok(!css.includes('margin-bottom: calc(94px + env(safe-area-inset-bottom))'));
assert.ok(!css.includes('margin-bottom: calc(86px + env(safe-area-inset-bottom))'));

// Mobile keeps controls that affect the current run: back, pause and sound.
assert.ok(css.includes("#game-top-controls #sound-toggle-btn"));
assert.ok(css.includes("#game-top-controls #game-skin-toggle-btn"));
assert.ok(css.includes('display: block !important'));
assert.ok(css.includes('display: none !important'));

console.log('Mobile stage reservation, run-control priority, and single activation path checks passed');
