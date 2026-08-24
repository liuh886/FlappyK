const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.getElementById('game-container');

let canvasCssWidth = 1;
let canvasCssHeight = 1;

function resizeCanvas() {
    gameContainer.style.width = '100vw';
    gameContainer.style.height = '100dvh';
    gameContainer.style.border = 'none';
    gameContainer.style.boxShadow = 'none';

    const fallbackHeight = window.matchMedia("(max-width: 768px)").matches
        ? window.innerHeight * 0.6
        : window.innerHeight;
    const cssWidth = Math.max(1, Math.round(canvas.clientWidth || window.innerWidth));
    const cssHeight = Math.max(1, Math.round(canvas.clientHeight || fallbackHeight));
    const dpr = Math.max(1, Number(window.devicePixelRatio) || 1);

    canvasCssWidth = cssWidth;
    canvasCssHeight = cssHeight;
    const backingWidth = Math.round(cssWidth * dpr);
    const backingHeight = Math.round(cssHeight * dpr);
    if (canvas.width !== backingWidth) canvas.width = backingWidth;
    if (canvas.height !== backingHeight) canvas.height = backingHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (typeof isPlaying !== 'undefined' && isPlaying) draw();
}

// Game Config
const INITIAL_CASH = 10000;
const TRADE_AMOUNT = 1000;
const FEE = 1; // $1 fee per transaction
const DAYS_PER_LEVEL = 250;
const VISIBLE_DAYS = 50; // Scroll view width
let TICK_RATE = 1000;
let speedMultiplier = 5;

// Check if mobile for default speed
if (window.matchMedia && window.matchMedia("(max-width: 768px)").matches) {
    speedMultiplier = 10;
    TICK_RATE = 500;
}

let level = 1;
let targetReturn = 0; // The return to beat
let currentAsset = "";
let currentMarket = "crypto";
let currentData = [];
let dayIndex = 0;
let cash = INITIAL_CASH;
let shares = 0;
let totalHistory = [];
let actions = [];
let collectedCards = [];
let gameInterval;
let isPlaying = false;

window.addEventListener('resize', resizeCanvas, { passive: true });
window.addEventListener('orientationchange', resizeCanvas, { passive: true });
new ResizeObserver(resizeCanvas).observe(canvas);

// Set initial size
resizeCanvas();
let currentPrice = 0;
let levelStartCash = INITIAL_CASH;

// UI Elements
const levelDisp = document.getElementById('level-display');
const dayDisp = document.getElementById('day-display');
const cashDisp = document.getElementById('cash-display');
const assetDisp = document.getElementById('asset-display');
const totalDisp = document.getElementById('total-display');
const returnDisp = document.getElementById('return-display');
const targetDisp = document.getElementById('target-return-display');

const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const speedBtn = document.getElementById('speed-btn');

const settlementScreen = document.getElementById('settlement-screen');
const nextBtn = document.getElementById('next-level-btn');
const champagneBtn = document.getElementById('champagne-btn');
const saveBtn = document.getElementById('save-card-btn');
const restartBtn = document.getElementById('restart-btn');

const champagneScreen = document.getElementById('champagne-screen');
const champagneExportArea = document.getElementById('champagne-export-area');
const champagneSaveBtn = document.getElementById('champagne-save-btn');
const champagneRestartBtn = document.getElementById('champagne-restart-btn');
const soundToggleBtn = document.getElementById('sound-toggle-btn');

// Audio Context
let audioCtx;
let nextNoteTime = 0;
let audioTimerID;
const melody = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63]; // C E G C G E
let noteIndex = 0;

function scheduleAudio() {
    if (!isPlaying) return;
    // Melody tempo follows playback speed: 15x keeps the classic 200ms step.
    const noteInterval = Math.min(0.32, Math.max(0.12, 0.32 - speedMultiplier * 0.008));
    while (nextNoteTime < audioCtx.currentTime + 0.1) {
        if (!soundMuted) {
            // Play note
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.value = melody[noteIndex];
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start(nextNoteTime);
            gain.gain.setValueAtTime(0.05, nextNoteTime);
            gain.gain.exponentialRampToValueAtTime(0.001, nextNoteTime + 0.15);
            osc.stop(nextNoteTime + 0.2);
        }

        // Advance time and note
        nextNoteTime += noteInterval;
        noteIndex = (noteIndex + 1) % melody.length;
    }
    audioTimerID = requestAnimationFrame(scheduleAudio);
}

function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function startAudio() {
    if (!audioCtx) initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    cancelAnimationFrame(audioTimerID);
    nextNoteTime = audioCtx.currentTime + 0.1;
    scheduleAudio();
}

function stopAudio() {
    cancelAnimationFrame(audioTimerID);
}

const SOUND_MUTED_KEY = 'flappyk_sound_muted_v1';
let soundMuted = false;
try {
    soundMuted = window.localStorage?.getItem(SOUND_MUTED_KEY) === '1';
} catch (error) {
    soundMuted = false;
}

function applySoundControl() {
    if (!soundToggleBtn) return;
    soundToggleBtn.textContent = soundMuted ? '🔇' : '🔊';
    soundToggleBtn.setAttribute('aria-pressed', String(soundMuted));
    soundToggleBtn.setAttribute('aria-label', soundMuted ? 'Unmute sound' : 'Mute sound');
    soundToggleBtn.setAttribute('title', soundMuted ? 'Unmute [M]' : 'Mute [M]');
}

function setSoundMuted(muted) {
    const next = Boolean(muted);
    if (next === soundMuted && soundToggleBtn?.getAttribute('aria-pressed') === String(next)) return;
    soundMuted = next;
    try {
        window.localStorage?.setItem(SOUND_MUTED_KEY, soundMuted ? '1' : '0');
    } catch (error) {
        // Storage failures must never block gameplay.
    }
    applySoundControl();
    window.FlappyKEvents?.emit?.('flappyk:sound-changed', { muted: soundMuted });
}

function toggleSound() {
    setSoundMuted(!soundMuted);
}

// ---------- GameController kernel ----------
// One authoritative lifecycle. Feature modules subscribe instead of wrapping
// globals, so behaviour no longer depends on script load order.
const CONTROLLER_HOOKS = {
    'level-will-start': window.FlappyKEvents?.EVENTS?.LEVEL_WILL_START || 'flappyk:level-will-start',
    'level-did-start': window.FlappyKEvents?.EVENTS?.LEVEL_DID_START || 'flappyk:level-did-start',
    'tick': window.FlappyKEvents?.EVENTS?.TICK || 'flappyk:tick',
    'trade': window.FlappyKEvents?.EVENTS?.TRADE || 'flappyk:trade',
    'level-will-settle': window.FlappyKEvents?.EVENTS?.LEVEL_WILL_SETTLE || 'flappyk:level-will-settle',
    'level-did-settle': window.FlappyKEvents?.EVENTS?.LEVEL_SETTLED || 'flappyk:level-settled',
    // Local-only: fired once per resolution with the authoritative market window.
    'data-resolved': null,
};
const hookBuckets = Object.fromEntries(Object.keys(CONTROLLER_HOOKS).map((name) => [name, []]));

function emitHook(event, detail) {
    for (const handler of hookBuckets[event].slice()) {
        try {
            handler(detail);
        } catch (error) {
            console.error(`FlappyK hook ${event} failed:`, error);
        }
    }
    const busType = CONTROLLER_HOOKS[event];
    if (busType) window.FlappyKEvents?.emit?.(busType, detail);
}

const DATA_SOURCE_PRIORITY = { daily: 40, friend: 30, custom: 20 };
const dataSources = new Map();

window.FlappyKGameController = {
    HOOKS: Object.freeze(Object.keys(CONTROLLER_HOOKS)),
    on(event, handler) {
        if (!Object.prototype.hasOwnProperty.call(hookBuckets, event)) {
            throw new TypeError(`Unknown FlappyK lifecycle hook: ${event}`);
        }
        if (typeof handler !== 'function') {
            throw new TypeError('A FlappyK lifecycle handler must be a function');
        }
        hookBuckets[event].push(handler);
        return () => {
            const index = hookBuckets[event].indexOf(handler);
            if (index >= 0) hookBuckets[event].splice(index, 1);
        };
    },
    registerDataSource({ id, mode, provide }) {
        if (typeof id !== 'string' || id.length === 0) {
            throw new TypeError('A FlappyK data source requires a stable id');
        }
        if (!(mode in DATA_SOURCE_PRIORITY)) {
            throw new TypeError(`Unknown FlappyK data source mode: ${mode}`);
        }
        if (typeof provide !== 'function') {
            throw new TypeError('A FlappyK data source requires a provide(level) function');
        }
        const entry = { id, mode, priority: DATA_SOURCE_PRIORITY[mode], provide };
        dataSources.set(id, entry);
        return () => dataSources.delete(id);
    },
    playSfx(kind) {
        playActionSound(kind);
    },
};

function changeSpeed(delta) {
    const previousSpeed = speedMultiplier;
    speedMultiplier += delta;
    if (speedMultiplier < 1) speedMultiplier = 1;
    if (speedMultiplier > 20) speedMultiplier = 20;

    TICK_RATE = 5000 / speedMultiplier;
    speedBtn.innerText = `${speedMultiplier}x [←/→]`;

    if (speedMultiplier !== previousSpeed) playActionSound('speed');

    if (isPlaying) {
        clearInterval(gameInterval);
        gameInterval = setInterval(gameTick, TICK_RATE);
    }
}

// Initial Speed UI Sync
speedBtn.innerText = `${speedMultiplier}x [←/→]`;

async function ensureLevelMarketData(levelNumber = level) {
    const dataApi = window.FlappyKData;
    if (!dataApi) throw new Error('Market data loader is unavailable');
    await dataApi.loadMarket(dataApi.marketForLevel(levelNumber));
}

function reportMarketLoadFailure(error) {
    console.error('FlappyK market data load failed:', error);
    window.alert('Market data could not be loaded. Check your connection and try again.');
}

// Speed Button
speedBtn.addEventListener('click', () => {
    // Left click adds 1x
    changeSpeed(1);
});

// Start Button
startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    try {
        await ensureLevelMarketData();
        startScreen.classList.remove('active');
        initAudio();
        startLevel();
    } catch (error) {
        reportMarketLoadFailure(error);
    } finally {
        startBtn.disabled = false;
    }
});

// Next Level / Restart
nextBtn.addEventListener('click', async () => {
    nextBtn.disabled = true;
    try {
        await ensureLevelMarketData();
        settlementScreen.classList.remove('active');
        startLevel();
    } catch (error) {
        reportMarketLoadFailure(error);
    } finally {
        nextBtn.disabled = false;
    }
});
restartBtn.addEventListener('click', async () => {
    level = 1;
    targetReturn = 0;
    collectedCards = [];
    restartBtn.disabled = true;
    try {
        await ensureLevelMarketData(1);
        settlementScreen.classList.remove('active');
        startLevel();
    } catch (error) {
        reportMarketLoadFailure(error);
    } finally {
        restartBtn.disabled = false;
    }
});

saveBtn.addEventListener('click', () => {
    const card = document.getElementById('profit-card');
    html2canvas(card, {
        backgroundColor: null,
        scale: 2 // High resolution
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `FlappyK_ProfitCard_Level${level-1}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
});

champagneBtn.addEventListener('click', () => {
    settlementScreen.classList.remove('active');

    // Asset labels may come from supplemental data files; escape before templating.
    const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));

    // Inject cards
    let html = '';
    collectedCards.forEach(c => {
        html += `
        <div class="profit-card card-theme-${esc(c.market)}" style="transform: scale(1); margin: 0;">
            <h2>PROFIT CARD (${esc(c.level)})</h2>
            <div class="card-details">
                <p>ASSET: <span class="highlight">${esc(c.asset)}</span></p>
                <p>STARTING: $<span class="highlight">${esc(c.startCashStr)}</span></p>
                <p>FINAL: $<span class="highlight">${esc(c.finalCashStr)}</span></p>
                <p>MAX DD: <span class="highlight">${esc(c.mddStr)}</span></p>
                <p>PERIOD: <span class="highlight">${esc(c.periodStr || '???')}</span></p>
                <p>LVL RETURN: <span class="highlight">${esc(c.levelRetStr)}</span></p>
            </div>
            <div class="big-return card-positive">${esc(c.cumRetStr)}</div>
            <div style="font-size: 10px; text-align:center;">(CUMULATIVE RETURN)</div>
            <div class="status-msg card-positive">SUCCESS!</div>
        </div>
        `;
    });
    champagneExportArea.innerHTML = html;
    champagneScreen.classList.add('active');
});

champagneSaveBtn.addEventListener('click', () => {
    html2canvas(champagneExportArea, {
        backgroundColor: '#07090c',
        scale: 2,
        onclone: (clonedDoc) => {
            const exportArea = clonedDoc.getElementById('champagne-export-area');
            if (exportArea && exportArea.parentElement) {
                exportArea.parentElement.style.transform = 'none';
            }
        }
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `FlappyK_Legend_Cards.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
});

champagneRestartBtn.addEventListener('click', async () => {
    level = 1;
    targetReturn = 0;
    collectedCards = [];
    champagneRestartBtn.disabled = true;
    try {
        await ensureLevelMarketData(1);
        champagneScreen.classList.remove('active');
        startLevel();
    } catch (error) {
        reportMarketLoadFailure(error);
    } finally {
        champagneRestartBtn.disabled = false;
    }
});

function pickNormalData(levelNumber) {
    if (levelNumber === 1) currentMarket = 'crypto';
    else if (levelNumber === 2) currentMarket = 'ashare';
    else currentMarket = 'usstock';

    if (!stockData[currentMarket] || Object.keys(stockData[currentMarket]).length === 0) {
        throw new Error(`Market data is not loaded: ${currentMarket}`);
    }

    const eligibleAssets = Object.keys(stockData[currentMarket])
        .filter((asset) => Array.isArray(stockData[currentMarket][asset]))
        .filter((asset) => stockData[currentMarket][asset].length >= DAYS_PER_LEVEL);

    if (eligibleAssets.length === 0) {
        throw new Error(`No ${currentMarket} asset has ${DAYS_PER_LEVEL} usable days`);
    }

    currentAsset = eligibleAssets[Math.floor(Math.random() * eligibleAssets.length)];
    const data = stockData[currentMarket][currentAsset];

    // Pick a random starting point ensuring we have enough days
    const maxStart = data.length - DAYS_PER_LEVEL;
    const startIndex = Math.floor(Math.random() * (maxStart + 1));

    return data.slice(startIndex, startIndex + DAYS_PER_LEVEL);
}

function resolveLevelMarketData(levelNumber) {
    const ranked = [...dataSources.values()].sort((a, b) => b.priority - a.priority);
    let source = 'normal';
    let data = null;
    for (const entry of ranked) {
        data = entry.provide(levelNumber);
        if (data) {
            source = entry.mode;
            break;
        }
    }
    if (!data) data = pickNormalData(levelNumber);
    emitHook('data-resolved', { level: levelNumber, market: currentMarket, asset: currentAsset, data, source });
    return { data, source };
}

function startLevel() {
    emitHook('level-will-start', { level });
    currentData = resolveLevelMarketData(level).data;
    dayIndex = 0;

    if (level === 1) {
        cash = INITIAL_CASH;
    }
    levelStartCash = cash;
    shares = 0;
    totalHistory = [];
    actions = [];
    isPlaying = true;

    levelDisp.innerText = level;
    targetDisp.innerText = level === 1 ? "ANY PROFIT" : `> CUMULATIVE ${(targetReturn * 100).toFixed(2)}%`;

    resizeCanvas(); // Ensure canvas is sized correctly before drawing

    // Add initial state to history
    currentPrice = currentData[0].close;
    totalHistory.push(cash);

    updateUI();
    draw();

    startAudio();
    clearInterval(gameInterval);
    gameInterval = setInterval(gameTick, TICK_RATE);
    emitHook('level-did-start', { level });
}

function gameTick() {
    if (dayIndex >= DAYS_PER_LEVEL - 1) {
        endLevel();
        return;
    }

    dayIndex++;
    currentPrice = currentData[dayIndex].close;

    const total = cash + (shares * currentPrice);
    totalHistory.push(total);

    updateUI();
    draw();
    emitHook('tick', { day: dayIndex, price: currentPrice, total });

    if (dayIndex % 50 === 0) {
        playActionSound('checkpoint');
        window.FlappyKMarketCanvas?.requestBurst?.('checkpoint');
    }
}

function endLevel() {
    const completedLevel = level;
    emitHook('level-will-settle', { completedLevel });

    clearInterval(gameInterval);
    isPlaying = false;
    stopAudio();

    // Liquidate remaining shares
    cash += shares * currentPrice;
    shares = 0;

    // Authoritative pass evaluation
    const performance = window.FlappyKMarketPassRule.evaluate({
        startCash: levelStartCash,
        finalCash: cash,
        startPrice: currentData[0].close,
        finalPrice: currentPrice,
    });
    const formatReturn = (value) => `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
    const levelRetStr = formatReturn(performance.playerReturn);
    const marketRetStr = formatReturn(performance.marketReturn);
    const excessRetStr = formatReturn(performance.excessReturn);
    const cumRetStr = formatReturn((cash - INITIAL_CASH) / INITIAL_CASH);

    // Show Settlement
    settlementScreen.classList.add('active');
    const profitCard = document.getElementById('profit-card');
    profitCard.className = 'profit-card'; // Reset base class
    profitCard.classList.add(`card-theme-${currentMarket}`);

    document.getElementById('card-title').innerText = `PROFIT CARD (${completedLevel})`;
    document.getElementById('card-asset').innerText = currentAsset;
    document.getElementById('card-start-cash').innerText = levelStartCash.toFixed(2);
    document.getElementById('card-final-cash').innerText = cash.toFixed(2);
    document.getElementById('card-level-return').innerText = levelRetStr;
    document.getElementById('card-market-return').innerText = marketRetStr;
    document.getElementById('card-excess-return').innerText = excessRetStr;

    // Calculate Max Drawdown
    let peak = totalHistory[0];
    let maxDrawdown = 0;
    for (let i = 0; i < totalHistory.length; i++) {
        if (totalHistory[i] > peak) {
            peak = totalHistory[i];
        }
        const dd = (peak - totalHistory[i]) / peak;
        if (dd > maxDrawdown) {
            maxDrawdown = dd;
        }
    }
    const mddStr = '-' + (maxDrawdown * 100).toFixed(2) + '%';

    document.getElementById('card-return').innerText = cumRetStr;

    const startDate = currentData[0].date;
    const endDate = currentData[dayIndex].date;
    document.getElementById('card-period').innerText = `${startDate} ~ ${endDate}`;

    const statusMsg = document.getElementById('card-status');
    const retElem = document.getElementById('card-return');
    const cumReturn = (cash - INITIAL_CASH) / INITIAL_CASH;
    retElem.className = `big-return ${cumReturn > 0
        ? 'card-positive'
        : cumReturn < 0
            ? 'card-negative'
            : 'card-neutral'}`;

    if (performance.isSuccess) {
        statusMsg.innerText = 'MARKET BEATEN!';
        statusMsg.className = 'status-msg card-positive';
        playActionSound('win');

        collectedCards.push({
            level: completedLevel,
            market: currentMarket,
            asset: currentAsset,
            levelReturn: performance.playerReturn,
            marketReturn: performance.marketReturn,
            excessReturn: performance.excessReturn,
            days: currentData.length,
            startCashStr: `$${levelStartCash.toFixed(2)}`,
            finalCashStr: `$${cash.toFixed(2)}`,
            mddStr: mddStr,
            periodStr: `${startDate} ~ ${endDate}`,
            levelRetStr: levelRetStr,
            marketRetStr: marketRetStr,
            excessRetStr: excessRetStr,
            cumRetStr: cumRetStr
        });

        if (completedLevel === 3) {
            nextBtn.style.display = 'none';
            champagneBtn.style.display = 'block';
            saveBtn.style.display = 'none'; // Hide single save to encourage full save
        } else {
            nextBtn.style.display = 'block';
            champagneBtn.style.display = 'none';
            saveBtn.style.display = 'block';
        }
        restartBtn.style.display = 'none';

        // Update state for next level
        level++;
        targetReturn = 0;
    } else {
        statusMsg.innerText = 'MARKET WON.';
        statusMsg.className = 'status-msg card-negative';
        playActionSound('fail');
        nextBtn.style.display = 'none';
        champagneBtn.style.display = 'none';
        saveBtn.style.display = 'none';
        restartBtn.style.display = 'block';
    }

    emitHook('level-did-settle', {
        completedLevel,
        market: currentMarket,
        asset: currentAsset,
        isSuccess: performance.isSuccess,
        playerReturn: performance.playerReturn,
        marketReturn: performance.marketReturn,
        excessReturn: performance.excessReturn,
        projectedCash: cash,
        days: currentData.length,
    });
}
function triggerScreenShake() {
    const container = document.getElementById('game-container');
    if (!container) return;
    container.classList.remove('is-shaking');
    void container.offsetWidth;
    container.classList.add('is-shaking');
}

function handleBuy() {
    if (!isPlaying) return;
    // Buy $1000
    if (cash >= TRADE_AMOUNT + FEE) {
        cash -= (TRADE_AMOUNT + FEE);
        shares += TRADE_AMOUNT / currentPrice;
        actions.push({ type: 'buy', day: dayIndex, price: currentPrice });
        playActionSound('buy');
        emitHook('trade', { type: 'buy', day: dayIndex, price: currentPrice });
        triggerScreenShake();
        updateUI();
        draw();
    }
}

function handleSell() {
    if (!isPlaying) return;
    // Sell $1000
    const assetValue = shares * currentPrice;
    if (assetValue >= TRADE_AMOUNT - 0.01) { // Floating point tolerance
        cash += (TRADE_AMOUNT - FEE);
        shares -= TRADE_AMOUNT / currentPrice;
        actions.push({ type: 'sell', day: dayIndex, price: currentPrice });
        playActionSound('sell');
        emitHook('trade', { type: 'sell', day: dayIndex, price: currentPrice });
        triggerScreenShake();
        updateUI();
        draw();
    } else if (assetValue > FEE) {
        // Sell all remaining if less than $1000
        cash += (assetValue - FEE);
        shares = 0;
        actions.push({ type: 'sell', day: dayIndex, price: currentPrice });
        playActionSound('sell');
        emitHook('trade', { type: 'sell', day: dayIndex, price: currentPrice });
        triggerScreenShake();
        updateUI();
        draw();
    }
}

// Input Handling
window.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') {
        toggleSound();
        return;
    }

    if (!isPlaying) return;

    if (e.key === 'ArrowUp') {
        handleBuy();
    } else if (e.key === 'ArrowDown') {
        handleSell();
    } else if (e.key === 'ArrowRight') {
        changeSpeed(1); // Accelerate
    } else if (e.key === 'ArrowLeft') {
        changeSpeed(-1); // Decelerate
    }
});

soundToggleBtn?.addEventListener('click', () => toggleSound());
document.addEventListener('flappyk:language-changed', applySoundControl);
applySoundControl();

// Mobile / Virtual Buttons Handling
const btnBuy = document.getElementById('btn-buy');
const btnSell = document.getElementById('btn-sell');
const btnSpeedUp = document.getElementById('btn-speed-up');
const btnSpeedDown = document.getElementById('btn-speed-down');

if (btnBuy) {
    btnBuy.addEventListener('touchstart', (e) => { e.preventDefault(); handleBuy(); });
    btnBuy.addEventListener('mousedown', (e) => { e.preventDefault(); handleBuy(); });
}
if (btnSell) {
    btnSell.addEventListener('touchstart', (e) => { e.preventDefault(); handleSell(); });
    btnSell.addEventListener('mousedown', (e) => { e.preventDefault(); handleSell(); });
}
if (btnSpeedUp) {
    btnSpeedUp.addEventListener('touchstart', (e) => { e.preventDefault(); changeSpeed(1); });
    btnSpeedUp.addEventListener('mousedown', (e) => { e.preventDefault(); changeSpeed(1); });
}
if (btnSpeedDown) {
    btnSpeedDown.addEventListener('touchstart', (e) => { e.preventDefault(); changeSpeed(-1); });
    btnSpeedDown.addEventListener('mousedown', (e) => { e.preventDefault(); changeSpeed(-1); });
}

function updateUI() {
    if (!currentData || !currentData[dayIndex]) return;
    currentPrice = currentData[dayIndex].close;

    const assetValue = shares * currentPrice;
    const total = cash + assetValue;
    const ret = (total - INITIAL_CASH) / INITIAL_CASH * 100;

    if (dayDisp) dayDisp.innerText = (dayIndex + 1);
    cashDisp.innerText = cash.toFixed(2);
    assetDisp.innerText = assetValue.toFixed(2);
    totalDisp.innerText = total.toFixed(2);

    returnDisp.innerText = ret.toFixed(2) + "%";

    if (ret > 0) returnDisp.className = 'positive';
    else if (ret < 0) returnDisp.className = 'negative';
    else returnDisp.className = 'neutral';
}

function playActionSound(type) {
    if (!audioCtx || soundMuted) return;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => null);
    }
    const now = audioCtx.currentTime;
    if (type === 'buy') {
        // 8-bit coin jump (two-tone rising chirp)
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880.00, now + 0.05); // A5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    } else if (type === 'sell') {
        // 8-bit cash register drop
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(783.99, now); // G5
        osc.frequency.setValueAtTime(523.25, now + 0.05); // C5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    } else if (type === 'win') {
        // 8-bit victory fanfare: C5 -> E5 -> G5 -> C6
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);
            gain.gain.setValueAtTime(0.08, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.12);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.12);
        });
    } else if (type === 'fail') {
        // 8-bit low game-over buzz
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.25);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'checkpoint') {
        // 8-bit milestone chime: E5 -> A5
        [659.25, 880].forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now + i * 0.07);
            gain.gain.setValueAtTime(0.06, now + i * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.1);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + i * 0.07);
            osc.stop(now + i * 0.07 + 0.1);
        });
    } else if (type === 'speed' || type === 'weather' || type === 'ui') {
        // Short stepped blip; direction by kind.
        const up = type !== 'weather';
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(up ? 740 : 330, now);
        osc.frequency.exponentialRampToValueAtTime(up ? 990 : 262, now + 0.06);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
    }
}

function draw() {
    const renderer = window.FlappyKMarketCanvas;
    if (!renderer) {
        throw new Error('FlappyK market canvas renderer is unavailable');
    }

    renderer.draw({
        ctx,
        width: canvasCssWidth,
        height: canvasCssHeight,
        currentData,
        dayIndex,
        visibleDays: VISIBLE_DAYS,
        currentMarket,
        actions,
        totalHistory,
        levelStartCash,
    });
}

function resetGame() {
    isPlaying = false;
    if (typeof gameInterval !== 'undefined') clearInterval(gameInterval);
    if (typeof stopAudio === 'function') stopAudio();
    level = 1;
    targetReturn = 0;
    collectedCards = [];
    dayIndex = 0;
    cash = INITIAL_CASH;
    shares = 0;
    actions = [];
    totalHistory = [];

    document.querySelectorAll('.modal.active, .screen.active').forEach((el) => {
        if (el.id !== 'start-screen') el.classList.remove('active');
    });
    if (startScreen) startScreen.classList.add('active');

    window.FlappyKEvents?.emit?.('flappyk:game-reset', {});
    window.FlappyKUiState?.transition?.(window.FlappyKUiState?.STATES?.HOME || 'home', { source: 'game-reset' });
}

window.FlappyKGame = {
    startLevel,
    endLevel,
    resetGame,
    changeSpeed,
    handleBuy,
    handleSell,
    toggleSound,
    isSoundMuted: () => soundMuted,
    controller: window.FlappyKGameController,
    getState: () => ({
        level,
        dayIndex,
        cash,
        shares,
        isPlaying,
        currentMarket,
        currentAsset,
        speedMultiplier,
    }),
};
