(() => {
    'use strict';

    const core = window.FlappyKIndicatorCore;
    const store = window.FlappyKIndicatorCardStore;
    const baseCanvas = document.getElementById('game-canvas');
    const container = document.getElementById('game-container');
    if (!core || !store || !baseCanvas || !container) return;

    const root = document.documentElement;
    const REVEAL_MS = 440;
    const TYPES = Object.freeze(['boll', 'macd']);

    const overlay = document.createElement('canvas');
    overlay.id = 'indicator-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    container.insertBefore(overlay, baseCanvas.nextSibling);
    const context = overlay.getContext('2d');

    const deck = document.createElement('aside');
    deck.id = 'indicator-card-deck';
    deck.className = 'indicator-card-deck';
    deck.setAttribute('aria-label', 'Power-up indicator cards');
    deck.hidden = true;
    deck.innerHTML = `
        <div class="indicator-hand-label" data-hand-label>POWER-UP HAND</div>
        <div class="indicator-card-row">
            <button class="indicator-card indicator-card--boll" type="button" data-indicator-card="boll" aria-keyshortcuts="1">
                <span class="indicator-card-key">1</span>
                <span class="indicator-card-copy"><strong>BOLL</strong><small data-card-subtitle="boll">VOLATILITY SCAN</small></span>
                <span class="indicator-card-count" data-card-count="boll">×0</span>
            </button>
            <button class="indicator-card indicator-card--macd" type="button" data-indicator-card="macd" aria-keyshortcuts="2">
                <span class="indicator-card-key">2</span>
                <span class="indicator-card-copy"><strong>MACD</strong><small data-card-subtitle="macd">MOMENTUM SCAN</small></span>
                <span class="indicator-card-count" data-card-count="macd">×0</span>
            </button>
        </div>
        <button class="indicator-card-draw" type="button" data-indicator-draw hidden></button>
        <div class="indicator-card-feedback" role="status" aria-live="polite"></div>`;
    container.appendChild(deck);

    const buttons = Object.fromEntries(
        Array.from(deck.querySelectorAll('[data-indicator-card]'))
            .map((button) => [button.dataset.indicatorCard, button])
    );
    const subtitles = Object.fromEntries(
        Array.from(deck.querySelectorAll('[data-card-subtitle]'))
            .map((node) => [node.dataset.cardSubtitle, node])
    );
    const handLabel = deck.querySelector('[data-hand-label]');
    const drawButton = deck.querySelector('[data-indicator-draw]');
    const feedback = deck.querySelector('.indicator-card-feedback');

    let active = { boll: false, macd: false };
    let revealStartedAt = { boll: 0, macd: 0 };
    let lastData = null;
    let calculationData = null;
    let bollValues = [];
    let macdValues = [];
    let feedbackTimer = 0;

    function isChinese() {
        return root.dataset.flappykLanguage === 'zh';
    }

    function text(english, chinese) {
        return isChinese() ? chinese : english;
    }

    function gameSnapshot() {
        return {
            data: typeof currentData !== 'undefined' && Array.isArray(currentData) ? currentData : [],
            day: typeof dayIndex !== 'undefined' ? Number(dayIndex) || 0 : 0,
            visibleDays: typeof VISIBLE_DAYS !== 'undefined' ? Number(VISIBLE_DAYS) || 50 : 50,
            playing: typeof isPlaying !== 'undefined' && isPlaying === true,
            totals: typeof totalHistory !== 'undefined' && Array.isArray(totalHistory) ? totalHistory : [],
            startCash: typeof levelStartCash !== 'undefined' ? Number(levelStartCash) : 0,
        };
    }

    function isGameVisible(snapshot = gameSnapshot()) {
        const state = root.dataset.uiState;
        return snapshot.playing || state === 'playing' || state === 'paused';
    }

    function hasCardAccess() {
        return store.getSnapshot().signedIn === true;
    }

    function syncOverlaySize() {
        const width = baseCanvas.width;
        const height = baseCanvas.height;
        if (overlay.width !== width) overlay.width = width;
        if (overlay.height !== height) overlay.height = height;
        overlay.style.left = `${baseCanvas.offsetLeft}px`;
        overlay.style.top = `${baseCanvas.offsetTop}px`;
        overlay.style.width = `${baseCanvas.clientWidth}px`;
        overlay.style.height = `${baseCanvas.clientHeight}px`;
    }

    function clearActiveCards() {
        active = { boll: false, macd: false };
        revealStartedAt = { boll: 0, macd: 0 };
        deck.querySelectorAll('.indicator-card').forEach((button) => {
            button.classList.remove('is-active', 'is-revealing');
        });
    }

    function resetLevel(data) {
        lastData = data;
        calculationData = null;
        bollValues = [];
        macdValues = [];
        clearActiveCards();
        renderDeck();
    }

    function ensureCalculations(data) {
        if (calculationData === data) return;
        calculationData = data;
        bollValues = core.bollingerBands(data, 20, 2);
        macdValues = core.macd(data, 12, 26, 9);
    }

    function visibleGeometry(snapshot) {
        const start = Math.max(0, snapshot.day - snapshot.visibleDays + 1);
        let minimum = Infinity;
        let maximum = -Infinity;
        for (let index = start; index <= snapshot.day; index += 1) {
            const row = snapshot.data[index];
            const low = Number(row?.low);
            const high = Number(row?.high);
            if (Number.isFinite(low)) minimum = Math.min(minimum, low);
            if (Number.isFinite(high)) maximum = Math.max(maximum, high);
        }
        if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) return null;
        const padding = ((maximum - minimum) * 0.1) || 1;
        minimum -= padding;
        maximum += padding;
        const chartHeight = overlay.height * 0.7;
        const candleWidth = overlay.width / snapshot.visibleDays;
        return {
            start,
            minimum,
            maximum,
            chartHeight,
            candleWidth,
            x(index) { return ((index - start) * candleWidth) + (candleWidth / 2); },
            y(value) { return chartHeight - (((value - minimum) / (maximum - minimum)) * chartHeight); },
        };
    }

    function revealProgress(type, now) {
        const startedAt = revealStartedAt[type];
        if (!startedAt) return 1;
        const progress = Math.min(1, Math.max(0, (now - startedAt) / REVEAL_MS));
        if (progress >= 1) {
            revealStartedAt = { ...revealStartedAt, [type]: 0 };
            buttons[type]?.classList.remove('is-revealing');
        }
        return progress;
    }

    function drawScanEdge(progress, top, bottom, color) {
        if (progress >= 1) return;
        const x = Math.max(1, Math.min(overlay.width - 1, overlay.width * progress));
        context.save();
        context.strokeStyle = color;
        context.lineWidth = 2;
        context.shadowColor = color;
        context.shadowBlur = 8;
        context.beginPath();
        context.moveTo(x, top);
        context.lineTo(x, bottom);
        context.stroke();
        context.shadowBlur = 0;
        context.restore();
    }

    function linePath(values, snapshot, geometry, property, color, width = 2) {
        context.beginPath();
        let started = false;
        for (let index = geometry.start; index <= snapshot.day; index += 1) {
            const value = Number(values[index]?.[property]);
            if (!Number.isFinite(value)) continue;
            const x = geometry.x(index);
            const y = geometry.y(value);
            if (!started) {
                context.moveTo(x, y);
                started = true;
            } else {
                context.lineTo(x, y);
            }
        }
        if (!started) return;
        context.strokeStyle = color;
        context.lineWidth = width;
        context.lineJoin = 'bevel';
        context.shadowColor = color;
        context.shadowBlur = 4;
        context.stroke();
        context.shadowBlur = 0;
    }

    function drawBoll(snapshot, geometry, progress) {
        const revealWidth = overlay.width * progress;
        context.save();
        context.beginPath();
        context.rect(0, 0, revealWidth, geometry.chartHeight);
        context.clip();

        context.beginPath();
        let upperStarted = false;
        for (let index = geometry.start; index <= snapshot.day; index += 1) {
            const value = Number(bollValues[index]?.upper);
            if (!Number.isFinite(value)) continue;
            const x = geometry.x(index);
            const y = geometry.y(value);
            if (!upperStarted) {
                context.moveTo(x, y);
                upperStarted = true;
            } else {
                context.lineTo(x, y);
            }
        }
        for (let index = snapshot.day; index >= geometry.start; index -= 1) {
            const value = Number(bollValues[index]?.lower);
            if (!Number.isFinite(value)) continue;
            context.lineTo(geometry.x(index), geometry.y(value));
        }
        if (upperStarted) {
            context.closePath();
            context.fillStyle = 'rgba(92, 231, 242, 0.045)';
            context.fill();
        }

        linePath(bollValues, snapshot, geometry, 'upper', '#5ce7f2', 2);
        linePath(bollValues, snapshot, geometry, 'middle', '#ffd84a', 1.5);
        linePath(bollValues, snapshot, geometry, 'lower', '#ad91ff', 2);

        if (progress > 0.55) {
            context.fillStyle = 'rgba(6, 12, 20, 0.78)';
            context.fillRect(8, 8, 118, 20);
            context.fillStyle = '#dffcff';
            context.font = '7px "Press Start 2P", monospace';
            context.textAlign = 'left';
            context.fillText('BOLL · 20 · 2σ', 14, 21);
        }
        context.restore();
        drawScanEdge(progress, 0, geometry.chartHeight, '#5ce7f2');
    }

    function drawMacdLine(property, color, snapshot, geometry, y) {
        context.beginPath();
        let started = false;
        for (let index = geometry.start; index <= snapshot.day; index += 1) {
            const value = Number(macdValues[index]?.[property]);
            if (!Number.isFinite(value)) continue;
            const x = geometry.x(index);
            const pointY = y(value);
            if (!started) {
                context.moveTo(x, pointY);
                started = true;
            } else {
                context.lineTo(x, pointY);
            }
        }
        if (!started) return;
        context.strokeStyle = color;
        context.lineWidth = 1.5;
        context.lineJoin = 'bevel';
        context.stroke();
    }

    function drawProfitLane(snapshot, geometry, top, height) {
        const end = Math.min(snapshot.day, snapshot.totals.length - 1);
        if (end < geometry.start) return;
        const values = [];
        for (let index = geometry.start; index <= end; index += 1) {
            const value = Number(snapshot.totals[index]);
            if (Number.isFinite(value)) values.push(value);
        }
        if (!values.length) return;

        const startCash = Number.isFinite(snapshot.startCash) && snapshot.startCash > 0
            ? snapshot.startCash
            : values[0];
        let minimum = Math.min(startCash, ...values);
        let maximum = Math.max(startCash, ...values);
        const padding = ((maximum - minimum) * 0.12) || Math.max(1, startCash * 0.01);
        minimum -= padding;
        maximum += padding;
        const y = (value) => top + height - (((value - minimum) / (maximum - minimum)) * height);

        context.fillStyle = 'rgba(5, 9, 16, 0.72)';
        context.fillRect(0, top, overlay.width, height);
        context.strokeStyle = 'rgba(159, 176, 196, 0.26)';
        context.beginPath();
        context.moveTo(0, top + 0.5);
        context.lineTo(overlay.width, top + 0.5);
        context.stroke();

        const referenceY = y(startCash);
        context.strokeStyle = 'rgba(255, 216, 74, 0.18)';
        context.setLineDash([4, 5]);
        context.beginPath();
        context.moveTo(0, referenceY);
        context.lineTo(overlay.width, referenceY);
        context.stroke();
        context.setLineDash([]);

        context.beginPath();
        let started = false;
        for (let index = geometry.start; index <= end; index += 1) {
            const value = Number(snapshot.totals[index]);
            if (!Number.isFinite(value)) continue;
            const x = geometry.x(index);
            const pointY = y(value);
            if (!started) {
                context.moveTo(x, pointY);
                started = true;
            } else {
                context.lineTo(x, pointY);
            }
        }
        if (started) {
            context.strokeStyle = '#ffd84a';
            context.lineWidth = 2;
            context.shadowColor = '#ffd84a';
            context.shadowBlur = 4;
            context.stroke();
            context.shadowBlur = 0;
        }

        context.fillStyle = '#ffd84a';
        context.font = '7px "Press Start 2P", monospace';
        context.textAlign = 'left';
        context.fillText('P/L', 8, top + 11);
    }

    function drawMacd(snapshot, geometry, progress) {
        const panelTop = geometry.chartHeight + Math.max(10, overlay.height * 0.018);
        const panelHeight = overlay.height * 0.12;
        const panelBottom = panelTop + panelHeight;
        const profitTop = panelBottom + Math.max(5, overlay.height * 0.008);
        const profitHeight = Math.max(34, Math.min(overlay.height * 0.1, overlay.height - profitTop - 12));

        const visible = [];
        for (let index = geometry.start; index <= snapshot.day; index += 1) {
            const row = macdValues[index];
            if (row) visible.push(row);
        }
        const magnitudes = visible.flatMap((row) => [row.line, row.signal, row.histogram])
            .filter(Number.isFinite)
            .map(Math.abs);
        const maximum = Math.max(...magnitudes, 0.0001);
        const zero = panelTop + (panelHeight / 2);
        const y = (value) => zero - ((value / maximum) * (panelHeight * 0.38));
        const revealWidth = overlay.width * progress;

        context.save();
        context.beginPath();
        context.rect(0, panelTop, revealWidth, (profitTop + profitHeight) - panelTop);
        context.clip();

        context.fillStyle = 'rgba(5, 9, 16, 0.82)';
        context.fillRect(0, panelTop, overlay.width, panelHeight);
        context.strokeStyle = 'rgba(159, 176, 196, 0.3)';
        context.beginPath();
        context.moveTo(0, panelTop + 0.5);
        context.lineTo(overlay.width, panelTop + 0.5);
        context.moveTo(0, panelBottom - 0.5);
        context.lineTo(overlay.width, panelBottom - 0.5);
        context.stroke();

        context.beginPath();
        context.moveTo(0, zero + 0.5);
        context.lineTo(overlay.width, zero + 0.5);
        context.strokeStyle = 'rgba(255, 216, 74, 0.2)';
        context.stroke();

        for (let index = geometry.start; index <= snapshot.day; index += 1) {
            const histogram = Number(macdValues[index]?.histogram);
            if (!Number.isFinite(histogram)) continue;
            const x = geometry.x(index);
            const barY = y(histogram);
            context.fillStyle = histogram >= 0
                ? 'rgba(70, 224, 138, 0.74)'
                : 'rgba(255, 103, 116, 0.74)';
            context.fillRect(
                x - Math.max(1, geometry.candleWidth * 0.25),
                Math.min(zero, barY),
                Math.max(2, geometry.candleWidth * 0.5),
                Math.max(1, Math.abs(zero - barY))
            );
        }

        drawMacdLine('line', '#5ce7f2', snapshot, geometry, y);
        drawMacdLine('signal', '#ffd84a', snapshot, geometry, y);

        context.fillStyle = '#dffcff';
        context.font = '7px "Press Start 2P", monospace';
        context.textAlign = 'left';
        context.fillText('MACD · 12 · 26 · 9', 8, panelTop + 11);

        drawProfitLane(snapshot, geometry, profitTop, profitHeight);
        context.restore();
        drawScanEdge(progress, panelTop, profitTop + profitHeight, '#ad91ff');
    }

    function showFeedback(message, kind = 'info') {
        window.clearTimeout(feedbackTimer);
        feedback.textContent = message;
        feedback.dataset.kind = kind;
        feedback.classList.add('is-visible');
        feedbackTimer = window.setTimeout(() => feedback.classList.remove('is-visible'), 1350);
    }

    function activate(type) {
        const snapshot = gameSnapshot();
        if (!TYPES.includes(type) || !isGameVisible(snapshot) || !snapshot.data.length) return;
        const inventory = store.getSnapshot();
        if (!inventory.signedIn) return;
        if (active[type]) {
            showFeedback(text(`${type.toUpperCase()} already deployed`, `${type.toUpperCase()} 已部署`));
            return;
        }
        if (!store.consume(type)) {
            showFeedback(text(`No ${type.toUpperCase()} power-ups left`, `${type.toUpperCase()} 道具已用完`), 'empty');
            return;
        }

        active = { ...active, [type]: true };
        revealStartedAt = { ...revealStartedAt, [type]: performance.now() };
        buttons[type]?.classList.add('is-active', 'is-revealing');
        navigator.vibrate?.([16, 20, 16]);
        showFeedback(
            type === 'boll'
                ? text('BOLL power-up deployed', 'BOLL 道具已部署')
                : text('MACD power-up deployed', 'MACD 道具已部署'),
            'success'
        );
        renderDeck();
    }

    function randomUnit() {
        if (window.crypto?.getRandomValues) {
            const values = new Uint32Array(1);
            window.crypto.getRandomValues(values);
            return values[0] / 4294967296;
        }
        return Math.random();
    }

    function drawCard() {
        if (!store.getSnapshot().isPro) return;
        const type = store.draw(randomUnit());
        if (!type) return;
        navigator.vibrate?.(24);
        showFeedback(
            text(`Drew 1 ${type.toUpperCase()} power-up`, `抽到 1 个 ${type.toUpperCase()} 道具`),
            'success'
        );
        renderDeck();
    }

    function renderDeck() {
        const inventory = store.getSnapshot();
        if (handLabel) handLabel.textContent = text('POWER-UP HAND', '战术道具');
        if (subtitles.boll) subtitles.boll.textContent = text('VOLATILITY SCAN', '波动扫描');
        if (subtitles.macd) subtitles.macd.textContent = text('MOMENTUM SCAN', '动量扫描');

        TYPES.forEach((type) => {
            const button = buttons[type];
            const count = deck.querySelector(`[data-card-count="${type}"]`);
            if (count) count.textContent = `×${inventory[type]}`;
            if (!button) return;
            button.classList.toggle('is-active', inventory.signedIn && active[type]);
            button.classList.toggle('is-empty', inventory.signedIn && inventory[type] < 1 && !active[type]);
            button.setAttribute('aria-pressed', String(inventory.signedIn && active[type]));
            button.setAttribute('aria-label', text(
                `Deploy ${type.toUpperCase()} power-up. ${inventory[type]} remaining.`,
                `部署 ${type.toUpperCase()} 道具，剩余 ${inventory[type]} 个。`
            ));
        });

        if (!inventory.isPro) {
            drawButton.hidden = true;
            drawButton.disabled = true;
            drawButton.removeAttribute('data-mode');
            drawButton.textContent = '';
        } else {
            const remaining = inventory.dailyDrawsRemaining;
            drawButton.hidden = false;
            drawButton.disabled = remaining < 1;
            drawButton.dataset.mode = remaining ? 'draw' : 'complete';
            drawButton.textContent = remaining
                ? text(`POWER-UP PACK · ${remaining} LEFT`, `道具包 · 剩余 ${remaining} 次`)
                : text('DAILY PACK EMPTY', '今日道具包已抽完');
        }
    }

    Object.entries(buttons).forEach(([type, button]) => {
        button.addEventListener('pointerdown', (event) => event.stopPropagation());
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            activate(type);
        });
    });

    drawButton.addEventListener('pointerdown', (event) => event.stopPropagation());
    drawButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        drawCard();
    });

    window.addEventListener('keydown', (event) => {
        if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || !hasCardAccess()) return;
        if (event.key === '1' || event.code === 'Digit1') {
            event.preventDefault();
            activate('boll');
        } else if (event.key === '2' || event.code === 'Digit2') {
            event.preventDefault();
            activate('macd');
        }
    }, true);

    window.addEventListener('flappyk:indicator-cards', (event) => {
        if (event.detail?.signedIn === false) clearActiveCards();
        renderDeck();
    });
    window.addEventListener('flappyk:ui-state', renderDeck);
    window.addEventListener('flappyk:language-changed', renderDeck);

    function frame(now) {
        const snapshot = gameSnapshot();
        if (snapshot.data !== lastData && snapshot.data.length) resetLevel(snapshot.data);
        const visible = isGameVisible(snapshot);
        const cardAccess = hasCardAccess();
        deck.hidden = !visible || !cardAccess;
        syncOverlaySize();
        context.clearRect(0, 0, overlay.width, overlay.height);
        if (visible && cardAccess && snapshot.data.length && (active.boll || active.macd)) {
            ensureCalculations(snapshot.data);
            const geometry = visibleGeometry(snapshot);
            if (geometry) {
                if (active.boll) drawBoll(snapshot, geometry, revealProgress('boll', now));
                if (active.macd) drawMacd(snapshot, geometry, revealProgress('macd', now));
            }
        }
        requestAnimationFrame(frame);
    }

    renderDeck();
    requestAnimationFrame(frame);

    window.FlappyKIndicatorCards = Object.freeze({
        activate,
        drawCard,
        get active() { return Object.freeze({ ...active }); },
        get overlay() { return overlay; },
        get deck() { return deck; },
    });
})();
