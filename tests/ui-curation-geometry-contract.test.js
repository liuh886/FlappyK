const assert = require('node:assert/strict');
const fs = require('node:fs');

const canonical = fs.readFileSync('premium-ui.css', 'utf8');
const base = fs.readFileSync('style.css', 'utf8');
const refinementJs = fs.readFileSync('scripts/premium-ui-refinement.js', 'utf8');

for (const structuralContract of [
  'grid-template-rows: minmax(0, 1fr)',
  'min-height: 0 !important',
  "'performance controls'",
  "'weather progress'",
  '#game-hud-rail',
  '#mobile-controls:not([hidden])',
]) {
  assert.ok(canonical.includes(structuralContract), `Missing canonical HUD geometry contract: ${structuralContract}`);
}

for (const visualContract of [
  'border-radius: 0',
  'backdrop-filter: none',
  'box-shadow: var(--pixel-shadow-small)',
]) {
  assert.ok(canonical.includes(visualContract), `Missing terminal visual normalization: ${visualContract}`);
}

assert.ok(!base.includes('html body #game-container #game-hud-rail'), 'style.css must not regain HUD-specific high-specificity rules.');
assert.ok(!base.includes('--hud-shell:'), 'Legacy HUD theme variables must not return to style.css.');
assert.ok(!refinementJs.includes('style.textContent = `'));
assert.ok(!refinementJs.includes('installPixelCompatibilityStyles'));

console.log('Static HUD geometry remains in the canonical presentation layer without legacy specificity overrides.');
