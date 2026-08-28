const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const index = read('index.html');
const i18n = read('i18n.css');
const premiumUi = read('scripts/premium-ui.js');
const uiState = read('scripts/ui-state.js');
const architecture = read('docs/UI_ARCHITECTURE.md');

assert.ok(
  !index.includes('visual-polish.css'),
  'The obsolete rounded/glass visual-polish layer must not be loaded after the pixel UI.',
);
assert.ok(
  !i18n.includes('visual-polish.css'),
  'Feature stylesheets must not reintroduce the obsolete visual layer through hidden imports.',
);
assert.ok(!index.includes('premium-ui-refinement.js'), 'The retired runtime composition layer must remain deleted.');

for (const assignment of ['updateUI =', 'startLevel =', 'endLevel =']) {
  assert.ok(
    !premiumUi.includes(assignment),
    `Premium behavior must subscribe to canonical state instead of re-wrapping ${assignment.replace(' =', '')}.`,
  );
}

for (const retiredStatePath of ['inferFromDom', 'new MutationObserver']) {
  assert.ok(!uiState.includes(retiredStatePath), `Core lifecycle must not infer state from DOM: ${retiredStatePath}`);
}
assert.ok(
  uiState.includes("controller?.on('level-did-start'"),
  'Playing state must derive from the GameController lifecycle.',
);
assert.ok(
  uiState.includes("controller?.on('level-will-settle'"),
  'Settlement state must derive from the GameController lifecycle.',
);
assert.ok(
  premiumUi.includes('window.FlappyKUiState?.virtualControls'),
  'Responsive guide targeting must use the shared virtual-controls state.',
);
for (const canonicalDom of ['id="game-hud-rail"', 'id="run-progress-panel"', 'id="mobile-controls"']) {
  assert.ok(index.includes(canonicalDom), `Source markup must own ${canonicalDom}`);
}
assert.ok(
  architecture.includes('One component has one structural owner.'),
  'The UI ownership contract must remain documented.',
);
assert.ok(
  architecture.includes('New inline styles are prohibited'),
  'The architecture document must prohibit new inline-style debt.',
);

console.log('UI architecture uses explicit lifecycle state and canonical source DOM ownership.');