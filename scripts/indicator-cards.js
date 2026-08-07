(() => {
    'use strict';

    const core = window.FlappyKIndicatorCore;
    const store = window.FlappyKIndicatorCardStore;
    const baseCanvas = document.getElementById('game-canvas');
    const container = document.getElementById('game-container');
    if (!core || !store || !baseCanvas || !container) return;

    const root = document.documentElement;
    const overlay = document.createElement('canvas');
    overlay.id = 'indicator-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    container.insertBefore(overlay, baseCanvas.nextSibling);
    const context = overlay.getContext('2d');

    const deck = document.createElement('aside');
    deck.id = 'indicator-card-deck';
    deck.className = 'indicator-card-deck';
    deck.setAttribute('aria-label', 'Indicator cards');
    deck.hidden = true;
    deck.innerHTML = `
        <div class="indicator-card-row">
            <button class="indicator-card indicator-card--boll" type="button" data-indicator-card="boll" aria-keyshortcuts="1">
                <span class="indicator-card-key">1</span>
                <span class="indicator-card-copy"><strong>BOLL</strong><small data-card-subtitle="boll">ON K-LINE</small></span>
                <span class="indicator-card-count" data-card-count="boll">×0</span>
            </button>
            <button class="indicator-card indicator-card--macd" type="button" data-indicator-card="macd" aria-keyshortcuts="2">
                <span class="indicator-card-key">2</span>
                <span class="indicator-card-copy"><strong>MACD</strong><small data-card-subtitle="macd">LOWER PANEL</small></span>
                <span class="indicator-card-count" data-card-count="macd">×0</span>
            </button>
        </div>
        <button class="indicator-card-draw" type="button" data-indicator-draw></button>
        <div class="indicator-card-feedback" role="status" aria-live="polite"></div>`;
    container.appendChild(deck);

    const buttons = Object.fromEntries(
        Array.from(deck.querySelectorAll('[data-indicator-card]'))
            .map((button) => [button.dataset.indicatorCard, button])
    );
    const drawButton = deck.querySelector('[data-indicator-draw]');
    const feedback = deck.querySelector('.indicator-card-feedback');

    let active = { boll: false, macd: false };
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
        };
    }

    function isGameVisible(snapshot = gameSnapshot()) {
        const state = root.dataset.uiState;
        return snapshot.playing || state === 'playing' || state === 'paused';
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

    function resetLevel(data) {
        lastData = data;
        calculationData = null;
        bollValues = [];
        macdValues = [];
        active = { boll: false, macd: false };
        deck.querySelectorAll('.indicator-card').forEach((button) => button.classList.remove('is-active'));
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
        context.shadowBlur = 5;
        context.stroke();
        context.shadowBlur = 0;
    }

    function drawBoll(snapshot, geometry) {
        context.save();
        context.beginPath();
        context.rect(0, 0, overlay.width, geometry.chartHeight);
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
            } else context.lineTo(x, y);
        }
        for (let index = snapshot.day; index >= geometry.start; index -= 1) {
            const value = Number(bollValues[index]?.lower);
            if (!Number.isFinite(value)) continue;
            context.lineTo(geometry.x(index), geometry.y(value));
        }
        if (upperStarted) {
            context.closePath();
            context.fillStyle = 'rgba(92, 231, 242, 0.06)';
            context.fill();
        }

        linePath(bollValues, snapshot, geometry, 'upper', '#5ce7f2', 2);
        linePath(bollValues, snapshot, geometry, 'middle', '#ffd84a', 1.5);
        linePath(bollValues, snapshot, geometry, 'lower', '#ad91ff', 2);
        context.fillStyle = 'rgba(7, 10, 15, 0.78)';
        context.fillRect(8, 8, 126, 23);
        context.strokeStyle = 'rgba(92, 231, 242, 0.66)';
        context.strokeRect(8.5, 8.5, 125, 22);
        context.fillStyle = '#dffcff';
        context.font = '8px "Press Start 2P", monospace';
        context.textAlign = 'left';
        context.fillText('BOLL 20 · 2σ', 16, 23);
        context.restore();
    }

    function drawMacd(snapshot, geometry) {
        const top = overlay.height * 0.75;
        const height = overlay.height * 0.2;
        const bottom = top + height;
        const visible = [];
        for (let index = geometry.start; index <= snapshot.day; index += 1) {
            const row = macdValues[index];
            if (row) visible.push(row);
        }
        const magnitudes = visible.flatMap((row) => [row.line, row.signal, row.histogram])
            .filter(Number.isFinite)
            .map(Math.abs);
        const maximum = Math.max(...magnitudes, 0.0001);
        const zero = top + (height / 2);
        const y = (value) => zero - ((value / maximum) * (height * 0.42));

        context.save();
        context.fillStyle = 'rgba(5, 9, 16, 0.94)';
        context.fillRect(0, top, overlay.width, height);
        context.strokeStyle = 'rgba(169, 181, 199, 0.4)';
        context.lineWidth = 1;
        context.strokeRect(0.5, top + 0.5, overlay.width - 1, height - 1);
        context.beginPath();
        context.moveTo(0, zero + 0.5);
        context.lineTo(overlay.width, zero + 0.5);
        context.strokeStyle = 'rgba(255, 216, 74, 0.28)';
        context.stroke();

        for (let index = geometry.start; index <= snapshot.day; index += 1) {
            const histogram = Number(macdValues[index]?.histogram);
            if (!Number.isFinite(histogram)) continue;
            const x = geometry.x(index);
            const barY = y(histogram);
            context.fillStyle = histogram >= 0 ? 'rgba(70, 224, 138, 0.78)' : 'rgba(255, 103, 116, 0.78)';
            context.fillRect(
                x - Math.max(1, geometry.candleWidth * 0.28),
                Math.min(zero, barY),
                Math.max(2, geometry.candleWidth * 0.56),
                Math.max(1, Math.abs(zero - barY))
            );
        }

        const drawMacdLine = (property, color) => {
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
                } else context.lineTo(x, pointY);
            }
            if (!started) return;
            context.strokeStyle = color;
            context.lineWidth = 1.5;
            context.lineJoin = 'bevel';
            context.stroke();
        };
        drawMacdLine('line', '#5ce7f2');
        drawMacdLine('signal', '#ffd84a');

        context.fillStyle = 'rgba(5, 9, 16, 0.88)';
        context.fillRect(8, top + 8, 128, 20);
        context.fillStyle = '#dffcff';
        context.font = '8px "Press Start 2P", monospace';
        context.textAlign = 'left';
        context.fillText('MACD 12 · 26 · 9', 15, top + 22);
        context.restore();
    }

    function showFeedback(message, kind = 'info') {
        window.clearTimeout(feedbackTimer);
        feedback.textContent = message;
        feedback.dataset.kind = kind;
        feedback.classList.add('is-visible');
        feedbackTimer = window.setTimeout(() => feedback.classList.remove('is-visible'), 1500);
    }

    function activate(type) {
        const snapshot = gameSnapshot();
        if (!isGameVisible(snapshot) || !snapshot.data.length) return;
        if (active[type]) {
            showFeedback(text(`${type.toUpperCase()} already revealed`, `${type.toUpperCase()} 已显示`));
            return;
        }
        const inventory = store.getSnapshot();
        if (!inventory.signedIn) {
            showFeedback(text('Sign in to receive 3 + 3 cards', '登录即可领取两类卡牌各 3 张'), 'locked');
            window.HaoAccount?.open?.();
            return;
        }
        if (!store.consume(type)) {
            showFeedback(text(`No ${type.toUpperCase()} cards left`, `${type.toUpperCase()} 卡牌已用完`), 'empty');
            return;
        }
        active = { ...active, [type]: true };
        buttons[type]?.classList.add('is-active');
        navigator.vibrate?.([18, 24, 18]);
        showFeedback(
            type === 'boll'
                ? text('BOLL revealed on K-line', 'BOLL 已显示在 K 线上')
                : text('MACD revealed below', 'MACD 已显示在下方'),
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
        const type = store.draw(randomUnit());
        if (!type) return;
        navigator.vibrate?.(24);
        showFeedback(
            text(`Drew 1 ${type.toUpperCase()} card`, `抽到 1 张 ${type.toUpperCase()} 卡`),
            'success'
        );
        renderDeck();
    }

    function renderDeck() {
        const inventory = store.getSnapshot();
        ['boll', 'macd'].forEach((type) => {
            const button = buttons[type];
            const count = deck.querySelector(`[data-card-count="${type}"]`);
            if (count) count.textContent = `×${inventory[type]}`;
            if (!button) return;
            button.classList.toggle('is-active', active[type]);
            button.classList.toggle('is-empty', inventory.signedIn && inventory[type] < 1 && !active[type]);
            button.classList.toggle('is-locked', !inventory.signedIn);
            button.setAttribute('aria-pressed', String(active[type]));
            button.setAttribute('aria-label', text(
                `Use ${type.toUpperCase()} card. ${inventory[type]} remaining.`,
                `使用 ${type.toUpperCase()} 卡牌，剩余 ${inventory[type]} 张。`
            ));
        });

        if (!inventory.signedIn) {
            drawButton.disabled = false;
            drawButton.dataset.mode = 'signin';
            drawButton.textContent = text('SIGN IN · GET BOLL ×3 + MACD ×3', '登录 · 领取 BOLL ×3 + MACD ×3');
        } else if (!inventory.isPro) {
            drawButton.disabled = true;
            drawButton.dataset.mode = 'pro-locked';
            drawButton.textContent = text('PRO · 3 DAILY DRAWS', 'PRO · 每日 3 次抽卡');
        } else {
            const remaining = inventory.dailyDrawsRemaining;
            drawButton.disabled = remaining < 1;
            drawButton.dataset.mode = remaining ? 'draw' : 'complete';
            drawButton.textContent = remaining
                ? text(`DAILY DRAW · ${remaining} LEFT`, `每日抽卡 · 剩余 ${remaining} 次`)
                : text('DAILY DRAWS COMPLETE', '今日抽卡已完成');
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
        const inventory = store.getSnapshot();
        if (!inventory.signedIn) {
            window.HaoAccount?.open?.();
            return;
        }
        if (inventory.isPro) drawCard();
    });

    window.addEventListener('keydown', (event) => {
        if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key === '1' || event.code === 'Digit1') {
            event.preventDefault();
            activate('boll');
        } else if (event.key === '2' || event.code === 'Digit2') {
            event.preventDefault();
            activate('macd');
        }
    }, true);

    window.addEventListener('flappyk:indicator-cards', renderDeck);
    window.addEventListener('flappyk:ui-state', renderDeck);

    function frame() {
        const snapshot = gameSnapshot();
        if (snapshot.data !== lastData && snapshot.data.length) resetLevel(snapshot.data);
        const visible = isGameVisible(snapshot);
        deck.hidden = !visible;
        syncOverlaySize();
        context.clearRect(0, 0, overlay.width, overlay.height);
        if (visible && snapshot.data.length && (active.boll || active.macd)) {
            ensureCalculations(snapshot.data);
            const geometry = visibleGeometry(snapshot);
            if (geometry) {
                if (active.boll) drawBoll(snapshot, geometry);
                if (active.macd) drawMacd(snapshot, geometry);
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
