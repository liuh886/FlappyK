const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('index.html', 'utf8');
const storyJs = fs.readFileSync('scripts/home-story.js', 'utf8');
const storyCss = fs.readFileSync('home-story.css', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

assert.ok(index.includes('<link rel="stylesheet" href="home-story.css">'));
assert.ok(index.includes('<script src="scripts/home-story.js"></script>'));
assert.ok(!index.includes('home-market.css'));
assert.ok(!index.includes('scripts/home-market.js'));
assert.ok(index.indexOf('home-story.css') > index.indexOf('premium-ui-refinement.css'));
assert.ok(index.indexOf('scripts/home-story.js') > index.indexOf('scripts/premium-ui-refinement.js'));

for (const contract of [
  "startScreen.dataset.storyInstalled = 'true'",
  "startScreen.classList.toggle('is-story-active'",
  "event.key === 'ArrowRight'",
  "event.key === 'ArrowLeft'",
  "startButton.click()",
  "250 days minus 3 trades equals 247 days waiting",
  "250 天减去 3 次出手，等于 247 天等待",
  "THE BEST TRADES ARE OFTEN QUIET.",
  "最好的交易，往往很安静。",
  "home-story-marker--buy",
  "home-story-marker--add",
  "home-story-marker--sell",
]) {
  assert.ok(storyJs.includes(contract), `Missing home story behavior: ${contract}`);
}

for (const contract of [
  '#start-screen.is-story-active > :not(.home-story-slide):not(.home-story-navigation)',
  'grid-template-columns: minmax(0, 0.92fr) minmax(360px, 1.08fr)',
  '.home-story-equation-term--trades',
  '.home-story-equation-term--waiting',
  '.home-story-chart-price',
  '.home-story-arrow--next',
  '@media (max-width: 720px), (pointer: coarse)',
  '@media (prefers-reduced-motion: reduce)',
]) {
  assert.ok(storyCss.includes(contract), `Missing home story visual contract: ${contract}`);
}

assert.equal((storyJs.match(/home-story-marker home-story-marker--/g) || []).length, 3);
assert.ok(!storyJs.includes('new Swiper'));
assert.ok(!storyJs.includes('setInterval('));
assert.ok(serviceWorker.includes("flappyk-app-v25"));
assert.ok(serviceWorker.includes("flappyk-runtime-v25"));
assert.ok(serviceWorker.includes("'./home-story.css'"));
assert.ok(serviceWorker.includes("'./scripts/home-story.js'"));
assert.ok(!serviceWorker.includes('home-market'));

console.log('Two-page pixel home story, decisive-trades message, bilingual copy, keyboard navigation, mobile layout, and PWA v25 contracts passed');