(() => {
    'use strict';

    const root = document.documentElement;
    const startScreen = document.getElementById('start-screen');
    const canvas = document.getElementById('home-market-canvas');
    const coinsDisplay = document.getElementById('home-demo-coins');
    const sharesDisplay = document.getElementById('home-demo-shares');
    const feedback = document.getElementById('home-market-feedback');
    const buyButton = document.getElementById('home-demo-buy');
    const sellButton = document.getElementById('home-demo-sell');

    if (!startScreen || !canvas || !coinsDisplay || !sharesDisplay) return;

    const context = canvas.getContext('2d', { alpha: true });
    const TRADE_NOTIONAL = 1000;
    const TRADE_FEE = 1;
    const MAX_CANDLES = 42;
    const TICK_MS = 1150;
    const copy = {
        en: {
            kicker: 'LIVE DEMO · USE ↑ / ↓',
            tagline: 'Read the tape. Trade the moments that matter.',
            insightTitle: '250 DAYS · A FEW DECISIVE TRADES',
            insightBody: 'Most of the game is waiting. That is the point.',
            coins: 'COINS',
            shares: 'STOCK',
            buy: '↑ BUY',
            sell: '↓ SELL',
            keyboard: 'KEYBOARD: ↑ BUY · ↓ SELL',
            play: 'PLAY',
            daily: 'DAILY RUN',
            rankings: 'RANKINGS',
            bought: 'BOUGHT',
            sold: 'SOLD',
            noCoins: 'NOT ENOUGH COINS',
            noStock: 'NO STOCK TO SELL',
            gameCash: 'COINS',
        },
        zh: {
            kicker: '实时试玩 · 使用 ↑ / ↓',
            tagline: '像看盘一样读行情，只在关键时刻出手。',
            insightTitle: '250 天 · 真正决定结果的只有寥寥几笔',
            insightBody: '大多数时间都在等待——这正是游戏想告诉你的。',
            coins: '金币',
            shares: '股票',
            buy: '↑ 买入',
            sell: '↓ 卖出',
            keyboard: '键盘：↑ 买入 · ↓ 卖出',
            play: '开始游戏',
            daily: '每日挑战',
            rankings: '排行榜',
            bought: '买入',
            sold: '卖出',
            noCoins: '金币不足',
            noStock: '没有可卖股票',
            gameCash: '金币',
        },
    };

    let seed = 0x4f21a9c3;
    let candles = [];
    let coins = 10000;
    let shares = 0;
    let currentPrice = 100;
    let tickTimer = 0;
    let feedbackTimer = 0;
    let lastAction = null;
    let cssWidth = 0;
    let cssHeight = 0;

    function isChinese() {
        return root.dataset.flappykLanguage === 'zh'
            || root.lang.toLowerCase().startsWith('zh');
    }

    function currentCopy() {
        return isChinese() ? copy.zh : copy.en;
    }

    function random() {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
    }

    function makeCandle(previousClose, index) {
        const cycle = Math.sin(index * 0.42) * 0.008;
        const drift = 0.0018 + cycle + ((random() - 0.5) * 0.024);
        const open = previousClose * (1 + ((random() - 0.5) * 0.008));
        const close = Math.max(34, open * (1 + drift));
        const wick = 0.006 + (random() * 0.018);
        return {
            open,
            close,
            high: Math.max(open, close) * (1 + wick),
            low: Math.min(open, close) * (1 - (wick * 0.82)),
        };
    }

    function resetTape() {
        candles = [];
        let close = 88;
        for (let index = 0; index < MAX_CANDLES; index += 1) {
            const candle = makeCandle(close, index);
            candles.push(candle);
            close = candle.close;
        }
        currentPrice = candles.at(-1).close;
    }

    function appendCandle() {
        const previousClose = candles.at(-1)?.close || currentPrice;
        const candle = makeCandle(previousClose, candles.length + 17);
        candles.push(candle);
        if (candles.length > MAX_CANDLES) candles.shift();
        currentPrice = candle.close;
        draw();
    }

    function formatCoins(value) {
        return new Intl.NumberFormat(isChinese() ? 'zh-CN' : 'en-US', {
            maximumFractionDigits: 0,
        }).format(Math.max(0, value));
    }

    function formatShares(value) {
        return new Intl.NumberFormat(isChinese() ? 'zh-CN' : 'en-US', {
            minimumFractionDigits: value > 0 ? 1 : 0,
            maximumFractionDigits: 1,
        }).format(Math.max(0, value));
    }

    function updateResources() {
        coinsDisplay.textContent = formatCoins(coins);
        sharesDisplay.textContent = formatShares(shares);
    }

    function showFeedback(message, tone) {
        if (!feedback) return;
        window.clearTimeout(feedbackTimer);
        feedback.textContent = message;
        feedback.dataset.tone = tone;
        feedback.classList.remove('is-visible');
        void feedback.offsetWidth;
        feedback.classList.add('is-visible');
        feedbackTimer = window.setTimeout(() => {
            feedback.classList.remove('is-visible');
        }, 660);
    }

    function trade(type) {
        if (!startScreen.classList.contains('active')) return;
        const text = currentCopy();

        if (type === 'buy') {
            if (coins < TRADE_NOTIONAL + TRADE_FEE) {
                showFeedback(text.noCoins, 'sell');
                return;
            }
            const quantity = TRADE_NOTIONAL / currentPrice;
            coins -= TRADE_NOTIONAL + TRADE_FEE;
            shares += quantity;
            lastAction = { type, at: performance.now() };
            showFeedback(`${text.bought} +${formatShares(quantity)}`, 'buy');
        } else {
            const positionValue = shares * currentPrice;
            if (positionValue <= TRADE_FEE) {
                showFeedback(text.noStock, 'sell');
                return;
            }
            const notional = Math.min(TRADE_NOTIONAL, positionValue);
            const quantity = notional / currentPrice;
            shares = Math.max(0, shares - quantity);
            coins += notional - TRADE_FEE;
            lastAction = { type, at: performance.now() };
            showFeedback(`${text.sold} −${formatShares(quantity)}`, 'sell');
        }

        updateResources();
        draw();
    }

    function depthY(depth, horizon, floorBottom) {
        return horizon + (Math.pow(depth, 1.72) * (floorBottom - horizon));
    }

    function drawFloor(width, height, horizon, floorBottom, vanishingX) {
        context.save();
        context.lineWidth = 1;
        context.strokeStyle = 'rgba(99, 220, 233, 0.11)';

        for (let ray = -4; ray <= 7; ray += 1) {
            const bottomX = (ray / 5) * width;
            context.beginPath();
            context.moveTo(vanishingX, horizon);
            context.lineTo(bottomX, floorBottom);
            context.stroke();
        }

        for (let line = 1; line <= 11; line += 1) {
            const depth = line / 11;
            const y = depthY(depth, horizon, floorBottom);
            const spread = width * (0.08 + (depth * 0.76));
            context.globalAlpha = 0.3 + (depth * 0.7);
            context.beginPath();
            context.moveTo(vanishingX - spread, y);
            context.lineTo(vanishingX + spread, y);
            context.stroke();
        }
        context.restore();
    }

    function drawCandles(width, height, horizon, floorBottom) {
        if (!candles.length) return;
        const lows = candles.map((candle) => candle.low);
        const highs = candles.map((candle) => candle.high);
        const minimum = Math.min(...lows);
        const maximum = Math.max(...highs);
        const range = Math.max(1, maximum - minimum);
        const mid = (minimum + maximum) / 2;
        const startX = width * 0.23;
        const endX = width * 0.9;

        candles.forEach((candle, index) => {
            const depth = (index + 1) / candles.length;
            const scale = 0.18 + (depth * 0.92);
            const ground = depthY(depth, horizon, floorBottom);
            const x = startX + (Math.pow(depth, 1.18) * (endX - startX));
            const priceScale = height * 0.31 * scale;
            const priceY = (price) => ground - (((price - mid) / range) * priceScale) - (height * 0.12 * scale);
            const openY = priceY(candle.open);
            const closeY = priceY(candle.close);
            const highY = priceY(candle.high);
            const lowY = priceY(candle.low);
            const isUp = candle.close >= candle.open;
            const bodyWidth = Math.max(2, 8 * scale);
            const bodyHeight = Math.max(2, Math.abs(closeY - openY));
            const alpha = 0.22 + (depth * 0.7);
            const color = isUp ? `rgba(85, 224, 148, ${alpha})` : `rgba(255, 114, 114, ${alpha})`;

            context.save();
            context.strokeStyle = color;
            context.fillStyle = color;
            context.lineWidth = Math.max(1, 1.6 * scale);
            if (index === candles.length - 1) {
                context.shadowColor = isUp ? '#55e094' : '#ff7272';
                context.shadowBlur = 12;
            }
            context.beginPath();
            context.moveTo(x, highY);
            context.lineTo(x, lowY);
            context.stroke();
            context.fillRect(
                x - (bodyWidth / 2),
                Math.min(openY, closeY),
                bodyWidth,
                bodyHeight,
            );
            context.restore();
        });

        if (lastAction && performance.now() - lastAction.at < 1300) {
            const candle = candles.at(-1);
            const depth = 1;
            const ground = depthY(depth, horizon, floorBottom);
            const x = endX;
            const priceScale = height * 0.31 * 1.1;
            const priceY = ground - (((candle.close - mid) / range) * priceScale) - (height * 0.132);
            const elapsed = Math.min(1, (performance.now() - lastAction.at) / 1300);
            const radius = 10 + (elapsed * 26);
            context.save();
            context.strokeStyle = lastAction.type === 'buy'
                ? `rgba(85, 224, 148, ${1 - elapsed})`
                : `rgba(255, 114, 114, ${1 - elapsed})`;
            context.lineWidth = 3;
            context.beginPath();
            context.arc(x, priceY, radius, 0, Math.PI * 2);
            context.stroke();
            context.restore();
            window.requestAnimationFrame(draw);
        }
    }

    function draw() {
        if (!context || cssWidth <= 0 || cssHeight <= 0) return;
        context.clearRect(0, 0, cssWidth, cssHeight);

        const horizon = cssHeight * 0.27;
        const floorBottom = cssHeight * 1.02;
        const vanishingX = cssWidth * 0.58;

        const sky = context.createLinearGradient(0, 0, 0, cssHeight);
        sky.addColorStop(0, 'rgba(7, 16, 27, 0.1)');
        sky.addColorStop(0.28, 'rgba(11, 38, 49, 0.34)');
        sky.addColorStop(1, 'rgba(2, 7, 12, 0.72)');
        context.fillStyle = sky;
        context.fillRect(0, 0, cssWidth, cssHeight);

        drawFloor(cssWidth, cssHeight, horizon, floorBottom, vanishingX);
        drawCandles(cssWidth, cssHeight, horizon, floorBottom);
    }

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const ratio = Math.min(2, window.devicePixelRatio || 1);
        cssWidth = rect.width;
        cssHeight = rect.height;
        canvas.width = Math.round(rect.width * ratio);
        canvas.height = Math.round(rect.height * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        draw();
    }

    function stopTicker() {
        window.clearInterval(tickTimer);
        tickTimer = 0;
    }

    function syncTicker() {
        const active = startScreen.classList.contains('active') && !document.hidden;
        if (!active) {
            stopTicker();
            return;
        }
        if (!tickTimer) tickTimer = window.setInterval(appendCandle, TICK_MS);
        resizeCanvas();
    }

    function syncCopy() {
        const text = currentCopy();
        document.querySelectorAll('[data-home-copy]').forEach((element) => {
            const key = element.dataset.homeCopy;
            const challengeOwnsPrimaryAction = key === 'play'
                && Boolean(document.getElementById('friend-challenge-invite'));
            if (!challengeOwnsPrimaryAction && text[key]) element.textContent = text[key];
        });
        updateResources();
        const cashRow = document.querySelector('.hud-cash-resource');
        if (cashRow) {
            cashRow.setAttribute('aria-label', text.gameCash);
            const label = cashRow.querySelector('.hud-resource-label span:last-child');
            if (label) label.textContent = text.gameCash;
        }
    }

    function promoteGameCashResource() {
        const cashDisplay = document.getElementById('cash-display');
        const stats = document.querySelector(".stats-box[data-composition='returns-only']");
        if (!cashDisplay || !stats) return false;
        const row = cashDisplay.closest('.hud-stat-row') || cashDisplay.parentElement;
        if (!row) return false;
        if (row.classList.contains('hud-cash-resource')) return true;

        const label = document.createElement('span');
        label.className = 'hud-resource-label';
        const glyph = document.createElement('span');
        glyph.className = 'resource-glyph resource-glyph--coin';
        glyph.setAttribute('aria-hidden', 'true');
        const labelText = document.createElement('span');
        label.append(glyph, labelText);

        row.className = 'hud-stat-row hud-cash-resource';
        row.replaceChildren(label, cashDisplay);
        stats.appendChild(row);
        syncCopy();
        return true;
    }

    function installGameCashResource() {
        let attempts = 0;
        const tryInstall = () => {
            attempts += 1;
            if (promoteGameCashResource() || attempts >= 20) return;
            window.requestAnimationFrame(tryInstall);
        };
        tryInstall();
    }

    buyButton?.addEventListener('click', () => trade('buy'));
    sellButton?.addEventListener('click', () => trade('sell'));

    window.addEventListener('keydown', (event) => {
        if (!startScreen.classList.contains('active')) return;
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            trade('buy');
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            trade('sell');
        }
    }, { passive: false });

    new MutationObserver(() => {
        syncTicker();
    }).observe(startScreen, { attributes: true, attributeFilter: ['class'] });

    new MutationObserver(syncCopy).observe(root, {
        attributes: true,
        attributeFilter: ['lang', 'data-flappyk-language'],
    });

    document.addEventListener('visibilitychange', syncTicker);
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', resizeCanvas);
    new ResizeObserver(resizeCanvas).observe(canvas);

    resetTape();
    updateResources();
    syncCopy();
    installGameCashResource();
    syncTicker();

    window.FlappyKHomeMarket = {
        trade,
        resetTape,
        draw,
        get state() {
            return { coins, shares, currentPrice };
        },
    };
})();
