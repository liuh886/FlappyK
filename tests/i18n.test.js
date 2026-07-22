const assert = require('node:assert/strict');
const fs = require('node:fs');
const i18n = require('../scripts/i18n-core.js');

assert.equal(i18n.normalizeLanguage('zh-CN'), 'zh');
assert.equal(i18n.normalizeLanguage('en-US'), 'en');
assert.equal(i18n.detectLanguage({ storedLanguage: 'en', browserLanguage: 'zh-CN' }), 'en');
assert.equal(i18n.detectLanguage({ storedLanguage: null, browserLanguage: 'zh-CN' }), 'zh');
assert.equal(i18n.detectLanguage({ storedLanguage: null, browserLanguage: 'en-US' }), 'en');

assert.equal(i18n.translateText('PLAY', 'en'), 'PLAY');
assert.equal(i18n.translateText('PLAY', 'zh'), '开始游戏');
assert.equal(i18n.translateText('BEAT THE MARKET', 'zh'), '跑赢市场');
assert.equal(i18n.translateText('PROFIT CARD (2)', 'zh'), '收益卡（2）');
assert.equal(i18n.translateText('DAILY RUN · 2026-07-22', 'zh'), '每日挑战 · 2026-07-22');
assert.equal(i18n.translateText('DAILY STREAK 4', 'zh'), '连续挑战 4 天');
assert.equal(i18n.translateText('YOU +12.34%', 'zh'), '你：+12.34%');
assert.equal(i18n.translateText('WON BY +3.20%', 'zh'), '领先 +3.20%');
assert.equal(i18n.translateText('+8.88% EXCESS', 'zh'), '+8.88% 超额收益');
assert.equal(i18n.translateText('Return to home', 'zh'), '返回首页');
assert.equal(
    i18n.translateText('Exit this run and return to home? Current progress will be lost.', 'zh'),
    '退出当前游戏并返回首页？当前进度将丢失。'
);
assert.equal(
    i18n.translateText('I finished 3 hidden historical markets with +8.88% Excess. Can you beat me on the same markets?', 'zh'),
    '我完成了 3 个隐藏历史市场，超额收益为 +8.88%。你能在相同行情中击败我吗？'
);
assert.equal(i18n.translateText('Unknown asset name', 'zh'), 'Unknown asset name');

const indexSource = fs.readFileSync('index.html', 'utf8');
const browserSource = fs.readFileSync('scripts/i18n.js', 'utf8');
const cssSource = fs.readFileSync('i18n.css', 'utf8');
const visualSource = fs.readFileSync('visual-polish.css', 'utf8');

assert.ok(indexSource.includes('i18n.css'));
assert.ok(indexSource.includes('scripts/i18n-core.js'));
assert.ok(indexSource.includes('scripts/i18n.js'));
assert.ok(indexSource.indexOf('scripts/i18n.js') < indexSource.indexOf('game.js'));
assert.ok(browserSource.includes("const language = core.detectLanguage"));
assert.ok(browserSource.includes("window.localStorage.setItem(core.STORAGE_KEY"));
assert.ok(browserSource.includes("button.id = 'language-toggle-btn'"));
assert.ok(browserSource.includes('new MutationObserver'));
assert.ok(browserSource.includes('patchNativeShare'));
assert.ok(cssSource.startsWith("@import url('./visual-polish.css');"));
assert.ok(cssSource.includes('--font-zh-ui'));
assert.ok(cssSource.includes("'PingFang SC'"));
assert.ok(cssSource.includes("'Microsoft YaHei UI'"));
assert.ok(cssSource.includes("'Noto Sans CJK SC'"));
assert.ok(cssSource.includes("html[lang='zh-CN'] #game-title"));
assert.ok(cssSource.includes('font-family: var(--font-zh-ui)'));
assert.ok(cssSource.includes('font-family: var(--font-numeric)'));
assert.ok(cssSource.includes('border-radius: 999px'));
assert.equal(
    cssSource.includes("font-family: 'Press Start 2P', 'Noto Sans SC'"),
    false,
    'Chinese UI must not force the pixel font before CJK fallbacks'
);
assert.ok(visualSource.includes('--ui-panel'));
assert.ok(visualSource.includes('.card-details {'));
assert.ok(visualSource.includes('display: grid'));
assert.ok(visualSource.includes('.card-details p {'));
assert.ok(visualSource.includes('justify-content: space-between'));
assert.ok(visualSource.includes(':focus-visible'));
assert.ok(visualSource.includes('backdrop-filter: blur(8px)'));

console.log('Chinese-English i18n, typography, and visual polish checks passed');
