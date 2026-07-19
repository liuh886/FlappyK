const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (path) => fs.readFileSync(path, 'utf8');

const indexSource = read('index.html');
const experienceSource = read('experience.js');
const hardeningSource = read('core-hardening.js');
const friendSource = read('friend-challenge.js');
const friendCssSource = read('friend-challenge.css');
const scoreSource = read('scripts/legend-score.js');
const legendSource = read('legend-ticker.js');
const qqqSource = read('qqq-loader.js');
const exportSource = read('card-export.js');
const shareSource = read('share-challenge.js');
const leaderboardSource = read('leaderboard.js');
const leaderboardWorkflow = read('.github/workflows/leaderboard.yml');

assert.match(indexSource, /start-data-ticker/);
assert.match(indexSource, /REAL HISTORICAL K-LINES/);
assert.doesNotMatch(indexSource, /NOT LIVE DATA/);
assert.doesNotMatch(indexSource, /ESC = RETURN HOME/);
assert.doesNotMatch(indexSource, /interface-polish\.js/);
assert.match(indexSource, /GAME: <span id="level-display">1\/3<\/span>/);
assert.doesNotMatch(indexSource, /LEVEL: <span id="level-display">/);

assert.match(experienceSource, /event\.key !== 'Escape'/);
assert.doesNotMatch(experienceSource, /AUTO_NEXT|nextBtn\.click/);

assert.match(hardeningSource, /cloneNode\(true\)/);
assert.match(hardeningSource, /addEventListener\('click'/);
assert.match(hardeningSource, /maxStart \+ 1/);
assert.match(hardeningSource, /dataset\.completedLevel/);
assert.match(hardeningSource, /title\.textContent = 'PROFIT CARD'/);
assert.match(hardeningSource, /levelDisp\.textContent = `\$\{visibleGame\}\/3`/);
assert.match(hardeningSource, /levelDisp\.textContent !== 'CUSTOM'/);

assert.doesNotMatch(legendSource, /🦬|updateTradeButtons|installCanvasEmojiMap/);
assert.doesNotMatch(legendSource, /ctx\.fillText\s*=/);

assert.match(qqqSource, /Object\.defineProperty\(stockData\.usstock, QQQ_NAME/);
assert.match(qqqSource, /enumerable: false/);
assert.match(exportSource, /dataset\.completedLevel/);
assert.match(exportSource, /FlappyK_Custom_ProfitCard\.png/);

assert.match(indexSource, /challenge-share-btn/);
assert.match(indexSource, />CHALLENGE A FRIEND</);
assert.match(indexSource, /id="champagne-save-btn">SAVE RESULT/);
assert.match(indexSource, /property="og:title"/);
assert.match(indexSource, /property="og:image" content="https:\/\/liuh886\.github\.io\/FlappyK\/og-image\.png"/);
assert.match(indexSource, /property="og:image:type" content="image\/png"/);
assert.match(indexSource, /property="og:image:width" content="1200"/);
assert.match(indexSource, /property="og:image:height" content="630"/);
assert.match(indexSource, /twitter:card/);
assert.match(indexSource, /share-challenge\.js/);
assert.ok(fs.existsSync('og-image.png'), 'Raster Open Graph image must exist');
assert.match(shareSource, /I traded 3 hidden historical markets/);
assert.match(shareSource, /CAN YOU BEAT ME\?/);
assert.match(shareSource, /navigator\.share/);
assert.match(shareSource, /navigator\.clipboard\.writeText/);
assert.match(shareSource, /stopImmediatePropagation/);
assert.match(shareSource, /FlappyKFriendChallenge\?\.buildChallengeUrl/);
assert.match(shareSource, /FlappyKFriendChallenge\?\.isActive\(\)/);
assert.match(shareSource, /function currentChallengeLabel\(\)/);
assert.match(shareSource, /renderLegend\(score, \{ challengeHeadline: false \}\)/);
assert.match(shareSource, /FlappyK_Legend_Result\.png/);
assert.match(shareSource, /NotAllowedError/);
assert.match(shareSource, /TAP TO SHARE/);
assert.match(shareSource, /sharePreparedChallenge/);

assert.match(indexSource, /scripts\/friend-challenge-codec\.js/);
assert.match(indexSource, /scripts\/legend-score\.js/);
assert.ok(indexSource.indexOf('scripts/legend-score.js') < indexSource.indexOf('friend-challenge.js'));
assert.ok(indexSource.indexOf('scripts/legend-score.js') < indexSource.indexOf('leaderboard.js'));
assert.ok(indexSource.indexOf('scripts/legend-score.js') < indexSource.indexOf('share-challenge.js'));
assert.match(scoreSource, /FlappyKLegendScore/);
assert.match(scoreSource, /benchmarkGrowth \*= \(1 \+ marketReturn\)/);
assert.match(friendSource, /const scoreApi = window\.FlappyKLegendScore/);
assert.match(leaderboardSource, /const scoreApi = window\.FlappyKLegendScore/);
assert.match(shareSource, /const scoreApi = window\.FlappyKLegendScore/);

assert.match(indexSource, /friend-challenge\.js/);
assert.match(indexSource, /friend-challenge-result/);
assert.match(friendSource, /new URLSearchParams\(window\.location\.search\)/);
assert.match(friendSource, /window\.location\.hash/);
assert.match(friendSource, /url\.searchParams\.set\('challenge'/);
assert.match(friendSource, /SAME 3 HIDDEN MARKETS/);
assert.match(friendSource, /resolveDescriptor/);
assert.match(friendSource, /data\.findIndex/);
assert.match(friendSource, /captureNormalDescriptor/);
assert.match(friendSource, /CHALLENGE BACK/);
assert.match(friendSource, /WON BY/);
assert.match(friendSource, /LOST BY/);
assert.match(friendSource, /TIE GAME/);
assert.match(friendSource, /friend-challenge-result--tied/);
assert.match(friendCssSource, /\.friend-challenge-result--tied/);
assert.match(friendSource, /buildChallengeUrl/);
assert.doesNotMatch(friendSource, /localStorage|fetch\(/);

assert.match(indexSource, /leaderboard-open-btn/);
assert.match(indexSource, /leaderboard-screen/);
assert.match(indexSource, /leaderboard-submit-btn/);
assert.match(indexSource, /leaderboard\.js/);
assert.match(leaderboardSource, /TOTAL EXCESS/);
assert.match(leaderboardSource, /scoreApi\?\.calculate\(collectedCards, finalReturn\)/);
assert.match(leaderboardSource, /issues\/new/);
assert.match(leaderboardSource, /SUBMIT TOP 10/);
assert.match(leaderboardWorkflow, /issues:/);
assert.match(leaderboardWorkflow, /updateTop10/);
assert.match(leaderboardWorkflow, /createOrUpdateFileContents/);

console.log('UI, friend challenge, sharing, shared score, leaderboard, and reviewed regression checks passed');
