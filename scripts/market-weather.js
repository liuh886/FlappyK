(() => {
    'use strict';

    const root = document.documentElement;
    const gameContainer = document.getElementById('game-container');
    const startScreen = document.getElementById('start-screen');
    const EPSILON = 0.00001;
    let previousMetrics = null;
    let eventTimer = 0;
    let syncFrame = 0;

    function isChinese() {
        return root.dataset.flappykLanguage === 'zh'
            || root.lang.toLowerCase().startsWith('zh');
    }

    function text(english, chinese) {
        return isChinese() ? chinese : english;
    }

    function createElement(tagName, className, textContent = '') {
        const element = document.createElement(tagName);
        element.className = className;
        if (textContent) element.textContent = textContent;
        return element;
    }

    function setText(element, value) {
        if (element && element.textContent !== value) element.textContent = value;
    }

    function installWeatherLayer() {
        if (!gameContainer || document.getElementById('market-weather-layer')) return;

        const layer = createElement('div', 'market-weather-layer');
        layer.id = 'market-weather-layer';
        layer.dataset.weather = 'clear';

        const decorativeElements = [
            createElement('span', 'weather-sun'),
            createElement('span', 'weather-cloud-bank'),
            createElement('span', 'weather-horizon'),
            createElement('span', 'weather-rain'),
            createElement('span', 'weather-vignette'),
        ];
        decorativeElements.forEach((element) => element.setAttribute('aria-hidden', 'true'));
        layer.append(...decorativeElements);

        const status = createElement('div', 'weather-status');
        status.id = 'weather-status';
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        status.setAttribute('aria-atomic', 'true');
        setText(status, text('CLEAR · READY', '晴空 · 准备开始'));
        layer.appendChild(status);

        gameContainer.prepend(layer);
        gameContainer.classList.add('arcade-weather-ready');
        root.dataset.marketWeather = 'clear';
    }

    function installHomeConsole() {
        if (!startScreen || startScreen.querySelector('.home-console-bezel')) return;

        const bezel = createElement('div', 'home-console-bezel');
        const topLine = createElement('div', 'home-console-topline');
        const brand = createElement('span', 'home-console-brand', 'FLAPPYK · POCKET MARKET ARCADE');
        const lamps = createElement('span', 'home-console-lamps');
        lamps.setAttribute('aria-hidden', 'true');
        lamps.append(document.createElement('span'), document.createElement('span'), document.createElement('span'));
        topLine.append(brand, lamps);

        const screen = createElement('div', 'home-console-screen');
        const kicker = createElement('div', 'home-console-kicker', text('HIDDEN MARKET · PRESS PLAY', '隐藏市场 · 按下开始'));
        screen.appendChild(kicker);
        [...startScreen.children].forEach((child) => screen.appendChild(child));

        const footer = createElement('div', 'home-console-footer');
        const speaker = createElement('span', 'home-console-speaker');
        speaker.setAttribute('aria-hidden', 'true');
        for (let index = 0; index < 14; index += 1) speaker.appendChild(document.createElement('span'));
        const legend = createElement('span', 'home-console-legend', text('BUY · SELL · BEAT THE MARKET', '买入 · 卖出 · 跑赢市场'));
        footer.append(speaker, legend);

        bezel.append(topLine, screen, footer);
        startScreen.replaceChildren(bezel);
        startScreen.classList.add('arcade-home');
    }

    function readLiveMetrics() {
        if (typeof currentData === 'undefined'
            || !Array.isArray(currentData)
            || typeof dayIndex === 'undefined'
            || !currentData[dayIndex]) return null;

        const startPrice = Number(currentData[0]?.close);
        const currentPrice = Number(currentData[dayIndex]?.close);
        const startingCash = Number(
            typeof levelStartCash !== 'undefined' && levelStartCash
                ? levelStartCash
                : (typeof INITIAL_CASH !== 'undefined' ? INITIAL_CASH : 0),
        );
        if (!Number.isFinite(startPrice)
            || startPrice <= 0
            || !Number.isFinite(currentPrice)
            || !Number.isFinite(startingCash)
            || startingCash <= 0) return null;

        const liveCash = Number(typeof cash !== 'undefined' ? cash : 0);
        const liveShares = Number(typeof shares !== 'undefined' ? shares : 0);
        const total = liveCash + (liveShares * currentPrice);
        const playerReturn = (total - startingCash) / startingCash;
        const marketReturn = (currentPrice - startPrice) / startPrice;
        return {
            playerReturn,
            marketReturn,
            excess: playerReturn - marketReturn,
        };
    }

    function classifyWeather(metrics) {
        if (!metrics || !Number.isFinite(metrics.playerReturn) || !Number.isFinite(metrics.excess)) {
            return 'clear';
        }
        if (metrics.playerReturn < -EPSILON) return 'rain';
        if (metrics.excess < -EPSILON) return 'cloudy';
        return 'clear';
    }

    function stateLabel(state) {
        if (state === 'rain') return text('RAIN · RETURN < 0', '阴雨 · 收益为负');
        if (state === 'cloudy') return text('CLOUDY · MARKET AHEAD', '多云 · 市场领先');
        return text('CLEAR · AHEAD', '晴空 · 跑赢市场');
    }

    function setWeatherState(state) {
        const layer = document.getElementById('market-weather-layer');
        const status = document.getElementById('weather-status');
        if (!layer || !status) return;

        const changed = layer.dataset.weather !== state;
        if (changed) layer.dataset.weather = state;
        if (root.dataset.marketWeather !== state) root.dataset.marketWeather = state;
        if (!status.classList.contains('is-event')) setText(status, stateLabel(state));

        if (changed && gameContainer) {
            gameContainer.classList.remove('weather-shift');
            requestAnimationFrame(() => gameContainer.classList.add('weather-shift'));
            window.setTimeout(() => gameContainer.classList.remove('weather-shift'), 420);
        }
    }

    function showWeatherEvent(message, tone) {
        const status = document.getElementById('weather-status');
        if (!status) return;

        window.clearTimeout(eventTimer);
        setText(status, message);
        status.dataset.tone = tone;
        status.classList.add('is-event');
        eventTimer = window.setTimeout(() => {
            status.classList.remove('is-event');
            delete status.dataset.tone;
            setText(status, stateLabel(root.dataset.marketWeather || 'clear'));
        }, 1150);
    }

    function detectCrossing(previous, current) {
        if (!previous || !current) return;

        if (previous.playerReturn >= -EPSILON && current.playerReturn < -EPSILON) {
            showWeatherEvent(text('RETURN BELOW ZERO', '收益转负'), 'negative');
            return;
        }
        if (previous.playerReturn < -EPSILON && current.playerReturn >= -EPSILON) {
            showWeatherEvent(text('BACK IN GREEN', '收益回正'), 'positive');
            return;
        }
        if (previous.excess >= -EPSILON && current.excess < -EPSILON) {
            showWeatherEvent(text('MARKET MOVES AHEAD', '超额收益转负'), 'negative');
            return;
        }
        if (previous.excess < -EPSILON && current.excess >= -EPSILON) {
            showWeatherEvent(text('AHEAD OF MARKET', '超额收益回正'), 'positive');
        }
    }

    function applyMetrics(metrics, options = {}) {
        const state = classifyWeather(metrics);
        setWeatherState(state);
        if (!options.silent) detectCrossing(previousMetrics, metrics);
        previousMetrics = metrics ? { ...metrics } : null;
        return state;
    }

    function syncWeather() {
        const homeActive = startScreen?.classList.contains('active');
        if (homeActive) {
            setWeatherState('clear');
            previousMetrics = null;
            const status = document.getElementById('weather-status');
            if (status && !status.classList.contains('is-event')) {
                setText(status, text('CLEAR · READY', '晴空 · 准备开始'));
            }
            return;
        }

        const metrics = readLiveMetrics();
        if (metrics) applyMetrics(metrics);
    }

    function scheduleSync() {
        if (syncFrame) return;
        syncFrame = requestAnimationFrame(() => {
            syncFrame = 0;
            syncWeather();
        });
    }

    function bindPressFeedback() {
        const selector = '#start-btn, #daily-run-btn, #btn-buy, #btn-sell, .trade-hint-buy, .trade-hint-sell';
        document.addEventListener('pointerdown', (event) => {
            const target = event.target.closest?.(selector);
            if (!target) return;
            target.classList.add('arcade-pressable', 'is-arcade-pressed');
        });
        const release = () => {
            document.querySelectorAll('.is-arcade-pressed').forEach((element) => {
                element.classList.remove('is-arcade-pressed');
            });
        };
        document.addEventListener('pointerup', release);
        document.addEventListener('pointercancel', release);
    }

    function updateLanguage() {
        const brand = document.querySelector('.home-console-brand');
        const kicker = document.querySelector('.home-console-kicker');
        const legend = document.querySelector('.home-console-legend');
        setText(brand, 'FLAPPYK · POCKET MARKET ARCADE');
        setText(kicker, text('HIDDEN MARKET · PRESS PLAY', '隐藏市场 · 按下开始'));
        setText(legend, text('BUY · SELL · BEAT THE MARKET', '买入 · 卖出 · 跑赢市场'));
        scheduleSync();
    }

    function init() {
        root.style.setProperty('--pixel-font-readable', "var(--pixel-font-ui, 'Pixelify Sans', monospace)");
        installWeatherLayer();
        installHomeConsole();
        bindPressFeedback();
        syncWeather();

        if (gameContainer) {
            new MutationObserver(scheduleSync).observe(gameContainer, {
                subtree: true,
                childList: true,
                characterData: true,
                attributes: true,
                attributeFilter: ['class', 'hidden', 'aria-hidden'],
            });
        }
        new MutationObserver(updateLanguage).observe(root, {
            attributes: true,
            attributeFilter: ['lang', 'data-flappyk-language'],
        });
        window.addEventListener('flappyk:layout-state', scheduleSync);
        window.addEventListener('resize', scheduleSync);
    }

    init();

    window.FlappyKMarketWeather = {
        classifyWeather,
        applyMetrics,
        readLiveMetrics,
        setWeatherState,
        syncWeather,
        scheduleSync,
    };
})();
