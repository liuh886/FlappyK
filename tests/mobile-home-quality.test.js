'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const home = fs.readFileSync('premium-ui-refinement.css', 'utf8');
const story = fs.readFileSync('home-story.css', 'utf8');

for (const contract of [
  'Mobile home quality pass',
  'grid-template-rows: 48px minmax(0, 1fr) 28px',
  'justify-content: flex-start',
  'width: min(320px, 100%)',
  'grid-template-columns: repeat(2, minmax(0, 1fr))',
  'grid-template-columns: minmax(0, 1fr) 106px',
  '.daily-mode-copy span {\n        display: none',
  '#start-screen.arcade-home .start-data-ticker {\n        display: none',
]) {
  assert.ok(home.includes(contract), `Missing compact mobile-home contract: ${contract}`);
}

for (const contract of [
  'Mobile story quality pass',
  'padding:\n            22px',
  'max(40px, env(safe-area-inset-right))',
  'min-height: 52px',
  'min-height: 180px',
  'top: auto',
  'bottom: 10px',
  'left: 50%',
]) {
  assert.ok(story.includes(contract), `Missing refined story contract: ${contract}`);
}

assert.ok(!home.includes('mobile-home-quality.css'), 'Do not reintroduce a separate mobile override stylesheet.');

console.log('Compact mobile cartridge home and story hierarchy contracts passed.');
