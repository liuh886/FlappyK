const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

// Game Config
const INITIAL_CASH = 10000;
const TRADE_AMOUNT = 1000;
const FEE = 1; // $1 fee per transaction
const DAYS_PER_LEVEL = 250;
const VISIBLE_DAYS = 50; // Scroll view width
let TICK_RATE = 1000;
let speedMultiplier = 5;

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
    if (speedMultiplier > 100) speedMultiplier = 100;
    
    TICK_RATE = 5000 / speedMultiplier;
    speedBtn.innerText = speedMultiplier + "x [←/→]";
    
    // Restart interval if playing
    if (isPlaying) {
        clearInterval(gameInterval);
        gameInterval = setInterval(gameTick, TICK_RATE);
    }
}

// Speed Button
speedBtn.addEventListener('click', () => {
    // Left click adds 1x
    changeSpeed(1);
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
    collectedCards = [];
    startLevel();
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
        backgroundColor: '#0d1117',
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

champagneRestartBtn.addEventListener('click', () => {
    champagneScreen.classList.remove('active');
    level = 1;
    targetReturn = 0;
    collectedCards = [];
    startLevel();
});

function pickRandomData() {
    if (level === 1) currentMarket = 'crypto';
    else if (level === 2) currentMarket = 'ashare';
    else currentMarket = 'usstock';
    
    // In case data failed to fetch, fallback
    if (!stockData[currentMarket] || Object.keys(stockData[currentMarket]).length === 0) {
        currentMarket = Object.keys(stockData).find(k => Object.keys(stockData[k]).length > 0);
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

// Input Handling
window.addEventListener('keydown', (e) => {
    if (!isPlaying) return;
    
    if (e.key === 'ArrowUp') {
        // Buy $1000
        if (cash >= TRADE_AMOUNT + FEE) {
            cash -= (TRADE_AMOUNT + FEE);
            shares += TRADE_AMOUNT / currentPrice;
            actions.push({ type: 'buy', day: dayIndex, price: currentPrice });
            playActionSound('buy');
            updateUI();
            draw();
        }
    } else if (e.key === 'ArrowDown') {
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
    } else if (e.key === 'ArrowRight') {
        changeSpeed(1); // Accelerate
    } else if (e.key === 'ArrowLeft') {
        changeSpeed(-1); // Decelerate
    }
});

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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw neon grid background
    ctx.strokeStyle = 'rgba(46, 204, 113, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    
    if (!currentData || currentData.length === 0) return;
    
    // Determine View Window (Scroll)
    const startDay = Math.max(0, dayIndex - VISIBLE_DAYS + 1);
    
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    
    for (let i = startDay; i <= dayIndex; i++) {
        const d = currentData[i];
        if (d.low < minPrice) minPrice = d.low;
        if (d.high > maxPrice) maxPrice = d.high;
    }
    
    const pricePadding = (maxPrice - minPrice) * 0.1 || 1;
    minPrice -= pricePadding;
    maxPrice += pricePadding;
    
    const candleWidth = canvas.width / VISIBLE_DAYS;
    const chartHeight = canvas.height * 0.7; // Top 70% for K-line
    
    function getY(price) {
        return chartHeight - ((price - minPrice) / (maxPrice - minPrice) * chartHeight);
    }
    
    ctx.shadowBlur = 0;
    
    // Draw K-lines
    for (let i = startDay; i <= dayIndex; i++) {
        const d = currentData[i];
        const displayIdx = i - startDay;
        const x = displayIdx * candleWidth;
        
        const openY = getY(d.open);
        const closeY = getY(d.close);
        const highY = getY(d.high);
        const lowY = getY(d.low);
        
        const isUp = d.close >= d.open;
        ctx.fillStyle = isUp ? '#2ecc71' : '#e74c3c';
        ctx.strokeStyle = isUp ? '#2ecc71' : '#e74c3c';
        
        ctx.shadowColor = isUp ? '#2ecc71' : '#e74c3c';
        ctx.shadowBlur = 5; // Glow effect
        
        // Draw wick
        ctx.beginPath();
        ctx.moveTo(x + candleWidth/2, highY);
        ctx.lineTo(x + candleWidth/2, lowY);
        ctx.stroke();
        
        // Draw body
        const bodyY = Math.min(openY, closeY);
        const bodyH = Math.max(Math.abs(closeY - openY), 1);
        ctx.fillRect(x + candleWidth*0.1, bodyY, candleWidth*0.8, bodyH);
        
        ctx.shadowBlur = 0; // reset
    }
    
    // Draw Actions (Emojis)
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    for (const action of actions) {
        if (action.day >= startDay && action.day <= dayIndex) {
            const displayIdx = action.day - startDay;
            const x = displayIdx * candleWidth + candleWidth/2;
            const y = getY(action.price);
            
            if (action.type === 'buy') {
                ctx.fillText("👏", x, y + 25); // Below candle
            } else {
                ctx.fillText("🤷", x, y - 10); // Above candle
            }
        }
    }
    
    // Draw Total Return Curve (Bottom 30%)
    const curveTop = canvas.height * 0.75;
    const curveHeight = canvas.height * 0.2;
    
    let minTotal = Math.min(levelStartCash, ...totalHistory.slice(startDay));
    let maxTotal = Math.max(levelStartCash, ...totalHistory.slice(startDay));
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
    const refY = getTotalY(levelStartCash);
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
        ctx.lineWidth = 3;
        ctx.shadowColor = '#f1c40f';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        
        let started = false;
        for (let i = startDay; i <= dayIndex; i++) {
            if (i < totalHistory.length) {
                const displayIdx = i - startDay;
                const tx = (displayIdx * candleWidth) + candleWidth/2;
                const ty = getTotalY(totalHistory[i]);
                if (!started) {
                    ctx.moveTo(tx, ty);
                    started = true;
                } else {
                    ctx.lineTo(tx, ty);
                }
            }
        }
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
    }
}
