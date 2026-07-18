const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (path) => fs.readFileSync(path, 'utf8');

const indexSource = read('index.html');
const experienceSource = read('experience.js');
const hardeningSource = read('core-hardening.js');
const legendSource = read('legend-ticker.js');
const qqqSource = read('qqq-loader.js');
const exportSource = read('card-export.js');
const leaderboardSource = read('leaderboard.js');
const leaderboardWorkflow = read('.github/workflows/leaderboard.yml');

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

assert.match(indexSource, /leaderboard-open-btn/);
assert.match(indexSource, /leaderboard-screen/);
assert.match(indexSource, /leaderboard-submit-btn/);
assert.match(indexSource, /leaderboard\.js/);
assert.match(leaderboardSource, /TOTAL EXCESS/);
assert.match(leaderboardSource, /collectedCards\.length !== 3/);
assert.match(leaderboardSource, /issues\/new/);
assert.match(leaderboardSource, /SUBMIT TOP 10/);
assert.match(leaderboardWorkflow, /issues:/);
assert.match(leaderboardWorkflow, /updateTop10/);
assert.match(leaderboardWorkflow, /createOrUpdateFileContents/);

console.log('UI, leaderboard, and reviewed regression checks passed');
