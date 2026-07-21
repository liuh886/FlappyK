const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (path) => fs.readFileSync(path, 'utf8');

const indexSource = read('index.html');
const experienceSource = read('experience.js');
const hardeningSource = read('core-hardening.js');
const friendSource = read('friend-challenge.js');
const friendCssSource = read('friend-challenge.css');
const scoreSource = read('scripts/legend-score.js');
const marketPassSource = read('scripts/market-pass-rule.js');
const marketGoalSource = read('scripts/market-goal-ui.js');
const pacingSource = read('scripts/game-pacing.js');
const profileSource = read('scripts/player-profile.js');
const profileCssSource = read('local-records.css');
const resultsSource = read('results.js');
const legendSource = read('legend-ticker.js');
const qqqSource = read('qqq-loader.js');
const exportSource = read('card-export.js');
const shareSource = read('share-challenge.js');
const leaderboardSource = read('leaderboard.js');
const leaderboardWorkflow = read('.github/workflows/leaderboard.yml');

assert.ok(indexSource.includes('start-data-ticker'));
assert.ok(indexSource.includes('REAL HISTORICAL K-LINES'));
assert.equal(indexSource.includes('NOT LIVE DATA'), false);
assert.equal(indexSource.includes('ESC = RETURN HOME'), false);
assert.ok(indexSource.includes('GAME: <span id="level-display">1/3</span>'));
assert.ok(indexSource.includes('GOAL: <span id="target-return-display">BEAT THE MARKET</span>'));
assert.ok(indexSource.includes('Trade 3 hidden historical markets.'));
assert.ok(indexSource.includes('Beat the market to pass each game.'));
assert.ok(indexSource.includes('id="card-market-return"'));
assert.equal(indexSource.includes('ANY PROFIT'), false);

assert.ok(experienceSource.includes("event.key !== 'Escape'"));
assert.equal(experienceSource.includes('AUTO_NEXT'), false);
assert.equal(experienceSource.includes('nextBtn.click'), false);

assert.ok(hardeningSource.includes('cloneNode(true)'));
assert.ok(hardeningSource.includes("addEventListener('click'"));
assert.ok(hardeningSource.includes('maxStart + 1'));
assert.ok(hardeningSource.includes('dataset.completedLevel'));
assert.ok(hardeningSource.includes("title.textContent = 'PROFIT CARD'"));
assert.ok(hardeningSource.includes('levelDisp.textContent = `${visibleGame}/3`'));
assert.ok(hardeningSource.includes("levelDisp.textContent !== 'CUSTOM'"));

assert.ok(indexSource.includes('scripts/market-pass-rule.js'));
assert.ok(indexSource.includes('scripts/market-goal-ui.js'));
assert.ok(indexSource.indexOf('game.js') < indexSource.indexOf('scripts/market-pass-rule.js'));
assert.ok(indexSource.indexOf('scripts/market-pass-rule.js') < indexSource.indexOf('results.js'));
assert.ok(indexSource.indexOf('core-hardening.js') < indexSource.indexOf('scripts/market-goal-ui.js'));
assert.ok(indexSource.indexOf('scripts/market-goal-ui.js') < indexSource.indexOf('friend-challenge.js'));
assert.ok(marketPassSource.includes('isSuccess: excessReturn > 0'));
assert.ok(marketPassSource.includes("statusMsg.innerText = 'MARKET BEATEN!'"));
assert.ok(marketPassSource.includes("statusMsg.innerText = 'MARKET WON.'"));
assert.ok(marketPassSource.includes('marketRetStr'));
assert.ok(marketGoalSource.includes("targetDisp.textContent = 'BEAT THE MARKET'"));
assert.ok(resultsSource.includes('window.FlappyKMarketPassRule'));
assert.ok(resultsSource.includes('performance.isSuccess'));
assert.ok(resultsSource.includes('legend-market-return'));

assert.ok(indexSource.includes('scripts/game-pacing.js'));
assert.ok(indexSource.includes('id="pause-btn"'));
assert.ok(indexSource.includes('id="btn-pause"'));
assert.ok(indexSource.indexOf('friend-challenge.js') < indexSource.indexOf('scripts/game-pacing.js'));
assert.ok(pacingSource.includes('const DEFAULT_SPEED = 15'));
assert.ok(pacingSource.includes("event.code !== 'Space'"));
assert.ok(pacingSource.includes("document.addEventListener('visibilitychange'"));
assert.ok(pacingSource.includes('gameInterval = setInterval(gameTick, TICK_RATE)'));
assert.ok(pacingSource.includes('isPlaying = false'));
assert.ok(pacingSource.includes('isPlaying = true'));

assert.ok(indexSource.includes('local-records.css'));
assert.ok(indexSource.includes('id="personal-profile-summary"'));
assert.ok(indexSource.includes('id="personal-best-result"'));
assert.ok(indexSource.includes('scripts/player-profile.js'));
assert.ok(indexSource.indexOf('card-export.js') < indexSource.indexOf('scripts/player-profile.js'));
assert.ok(profileSource.includes("const STORAGE_KEY = 'flappyk_player_profile_v1'"));
assert.ok(profileSource.includes('window.localStorage.getItem'));
assert.ok(profileSource.includes('window.localStorage.setItem'));
assert.ok(profileSource.includes('lastRecordedSignature'));
assert.ok(profileSource.includes('NEW PERSONAL BEST'));
assert.ok(profileSource.includes('FIRST COMPLETED RUN'));
assert.ok(profileSource.includes('scoreApi?.calculate(collectedCards, finalReturn)'));
assert.ok(profileSource.includes("legendButton?.addEventListener('click', recordCompletedRun)"));
assert.ok(profileCssSource.includes('.local-records-summary'));
assert.ok(profileCssSource.includes('.local-record-result--new'));

assert.equal(legendSource.includes('🦬'), false);
assert.equal(legendSource.includes('installCanvasEmojiMap'), false);
assert.ok(qqqSource.includes('Object.defineProperty(stockData.usstock, QQQ_NAME'));
assert.ok(qqqSource.includes('enumerable: false'));
assert.ok(exportSource.includes('dataset.completedLevel'));
assert.ok(exportSource.includes('FlappyK_Custom_ProfitCard.png'));

assert.ok(indexSource.includes('challenge-share-btn'));
assert.ok(indexSource.includes('>CHALLENGE A FRIEND<'));
assert.ok(indexSource.includes('id="champagne-save-btn">SAVE RESULT'));
assert.ok(indexSource.includes('og-image.png'));
assert.ok(indexSource.includes('og:image:type'));
assert.ok(indexSource.includes('og:image:width'));
assert.ok(indexSource.includes('og:image:height'));
assert.ok(fs.existsSync('og-image.png'));

assert.ok(shareSource.includes('I finished 3 hidden historical markets'));
assert.ok(shareSource.includes('Can you beat me on the same markets?'));
assert.ok(shareSource.includes('navigator.share'));
assert.ok(shareSource.includes('navigator.clipboard.writeText(url)'));
assert.ok(shareSource.includes('Challenge link copied'));
assert.ok(shareSource.includes('FlappyKFriendChallenge?.buildChallengeUrl'));
assert.ok(shareSource.includes('function shareChallengeLink(score)'));
assert.ok(shareSource.includes('FlappyK_Legend_Result.png'));
assert.equal(shareSource.includes('shareData.files'), false);
assert.equal(shareSource.includes('navigator.canShare'), false);
assert.equal(shareSource.includes('new File('), false);
assert.equal(shareSource.includes('TAP TO SHARE'), false);
assert.equal(shareSource.includes('sharePreparedChallenge'), false);
assert.equal(shareSource.includes('preparedChallengeShare'), false);

const challengeHandlerStart = shareSource.indexOf("challengeButton?.addEventListener('click'");
const saveHandlerStart = shareSource.indexOf("saveButton?.addEventListener('click'");
assert.ok(challengeHandlerStart >= 0 && saveHandlerStart > challengeHandlerStart);
const challengeHandler = shareSource.slice(challengeHandlerStart, saveHandlerStart);
assert.ok(challengeHandler.includes('shareChallengeLink(score)'));
assert.equal(challengeHandler.includes('renderLegend'), false);
assert.equal(challengeHandler.includes('canvasToBlob'), false);
assert.equal(challengeHandler.includes('downloadBlob'), false);

assert.ok(indexSource.includes('scripts/friend-challenge-codec.js'));
assert.ok(indexSource.includes('scripts/legend-score.js'));
assert.ok(indexSource.indexOf('scripts/legend-score.js') < indexSource.indexOf('friend-challenge.js'));
assert.ok(indexSource.indexOf('scripts/legend-score.js') < indexSource.indexOf('leaderboard.js'));
assert.ok(indexSource.indexOf('scripts/legend-score.js') < indexSource.indexOf('share-challenge.js'));
assert.ok(scoreSource.includes('FlappyKLegendScore'));
assert.ok(scoreSource.includes('benchmarkGrowth *= (1 + marketReturn)'));
assert.ok(friendSource.includes('const scoreApi = window.FlappyKLegendScore'));
assert.ok(leaderboardSource.includes('const scoreApi = window.FlappyKLegendScore'));
assert.ok(shareSource.includes('const scoreApi = window.FlappyKLegendScore'));

assert.ok(indexSource.includes('friend-challenge.js'));
assert.ok(indexSource.includes('friend-challenge-result'));
assert.ok(friendSource.includes('new URLSearchParams(window.location.search)'));
assert.ok(friendSource.includes('window.location.hash'));
assert.ok(friendSource.includes("url.searchParams.set('challenge'"));
assert.ok(friendSource.includes('SAME 3 HIDDEN MARKETS'));
assert.ok(friendSource.includes('resolveDescriptor'));
assert.ok(friendSource.includes('data.findIndex'));
assert.ok(friendSource.includes('captureNormalDescriptor'));
assert.ok(friendSource.includes('CHALLENGE BACK'));
assert.ok(friendSource.includes('WON BY'));
assert.ok(friendSource.includes('LOST BY'));
assert.ok(friendSource.includes('TIE GAME'));
assert.ok(friendCssSource.includes('.friend-challenge-result--tied'));
assert.equal(friendSource.includes('localStorage'), false);

assert.ok(indexSource.includes('leaderboard-open-btn'));
assert.ok(indexSource.includes('leaderboard-screen'));
assert.ok(indexSource.includes('leaderboard-submit-btn'));
assert.ok(leaderboardSource.includes('TOTAL EXCESS'));
assert.ok(leaderboardSource.includes('scoreApi?.calculate(collectedCards, finalReturn)'));
assert.ok(leaderboardSource.includes('issues/new'));
assert.ok(leaderboardSource.includes('SUBMIT TOP 10'));
assert.ok(leaderboardWorkflow.includes('issues:'));
assert.ok(leaderboardWorkflow.includes('updateTop10'));
assert.ok(leaderboardWorkflow.includes('createOrUpdateFileContents'));

console.log('UI, beat-the-market rule, pacing, local records, sharing, and leaderboard checks passed');
