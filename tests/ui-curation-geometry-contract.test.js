const assert = require('node:assert/strict');
const fs = require('node:fs');

const refinement = fs.readFileSync('premium-ui-refinement.css', 'utf8');
const base = fs.readFileSync('style.css', 'utf8');
const refinementJs = fs.readFileSync('scripts/premium-ui-refinement.js', 'utf8');

for (const structuralContract of [
  'grid-template-rows: minmax(0, 1fr)',
  'min-height: 0 !important',
  "'performance controls'",
  "'weather progress'",
]) {
  assert.ok(refinement.includes(structuralContract), `Missing static HUD geometry contract: ${structuralContract}`);
}

for (const visualContract of [
  'min-height: 84px !important',
  'height: auto !important',
  'backdrop-filter: none !important',
  'border-radius: 0 !important',
]) {
  assert.ok(base.includes(visualContract), `Missing HUD visual normalization: ${visualContract}`);
}
assert.ok(!base.includes('height: 52px !important'), 'Fullscreen HUD must not return to the old 52px geometry.');
assert.ok(!base.includes('font-size: 5px !important'), 'Fullscreen HUD must not return to unreadable 5px labels.');

assert.ok(
  /\.trade-key-hint \.key \{[\s\S]*?border-radius: 0 !important;/m.test(base),
  'Desktop trade keycaps must use the same square pixel language as the HUD controls.',
);
assert.ok(!refinementJs.includes('style.textContent = `'));
assert.ok(!refinementJs.includes('installPixelCompatibilityStyles'));

console.log('Readable fullscreen HUD sizing, mobile grid areas, square keycaps, glass removal, and static presentation ownership passed.');
