'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const weather = fs.readFileSync('scripts/market-weather.js', 'utf8');
const home = fs.readFileSync('premium-ui.css', 'utf8');
const story = fs.readFileSync('premium-ui.css', 'utf8');

for (const contract of [
  "'FLAPPY K'",
  "'HIDDEN MARKET ARCADE'",
  "'3 WORLDS · 250 DAYS · BEAT THE MARKET'",
  'function buildHomeWorldStrip()',
  "['crypto', '01'",
  "['ashare', '02'",
  "['us', '03'",
  "'↑ BUY · ↓ SELL · EXCESS > 0 WINS'",
]) {
  assert.ok(weather.includes(contract), `Missing Hidden Market Arcade home contract: ${contract}`);
}

for (const contract of [
  '--arcade-sky:',
  '--arcade-horizon:',
  '.home-console-series',
  '.home-world-strip',
  '.home-world--ashare .home-world-index',
  '.home-world--us .home-world-index',
  'background: var(--pixel-yellow)',
  'grid-template-columns: repeat(3, minmax(0, 1fr))',
]) {
  assert.ok(home.includes(contract), `Missing premium market-arcade visual contract: ${contract}`);
}

for (const contract of [
  'field-manual page',
  '.home-story-slide::before',
  '.home-story-kicker::before',
  '.home-story-equation',
  '.home-story-tape',
  'background-size: 40px 40px',
]) {
  assert.ok(story.includes(contract), `Missing arcade field-manual story contract: ${contract}`);
}

assert.ok(!home.includes('visual-redesign-v1.css'), 'Visual Redesign v1 must stay in the owning stylesheet, not an override layer.');
assert.ok(!story.includes('visual-redesign-v1.css'), 'Story redesign must stay in the canonical premium-ui.css owner.');

console.log('Visual Redesign v1 Hidden Market Arcade contracts passed.');
