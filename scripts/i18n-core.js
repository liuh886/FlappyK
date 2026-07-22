(function exposeI18nCore(root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.FlappyKI18nCore = api;
    }
})(typeof window !== 'undefined' ? window : globalThis, () => {
    'use strict';

    const STORAGE_KEY = 'flappyk_language_v1';
    const SUPPORTED_LANGUAGES = ['en', 'zh'];

    const zh = {
        'FlappyK — Can You Beat a Hidden Market?': 'FlappyK — 你能跑赢隐藏市场吗？',
        'Trade three unknown historical markets and rank by Excess Return.': '交易三段未知历史行情，并按超额收益排名。',
        'Friend Challenge · FlappyK': '好友挑战 · FlappyK',
        'GAME:': '局数：',
        'DAY:': '交易日：',
        'CASH:': '现金：',
        'ASSET:': '持仓：',
        'TOTAL:': '总资产：',
        'RETURN:': '收益：',
        'GOAL:': '目标：',
        'UP': '上',
        'DOWN': '下',
        'BUY $1K · $1 FEE': '买入 $1K · 手续费 $1',
        'SELL $1K · $1 FEE': '卖出 $1K · 手续费 $1',
        'SPEED:': '速度：',
        'Trade 3 hidden historical markets.': '交易三段隐藏的历史行情。',
        'Beat the market to pass each game.': '每一局都必须跑赢市场才能通关。',
        'PLAY': '开始游戏',
        'DAILY RUN': '每日挑战',
        'REPLAY DAILY': '重玩今日挑战',
        'DAILY UNAVAILABLE': '今日挑战不可用',
        'LEADERBOARD': '排行榜',
        'YOUR BEST': '个人最佳',
        'SAME MARKETS FOR EVERYONE': '所有玩家面对相同行情',
        'REAL HISTORICAL K-LINES': '真实历史 K 线',
        'EXCESS TOP 10': '超额收益 TOP 10',
        'GLOBAL · HONOR-BASED · ONE BEST SCORE PER GITHUB PLAYER': '全球榜 · 荣誉制 · 每位 GitHub 玩家保留一个最佳成绩',
        'LOADING TOP 10...': '正在加载 TOP 10…',
        'BACK': '返回',
        'SECRET MODE UNLOCKED': '隐藏模式已解锁',
        'CUSTOM CHALLENGE': '自定义挑战',
        'Choose a market and asset. The 250-day window stays hidden.': '选择市场和标的，250 个交易日的窗口仍然隐藏。',
        'MARKET': '市场',
        'ASSET': '标的',
        'START CUSTOM': '开始自定义挑战',
        'FIRST RUN': '首次游戏',
        'BEAT THE MARKET': '跑赢市场',
        'BUY OR SELL $1K WHILE THE 250-DAY CHART MOVES.': '在 250 个交易日的行情播放中，每次买入或卖出 $1K。',
        'THE ASSET AND HISTORICAL PERIOD STAY HIDDEN UNTIL SETTLEMENT.': '标的名称和历史时期会一直隐藏到结算。',
        'PLAYER RETURN MUST BE HIGHER THAN MARKET RETURN. POSITIVE EXCESS PASSES.': '玩家收益必须高于市场收益；只有正超额收益才能通关。',
        'CRYPTO · A-SHARES · US STOCKS': '加密资产 · A 股 · 美股',
        'GOT IT · START': '明白了 · 开始',
        'PROFIT CARD': '收益卡',
        'STARTING:': '起始资金：',
        'FINAL:': '最终资金：',
        'PERIOD:': '时期：',
        'PLAYER RETURN:': '玩家收益：',
        'MARKET RETURN:': '市场收益：',
        'EXCESS:': '超额收益：',
        'TOTAL RETURN': '累计收益',
        'NEXT LEVEL': '下一局',
        'POP CHAMPAGNE 🍾': '开启庆祝 🍾',
        'SAVE CARD': '保存卡片',
        'TRY AGAIN': '重新挑战',
        'RETRY WINDOW': '重玩本窗口',
        'CHANGE ASSET': '更换标的',
        'BUY': '买入',
        'SELL': '卖出',
        'MARKET LEGEND 🍾': '市场传奇 🍾',
        '3 MARKETS CONQUERED': '已征服 3 个市场',
        'CHALLENGE A FRIEND': '挑战好友',
        'SAVE RESULT': '保存成绩',
        'SUBMIT TOP 10': '提交 TOP 10',
        'PLAY AGAIN': '再玩一轮',
        'SUPPORT FLAPPYK': '支持 FLAPPYK',
        'MARKET BEATEN!': '成功跑赢市场！',
        'MARKET WON.': '本局市场获胜。',
        'SUCCESS!': '成功！',
        'DAILY · BEAT THE MARKET': '每日挑战 · 跑赢市场',
        'FRIEND CHALLENGE': '好友挑战',
        'SAME 3 HIDDEN MARKETS · SAME 250-DAY WINDOWS': '相同的 3 个隐藏市场 · 相同的 250 日窗口',
        'LEGACY SNAPSHOT · RESTORED BY ASSET + DATE': '旧版数据快照 · 已按标的和日期恢复',
        'PLAY CHALLENGE': '接受挑战',
        'CHALLENGE BACK': '反向挑战',
        'TIE GAME': '平局',
        'NO SCORES YET · BE THE FIRST': '暂无成绩 · 成为第一位玩家',
        'RANKED BY TOTAL EXCESS · ONE BEST SCORE PER PLAYER': '按累计超额收益排名 · 每位玩家保留一个最佳成绩',
        'LEADERBOARD TEMPORARILY UNAVAILABLE': '排行榜暂时不可用',
        'SUBMIT SCORE': '提交成绩',
        'OPEN SLOT': '仍有空位',
        'CHECKING TOP 10...': '正在检查 TOP 10…',
        'GITHUB OPENED': '已打开 GITHUB',
        'CONFIRM THE PREFILLED ISSUE · ONLY FINAL TOP 10 SCORES ARE STORED': '请确认预填 Issue · 仅最终 TOP 10 成绩会被保存',
        'NEW DAILY BEST': '刷新今日最佳',
        'DAILY RUN COMPLETE': '每日挑战完成',
        'NEW PERSONAL BEST': '刷新个人最佳',
        'PERSONAL RECORD': '个人纪录',
        'FIRST COMPLETED RUN': '首次完成三局挑战',
        'SHARING...': '正在分享…',
        'SAVING...': '正在保存…',
        'FlappyK — Friend Challenge': 'FlappyK — 好友挑战',
        'CRYPTO': '加密资产',
        'A-SHARES': 'A 股',
        'US STOCKS': '美股',
        'CUSTOM CARD': '自定义收益卡',
        'MAX DD:': '最大回撤：',
        'LVL RETURN:': '本局收益：',
        '(CUMULATIVE RETURN)': '（累计收益）',
        'Pause game': '暂停游戏',
        'Resume game': '继续游戏',
        'Return to home': '返回首页',
        'Exit this run and return to home? Current progress will be lost.': '退出当前游戏并返回首页？当前进度将丢失。',
        'Buy one thousand dollars': '买入一千美元',
        'Sell one thousand dollars': '卖出一千美元',
        'Real historical K-lines': '真实历史 K 线',
        '3 markets conquered': '已征服 3 个市场',
        'Support FlappyK on Ko-fi': '在 Ko-fi 上支持 FlappyK',
        'ACCESS CODE': '访问口令',
        'This asset does not have enough data for a 250-day challenge.': '该标的数据不足，无法生成 250 个交易日的挑战。',
        'This friend challenge is invalid or no longer matches the bundled market snapshot.': '该好友挑战无效，或已无法匹配当前行情数据快照。',
        'This friend challenge could not be restored. A new random run will start instead.': '无法恢复该好友挑战，将改为开始一轮新的随机游戏。',
        'Today’s Daily Run is unavailable for the current market snapshot.': '当前行情数据快照无法生成今日挑战。',
        'Today’s Daily Run could not be restored. A random run will start instead.': '无法恢复今日挑战，将改为开始一轮随机游戏。',
        'Challenge link copied. Send it to a friend to play the same 3 hidden markets.': '挑战链接已复制。发送给好友，即可挑战相同的 3 个隐藏市场。',
        'Copy this friend challenge link:': '复制好友挑战链接：',
        'The challenge link could not be prepared. Please try again.': '无法生成挑战链接，请重试。',
        'Copy this challenge link:': '复制挑战链接：'
    };

    const zhPatterns = [
        [/^PROFIT CARD \((\d+)\)$/, (_, value) => `收益卡（${value}）`],
        [/^DAILY RUN · (\d{4}-\d{2}-\d{2})$/, (_, date) => `每日挑战 · ${date}`],
        [/^Daily Run (\d{4}-\d{2}-\d{2}) · FlappyK$/, (_, date) => `每日挑战 ${date} · FlappyK`],
        [/^TODAY (.+%)$/, (_, score) => `今日 ${score}`],
        [/^DAILY STREAK (\d+)$/, (_, count) => `连续挑战 ${count} 天`],
        [/^RUNS (\d+)$/, (_, count) => `完成 ${count} 轮`],
        [/^BEAT (.+%) EXCESS$/, (_, score) => `击败 ${score} 超额收益`],
        [/^YOU (.+%)$/, (_, score) => `你：${score}`],
        [/^TARGET (.+%)$/, (_, score) => `目标：${score}`],
        [/^WON BY (.+%)$/, (_, score) => `领先 ${score}`],
        [/^LOST BY (.+%)$/, (_, score) => `落后 ${score}`],
        [/^(.+%) EXCESS$/, (_, score) => `${score} 超额收益`],
        [/^IMPROVED BY (.+%) · STREAK (\d+)$/, (_, score, streak) => `提升 ${score} · 连续 ${streak} 天`],
        [/^IMPROVED BY (.+%)$/, (_, score) => `提升 ${score}`],
        [/^UTC (\d{4}-\d{2}-\d{2}) · STREAK (\d+)$/, (_, date, streak) => `UTC ${date} · 连续 ${streak} 天`],
        [/^BEST (.+%) · RUN (\d+)$/, (_, score, run) => `最佳 ${score} · 第 ${run} 轮`],
        [/^(.+%) EXCESS · GITHUB WILL VERIFY TOP 10$/, (_, score) => `${score} 超额收益 · GitHub 将核验 TOP 10`],
        [/^(.+%) EXCESS · (.+%) CUT$/, (_, score, cut) => `${score} 超额收益 · 门槛 ${cut}`],
        [/^(.+%) EXCESS · OPEN SLOT$/, (_, score) => `${score} 超额收益 · 仍有空位`],
        [/^(.+%) EXCESS · TOP 10 CUT (.+%)$/, (_, score, cut) => `${score} 超额收益 · TOP 10 门槛 ${cut}`],
        [/^I finished 3 hidden historical markets with (.+%) Excess\. Can you beat me on the same markets\?$/, (_, score) => `我完成了 3 个隐藏历史市场，超额收益为 ${score}。你能在相同行情中击败我吗？`],
        [/^Pause \[Space\]$/, () => '暂停 [空格键]'],
        [/^Resume \[Space\]$/, () => '继续 [空格键]']
    ];

    function normalizeLanguage(value) {
        const language = String(value || '').trim().toLowerCase();
        if (language.startsWith('zh')) return 'zh';
        return 'en';
    }

    function detectLanguage({ storedLanguage, browserLanguage } = {}) {
        if (SUPPORTED_LANGUAGES.includes(String(storedLanguage || '').toLowerCase())) {
            return String(storedLanguage).toLowerCase();
        }
        return normalizeLanguage(browserLanguage);
    }

    function translateText(value, language = 'en') {
        const text = String(value ?? '');
        if (normalizeLanguage(language) !== 'zh' || !text) return text;
        if (Object.prototype.hasOwnProperty.call(zh, text)) return zh[text];
        for (const [pattern, replacer] of zhPatterns) {
            if (pattern.test(text)) return text.replace(pattern, replacer);
        }
        return text;
    }

    return {
        STORAGE_KEY,
        SUPPORTED_LANGUAGES,
        normalizeLanguage,
        detectLanguage,
        translateText,
    };
});
