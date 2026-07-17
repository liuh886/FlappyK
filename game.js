const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

// Game Config
const INITIAL_CASH = 10000;
const TRADE_AMOUNT = 1000;
const DAYS_PER_LEVEL = 250;
let TICK_RATE = 5000; // Default 5s per day as requested
let speedMultiplier = 1;

let level = 1;
let targetReturn = 0; // The return to beat
let currentAsset = "";
let currentData = [];
let dayIndex = 0;
let cash = INITIAL_CASH;
let shares = 0;
let totalHistory = [];
let gameInterval;
let isPlaying = false;
let currentPrice = 0;

// UI Elements
const levelDisp = document.getElementById('level-display');
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
const restartBtn = document.getElementById('restart-btn');

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

// Speed Button
speedBtn.addEventListener('click', () => {
    if (speedMultiplier === 1) {
        speedMultiplier = 10;
        TICK_RATE = 500;
        speedBtn.innerText = "10x (0.5s/day)";
    } else if (speedMultiplier === 10) {
        speedMultiplier = 50;
        TICK_RATE = 100;
        speedBtn.innerText = "50x (0.1s/day)";
    } else {
        speedMultiplier = 1;
        TICK_RATE = 5000;
        speedBtn.innerText = "1x (5s/day)";
    }
    
    // Restart interval if playing
    if (isPlaying) {
        clearInterval(gameInterval);
        gameInterval = setInterval(gameTick, TICK_RATE);
    }
});

// Start Button
startBtn.addEventListener('click', () => {
    startScreen.classList.remove('active');
    initAudio();
    startLevel();
});

// Next Level / Restart
nextBtn.addEventListener('click', () => {
    settlementScreen.classList.remove('active');
    startLevel();
});
restartBtn.addEventListener('click', () => {
    settlementScreen.classList.remove('active');
    level = 1;
    targetReturn = 0;
    startLevel();
});

function pickRandomData() {
    const assets = Object.keys(stockData);
    currentAsset = assets[Math.floor(Math.random() * assets.length)];
    const data = stockData[currentAsset];
    
    // Pick a random starting point ensuring we have enough days
    const maxStart = data.length - DAYS_PER_LEVEL;
    const startIndex = Math.floor(Math.random() * maxStart);
    
    return data.slice(startIndex, startIndex + DAYS_PER_LEVEL);
}

function startLevel() {
    currentData = pickRandomData();
    dayIndex = 0;
    cash = INITIAL_CASH;
    shares = 0;
    totalHistory = [];
    isPlaying = true;
    
    levelDisp.innerText = level;
    targetDisp.innerText = level === 1 ? "ANY PROFIT (>0%)" : `>${(targetReturn * 100).toFixed(2)}%`;
    
    // Add initial state to history
    currentPrice = currentData[0].close;
    totalHistory.push(INITIAL_CASH);
    
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
    
    // Calculate final
    const finalTotal = cash + (shares * currentPrice);
    const finalReturn = (finalTotal - INITIAL_CASH) / INITIAL_CASH;
    
    // Show Settlement
    settlementScreen.classList.add('active');
    document.getElementById('card-title').innerText = `PROFIT CARD (${level})`;
    document.getElementById('card-asset').innerText = currentAsset;
    
    const startDate = currentData[0].date;
    const endDate = currentData[dayIndex].date;
    document.getElementById('card-period').innerText = `${startDate} to ${endDate}`;
    
    document.getElementById('card-final').innerText = finalTotal.toFixed(2);
    
    const retElem = document.getElementById('card-return');
    retElem.innerText = (finalReturn * 100).toFixed(2) + "%";
    
    let isSuccess = false;
    if (level === 1) {
        isSuccess = finalReturn > 0;
    } else {
        isSuccess = finalReturn > targetReturn;
    }
    
    const statusMsg = document.getElementById('card-status');
    if (isSuccess) {
        retElem.className = 'big-return card-positive';
        statusMsg.innerText = "SUCCESS! TARGET BEATEN.";
        statusMsg.className = 'status-msg card-positive';
        nextBtn.style.display = 'block';
        restartBtn.style.display = 'none';
        
        // Update state for next level
        level++;
        targetReturn = finalReturn;
    } else {
        retElem.className = 'big-return card-negative';
        statusMsg.innerText = "FAILED TO BEAT TARGET.";
        statusMsg.className = 'status-msg card-negative';
        nextBtn.style.display = 'none';
        restartBtn.style.display = 'block';
    }
}

// Input Handling
window.addEventListener('keydown', (e) => {
    if (!isPlaying) return;
    
    if (e.key === 'ArrowUp') {
        // Buy $1000
        if (cash >= TRADE_AMOUNT) {
            cash -= TRADE_AMOUNT;
            shares += TRADE_AMOUNT / currentPrice;
            updateUI();
        }
    } else if (e.key === 'ArrowDown') {
        // Sell $1000
        const assetValue = shares * currentPrice;
        if (assetValue >= TRADE_AMOUNT - 0.01) { // Floating point tolerance
            cash += TRADE_AMOUNT;
            shares -= TRADE_AMOUNT / currentPrice;
            updateUI();
        } else if (assetValue > 0) {
            // Sell all remaining if less than $1000
            cash += assetValue;
            shares = 0;
            updateUI();
        }
    }
});

function updateUI() {
    if (!currentData || !currentData[dayIndex]) return;
    currentPrice = currentData[dayIndex].close;
    
    const assetValue = shares * currentPrice;
    const total = cash + assetValue;
    const ret = (total - INITIAL_CASH) / INITIAL_CASH * 100;
    
    cashDisp.innerText = cash.toFixed(2);
    assetDisp.innerText = assetValue.toFixed(2);
    totalDisp.innerText = total.toFixed(2);
    
    returnDisp.innerText = ret.toFixed(2) + "%";
    
    if (ret > 0) returnDisp.className = 'positive';
    else if (ret < 0) returnDisp.className = 'negative';
    else returnDisp.className = 'neutral';
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!currentData || currentData.length === 0) return;
    
    // Determine Y scale based on visible data min/max
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    
    for (let i = 0; i <= dayIndex; i++) {
        const d = currentData[i];
        if (d.low < minPrice) minPrice = d.low;
        if (d.high > maxPrice) maxPrice = d.high;
    }
    
    const pricePadding = (maxPrice - minPrice) * 0.1 || 1;
    minPrice -= pricePadding;
    maxPrice += pricePadding;
    
    const candleWidth = canvas.width / DAYS_PER_LEVEL;
    const chartHeight = canvas.height * 0.7; // Top 70% for K-line
    
    function getY(price) {
        return chartHeight - ((price - minPrice) / (maxPrice - minPrice) * chartHeight);
    }
    
    // Draw K-lines
    for (let i = 0; i <= dayIndex; i++) {
        const d = currentData[i];
        const x = i * candleWidth;
        
        const openY = getY(d.open);
        const closeY = getY(d.close);
        const highY = getY(d.high);
        const lowY = getY(d.low);
        
        const isUp = d.close >= d.open;
        ctx.fillStyle = isUp ? '#2ecc71' : '#e74c3c';
        ctx.strokeStyle = isUp ? '#2ecc71' : '#e74c3c';
        
        // Draw wick
        ctx.beginPath();
        ctx.moveTo(x + candleWidth/2, highY);
        ctx.lineTo(x + candleWidth/2, lowY);
        ctx.stroke();
        
        // Draw body
        const bodyY = Math.min(openY, closeY);
        const bodyH = Math.max(Math.abs(closeY - openY), 1);
        ctx.fillRect(x + candleWidth*0.1, bodyY, candleWidth*0.8, bodyH);
    }
    
    // Draw Total Return Curve (Bottom 30%)
    const curveTop = canvas.height * 0.75;
    const curveHeight = canvas.height * 0.2;
    
    // Determine Min/Max for return curve
    let minTotal = Math.min(INITIAL_CASH, ...totalHistory);
    let maxTotal = Math.max(INITIAL_CASH, ...totalHistory);
    const totalPadding = (maxTotal - minTotal) * 0.1 || 100;
    minTotal -= totalPadding;
    maxTotal += totalPadding;
    
    function getTotalY(total) {
        return curveTop + curveHeight - ((total - minTotal) / (maxTotal - minTotal) * curveHeight);
    }
    
    // Draw dividing line
    ctx.strokeStyle = '#555';
    ctx.beginPath();
    ctx.moveTo(0, chartHeight + 10);
    ctx.lineTo(canvas.width, chartHeight + 10);
    ctx.stroke();
    
    // Draw initial cash reference line
    const refY = getTotalY(INITIAL_CASH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, refY);
    ctx.lineTo(canvas.width, refY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw curve
    if (totalHistory.length > 0) {
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Start at origin (day 0)
        ctx.moveTo(candleWidth/2, getTotalY(totalHistory[0])); 
        
        for (let i = 1; i < totalHistory.length; i++) {
            ctx.lineTo((i * candleWidth) + candleWidth/2, getTotalY(totalHistory[i]));
        }
        ctx.stroke();
        ctx.lineWidth = 1;
    }
}
