const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (path) => fs.readFileSync(path, 'utf8');

const indexSource = read('index.html');
const experienceSource = read('experience.js');
const hardeningSource = read('core-hardening.js');
const legendSource = read('legend-ticker.js');
const qqqSource = read('qqq-loader.js');
const exportSource = read('card-export.js');

assert.match(indexSource, /start-data-ticker/);
assert.match(indexSource, /REAL HISTORICAL K-LINES/);
assert.doesNotMatch(indexSource, /NOT LIVE DATA/);
assert.doesNotMatch(indexSource, /ESC = RETURN HOME/);
assert.doesNotMatch(indexSource, /interface-polish\.js/);

assert.match(experienceSource, /event\.key !== 'Escape'/);
assert.doesNotMatch(experienceSource, /AUTO_NEXT|nextBtn\.click/);

assert.match(hardeningSource, /cloneNode\(true\)/);
assert.match(hardeningSource, /addEventListener\('click'/);
assert.match(hardeningSource, /maxStart \+ 1/);
assert.match(hardeningSource, /dataset\.completedLevel/);
assert.match(hardeningSource, /title\.textContent = 'PROFIT CARD'/);

assert.doesNotMatch(legendSource, /🦬|updateTradeButtons|installCanvasEmojiMap/);
assert.doesNotMatch(legendSource, /ctx\.fillText\s*=/);

assert.match(qqqSource, /Object\.defineProperty\(stockData\.usstock, QQQ_NAME/);
assert.match(qqqSource, /enumerable: false/);
assert.match(exportSource, /dataset\.completedLevel/);
assert.match(exportSource, /FlappyK_Custom_ProfitCard\.png/);

console.log('UI and reviewed regression checks passed');
