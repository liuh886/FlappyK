const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('index.html', 'utf8');
const storyJs = fs.readFileSync('scripts/home-story.js', 'utf8');
const uiCss = fs.readFileSync('premium-ui.css', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

assert.ok(index.includes('<link rel="stylesheet" href="premium-ui.css">'));
assert.ok(!index.includes('premium-ui-refinement.css'));
assert.ok(!index.includes('home-story.css'));
assert.ok(index.includes('<script src="scripts/home-story.js"></script>'));
assert.ok(index.indexOf('scripts/home-story.js') > index.indexOf('scripts/premium-ui-refinement.js'));

for (const contract of [
  "startScreen.dataset.storyInstalled = 'true'",
  "startScreen.classList.toggle('is-story-active'",
  "event.key === 'ArrowRight'",
  "event.key === 'ArrowLeft'",
  "startButton.click()",
  '250 days minus 3 trades equals 247 days waiting',
  '250 天减去 3 次出手，等于 247 天等待',
  'THE BEST TRADES ARE OFTEN QUIET.',
  '最好的交易，往往很安静。',
  'home-story-marker--buy',
  'home-story-marker--add',
  'home-story-marker--sell',
]) {
  assert.ok(storyJs.includes(contract), `Missing home story behavior: ${contract}`);
}

for (const contract of [
  '#start-screen.is-story-active .home-console-topline',
  '.home-console-screen > :not(.home-story-slide):not(.home-story-navigation)',
  '.home-story-slide',
  'Story: analysis mode, not a second visual world',
  'grid-template-columns: minmax(260px, 0.7fr) minmax(0, 1.3fr)',
  'font-size: clamp(30px, 4.4vw, 56px)',
  'font-size: clamp(17px, 1.55vw, 21px)',
  '.home-story-equation',
  '.home-story-tape',
  '.home-story-chart-price',
  '.home-story-arrow',
  '@media (max-width: 719px)',
  'grid-template-columns: 1fr',
  '@media (prefers-reduced-motion: reduce)',
]) {
  assert.ok(uiCss.includes(contract), `Missing readable Market Arcade story contract: ${contract}`);
}

for (const retired of ['background: #e7e2d4', 'FIELD NOTE 001', 'clip-path: var(--pixel-cut)']) {
  assert.ok(!uiCss.includes(retired), `Retired paper-story metaphor returned: ${retired}`);
}

assert.ok(!uiCss.includes('#start-screen.is-story-active .home-console-bezel {\n    visibility: hidden;'), 'The analysis mode must not hide its own ancestor.');
assert.equal((storyJs.match(/home-story-marker home-story-marker--/g) || []).length, 3);
assert.ok(!storyJs.includes('new Swiper'));
assert.ok(!storyJs.includes('setInterval('));
assert.ok(serviceWorker.includes("const APP_CACHE = 'flappyk-app'"));
assert.ok(serviceWorker.includes("const RUNTIME_CACHE = 'flappyk-runtime'"));
assert.ok(serviceWorker.includes('isCriticalSameOriginAsset'));
assert.ok(serviceWorker.includes('? networkFirst(request)'));
assert.ok(serviceWorker.includes("'./premium-ui.css'"));
assert.ok(!serviceWorker.includes("'./premium-ui-refinement.css'"));
assert.ok(!serviceWorker.includes("'./home-story.css'"));
assert.ok(serviceWorker.includes("'./scripts/home-story.js'"));
assert.ok(!/flappyk-(?:app|runtime)-v\d+/.test(serviceWorker));

console.log('Market Arcade retains the bilingual decisive-trades analysis mode with larger readable copy, keyboard navigation, mobile containment, and stable PWA cache contracts.');
