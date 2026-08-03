const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const index = read('index.html');
const pixelRuntime = read('scripts/premium-ui-refinement.js');
const architecture = read('docs/UI_ARCHITECTURE.md');

assert.ok(
  !index.includes('visual-polish.css'),
  'The obsolete rounded/glass visual-polish layer must not be loaded after the pixel UI.',
);

for (const assignment of ['updateUI =', 'startLevel =', 'endLevel =']) {
  assert.ok(
    !pixelRuntime.includes(assignment),
    `The pixel runtime must observe canonical state instead of re-wrapping ${assignment.replace(' =', '')}.`,
  );
}

assert.ok(
  pixelRuntime.includes("attributeFilter: ['class']"),
  'Settlement synchronization must observe the authoritative status class.',
);
assert.ok(
  pixelRuntime.includes("window.FlappyKUiState.virtualControls"),
  'Responsive targeting must use the shared virtual-controls state.',
);
assert.ok(
  architecture.includes('One component has one structural owner.'),
  'The UI ownership contract must remain documented.',
);
assert.ok(
  architecture.includes('New inline styles are prohibited'),
  'The architecture document must prohibit new inline-style debt.',
);

console.log('UI architecture ownership and anti-layering contracts passed.');
