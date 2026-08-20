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

// Audio Context
let audioCtx;
let nextNoteTime = 0;
let audioTimerID;
const melody = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63]; // C E G C G E
let noteIndex = 0;

function scheduleAudio() {
    if (!isPlaying) return;
    while (nextNoteTime < audioCtx.currentTime + 0.1) {
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

        // Advance time and note
        nextNoteTime += 0.2; // 200ms per note
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
    nextNoteTime = audioCtx.currentTime + 0.1;
    scheduleAudio();
}

function stopAudio() {
    cancelAnimationFrame(audioTimerID);
}

function changeSpeed(delta) {
    speedMultiplier += delta;
    if (speedMultiplier < 1) speedMultiplier = 1;
    if (speedMultiplier > 20) speedMultiplier = 20;

    TICK_RATE = 5000 / speedMultiplier;
    speedBtn.innerText = `${speedMultiplier}x [←/→]`;

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

    // Inject cards
    let html = '';
    collectedCards.forEach(c => {
        html += `
        <div class="profit-card card-theme-${c.market}" style="transform: scale(1); margin: 0;">
            <h2>PROFIT CARD (${c.level})</h2>
            <div class="card-details">
                <p>ASSET: <span class="highlight">${c.asset}</span></p>
                <p>STARTING: $<span class="highlight">${c.startCashStr}</span></p>
                <p>FINAL: $<span class="highlight">${c.finalCashStr}</span></p>
                <p>MAX DD: <span class="highlight">${c.mddStr}</span></p>
                <p>PERIOD: <span class="highlight">${c.periodStr || '???'}</span></p>
                <p>LVL RETURN: <span class="highlight">${c.levelRetStr}</span></p>
            </div>
            <div class="big-return card-positive">${c.cumRetStr}</div>
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

function pickRandomData() {
    if (level === 1) currentMarket = 'crypto';
    else if (level === 2) currentMarket = 'ashare';
    else currentMarket = 'usstock';

    if (!stockData[currentMarket] || Object.keys(stockData[currentMarket]).length === 0) {
        throw new Error(`Market data is not loaded: ${currentMarket}`);
    }

    const assets = Object.keys(stockData[currentMarket]);
    currentAsset = assets[Math.floor(Math.random() * assets.length)];
    const data = stockData[currentMarket][currentAsset];

    // Pick a random starting point ensuring we have enough days
    const maxStart = data.length - DAYS_PER_LEVEL;
    const startIndex = Math.floor(Math.random() * maxStart);

    return data.slice(startIndex, startIndex + DAYS_PER_LEVEL);
}

function startLevel() {
    currentData = pickRandomData();
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
    gameInterval = setInterval(gameTick, TICK_RATE);
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
}

function endLevel() {
    clearInterval(gameInterval);
    isPlaying = false;
    stopAudio();

    // Liquidate remaining shares
    cash += shares * currentPrice;
    shares = 0;

    // Show Settlement
    settlementScreen.classList.add('active');
    const profitCard = document.getElementById('profit-card');
    profitCard.className = 'profit-card'; // Reset base class
    profitCard.classList.add(`card-theme-${currentMarket}`);

    document.getElementById('card-title').innerText = `PROFIT CARD (${level})`;
    document.getElementById('card-asset').innerText = currentAsset;
    document.getElementById('card-start-cash').innerText = levelStartCash.toFixed(2);
    document.getElementById('card-final-cash').innerText = cash.toFixed(2);

    // Evaluate Result
    const levelReturn = ((cash - levelStartCash) / levelStartCash);
    const levelRetStr = (levelReturn >= 0 ? '+' : '') + (levelReturn * 100).toFixed(2) + '%';
    document.getElementById('card-level-return').innerText = levelRetStr;

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

    const cumReturn = ((cash - INITIAL_CASH) / INITIAL_CASH);
    const cumRetStr = (cumReturn >= 0 ? '+' : '') + (cumReturn * 100).toFixed(2) + '%';

    document.getElementById('card-return').innerText = cumRetStr;
    document.getElementById('card-small-return').innerText = cumRetStr;
    document.getElementById('card-final').innerText = cash.toFixed(2);

    const startDate = currentData[0].date;
    const endDate = currentData[dayIndex].date;
    document.getElementById('card-period').innerText = `${startDate} ~ ${endDate}`;

    let isSuccess = false;
    if (level === 1) {
        isSuccess = cumReturn > 0;
    } else {
        isSuccess = cumReturn > targetReturn;
    }

    const statusMsg = document.getElementById('card-status');
    const retElem = document.getElementById('card-return');
    if (isSuccess) {
        retElem.className = 'big-return card-positive';
        statusMsg.innerText = "SUCCESS! TARGET BEATEN.";
        statusMsg.className = 'status-msg card-positive';

        collectedCards.push({
            level: level,
            market: currentMarket,
            asset: currentAsset,
            startCashStr: `$${levelStartCash.toFixed(2)}`,
            finalCashStr: `$${cash.toFixed(2)}`,
            mddStr: mddStr,
            periodStr: `${startDate} ~ ${endDate}`,
            levelRetStr: levelRetStr,
            cumRetStr: cumRetStr
        });

        if (level === 3) {
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
        targetReturn = finalReturn;
    } else {
        retElem.className = 'big-return card-negative';
        statusMsg.innerText = "FAILED TO BEAT TARGET.";
        statusMsg.className = 'status-msg card-negative';
        nextBtn.style.display = 'none';
        champagneBtn.style.display = 'none';
        saveBtn.style.display = 'none';
        restartBtn.style.display = 'block';
    }
}

function handleBuy() {
    if (!isPlaying) return;
    // Buy $1000
    if (cash >= TRADE_AMOUNT + FEE) {
        cash -= (TRADE_AMOUNT + FEE);
        shares += TRADE_AMOUNT / currentPrice;
        actions.push({ type: 'buy', day: dayIndex, price: currentPrice });
        playActionSound('buy');
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
        updateUI();
        draw();
    } else if (assetValue > FEE) {
        // Sell all remaining if less than $1000
        cash += (assetValue - FEE);
        shares = 0;
        actions.push({ type: 'sell', day: dayIndex, price: currentPrice });
        playActionSound('sell');
        updateUI();
        draw();
    }
}

// Input Handling
window.addEventListener('keydown', (e) => {
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
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    if (type === 'buy') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
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
