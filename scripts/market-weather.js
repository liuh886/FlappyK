(() => {
    'use strict';

    const root = document.documentElement;
    const gameContainer = document.getElementById('game-container');
    const uiLayer = document.getElementById('ui-layer');
    const startScreen = document.getElementById('start-screen');
    const EPSILON = 0.00001;
    const WEATHER_STATES = Object.freeze(['clear', 'cloudy', 'rain']);
    const WEATHER_DEBOUNCE_MS = 120;
    const WEATHER_STEP_MS = 560;
    const WEATHER_SETTLE_MS = 80;
    const PRESS_SELECTOR = [
        '#start-btn',
        '#daily-run-btn',
        '#btn-buy',
        '#btn-sell',
        '.speed-step',
        '#game-back-btn',
        '#pause-btn',
        '.home-secondary-actions button',
    ].join(', ');
    let previousMetrics = null;
    let eventTimer = 0;
    let syncFrame = 0;
    let weatherDebounceTimer = 0;
    let weatherTransitionToken = 0;
    let requestedWeather = 'clear';
    let visualWeather = 'clear';

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

    function delay(milliseconds) {
        return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
    }

    function prefersReducedMotion() {
        return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    }

    function readableButtonText(button) {
        if (!button) return '';
        return Array.from(button.childNodes)
            .filter((node) => (
                node.nodeType === Node.TEXT_NODE
                || !(node instanceof Element)
                || node.getAttribute('aria-hidden') !== 'true'
            ))
            .map((node) => node.textContent || '')
            .join('')
            .trim();
    }

    function syncPrimaryActionLabel() {
        const startButton = document.getElementById('start-btn');
        if (!startButton) return;
        const visibleLabel = readableButtonText(startButton);
        const label = visibleLabel || text('PLAY', '开始游戏');
        if (startButton.getAttribute('aria-label') !== label) {
            startButton.setAttribute('aria-label', label);
        }
    }

    function installPrimaryActionIcon() {
        const startButton = document.getElementById('start-btn');
        if (!startButton || startButton.querySelector('.home-play-icon')) return;
        const icon = createElement('span', 'home-play-icon', '▶');
        icon.setAttribute('aria-hidden', 'true');
        startButton.prepend(icon);
        startButton.classList.add('has-dom-play-icon');
        syncPrimaryActionLabel();
    }

    function installPixelTradeGlyphs() {
        const glyphs = [
            [document.querySelector('#btn-buy .trade-emoji'), '▲'],
            [document.querySelector('#btn-sell .trade-emoji'), '▼'],
        ];
        glyphs.forEach(([glyph, symbol]) => {
            if (!glyph) return;
            glyph.textContent = symbol;
            glyph.classList.add('pixel-trade-glyph');
            glyph.setAttribute('aria-hidden', 'true');
        });
    }

    function syncHomeUtilityPlacement() {
        const utilityBar = document.getElementById('home-utility-bar');
        if (!utilityBar || !gameContainer) return;
        const topLine = document.querySelector('.home-console-topline');
        const homeActive = startScreen?.classList.contains('active');
        const target = homeActive && topLine ? topLine : gameContainer;
        if (utilityBar.parentElement !== target) target.appendChild(utilityBar);
        utilityBar.dataset.arcadePlacement = homeActive && topLine ? 'console' : 'game';
    }

    function syncWeatherStatusPlacement() {
        const status = document.getElementById('weather-status');
        if (!status) return;
        const rail = document.getElementById('game-hud-rail');
        const target = rail || uiLayer || gameContainer;
        if (!target || status.parentElement === target) return;
        if (rail) rail.prepend(status);
        else target.appendChild(status);
    }

    function installWeatherLayer() {
        if (!gameContainer || document.getElementById('market-weather-layer')) return;

        const layer = createElement('div', 'market-weather-layer');
        layer.id = 'market-weather-layer';
        layer.dataset.weather = 'clear';
        layer.dataset.weatherTarget = 'clear';

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

        gameContainer.prepend(layer);
        (uiLayer || gameContainer).appendChild(status);
        gameContainer.classList.add('arcade-weather-ready');
        root.dataset.marketWeather = 'clear';
        root.dataset.marketWeatherVisual = 'clear';
    }

    function installHomeConsole() {
        if (!startScreen || startScreen.querySelector('.home-console-bezel')) return;

        const legacyIntroParagraphs = Array.from(startScreen.querySelectorAll(':scope > p'));
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
        [...startScreen.children].forEach((child) => {
            if (legacyIntroParagraphs.includes(child)) {
                const visibleCopy = child.cloneNode(true);
                visibleCopy.classList.add('home-console-intro-copy');
                screen.appendChild(visibleCopy);
                return;
            }
            screen.appendChild(child);
        });

        const footer = createElement('div', 'home-console-footer');
        const speaker = createElement('span', 'home-console-speaker');
        speaker.setAttribute('aria-hidden', 'true');
        for (let index = 0; index < 14; index += 1) speaker.appendChild(document.createElement('span'));
        const legend = createElement('span', 'home-console-legend', text('BUY · SELL · BEAT THE MARKET', '买入 · 卖出 · 跑赢市场'));
        footer.append(speaker, legend);

        bezel.append(topLine, screen, footer);
        legacyIntroParagraphs.forEach((paragraph) => {
            paragraph.hidden = true;
            paragraph.setAttribute('aria-hidden', 'true');
            paragraph.classList.add('home-console-legacy-intro');
        });
        startScreen.replaceChildren(bezel, ...legacyIntroParagraphs);
        startScreen.classList.add('arcade-home');
        installPrimaryActionIcon();
        syncPrimaryActionLabel();
        syncHomeUtilityPlacement();
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

    function weatherPath(from, to) {
        const fromIndex = WEATHER_STATES.indexOf(from);
        const toIndex = WEATHER_STATES.indexOf(to);
        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return [];
        const direction = toIndex > fromIndex ? 1 : -1;
        const path = [];
        for (let index = fromIndex + direction; index !== toIndex + direction; index += direction) {
            path.push(WEATHER_STATES[index]);
        }
        return path;
    }

    function applyVisualWeather(state, transition = '') {
        const layer = document.getElementById('market-weather-layer');
        const status = document.getElementById('weather-status');
        if (!layer || !status || !WEATHER_STATES.includes(state)) return;

        visualWeather = state;
        layer.dataset.weather = state;
        root.dataset.marketWeatherVisual = state;
        if (transition) layer.dataset.weatherTransition = transition;
        else delete layer.dataset.weatherTransition;
        if (!status.classList.contains('is-event')) {
            status.style.removeProperty('transform');
            setText(status, stateLabel(state));
        }
    }

    async function runWeatherTransition(target, token) {
        const layer = document.getElementById('market-weather-layer');
        if (!layer || token !== weatherTransitionToken) return;
        const path = weatherPath(visualWeather, target);
        if (!path.length) {
            delete layer.dataset.weatherTransition;
            return;
        }

        for (const nextState of path) {
            if (token !== weatherTransitionToken) return;
            const fromState = visualWeather;
            layer.dataset.weatherTransition = `${fromState}-to-${nextState}`;
            await delay(WEATHER_STEP_MS);
            if (token !== weatherTransitionToken) return;
            applyVisualWeather(nextState, `${fromState}-to-${nextState}`);
            await delay(WEATHER_SETTLE_MS);
        }

        if (token === weatherTransitionToken) {
            delete layer.dataset.weatherTransition;
            layer.dataset.weatherTarget = target;
        }
    }

    function setWeatherState(state, options = {}) {
        const layer = document.getElementById('market-weather-layer');
        const status = document.getElementById('weather-status');
        if (!layer || !status || !WEATHER_STATES.includes(state)) return;

        const immediate = options.immediate || prefersReducedMotion();
        if (!immediate && requestedWeather === state) return;

        requestedWeather = state;
        root.dataset.marketWeather = state;
        layer.dataset.weatherTarget = state;
        window.clearTimeout(weatherDebounceTimer);

        if (immediate) {
            weatherTransitionToken += 1;
            applyVisualWeather(state);
            return;
        }

        const token = ++weatherTransitionToken;
        weatherDebounceTimer = window.setTimeout(() => {
            void runWeatherTransition(state, token);
        }, WEATHER_DEBOUNCE_MS);
    }

    function showWeatherEvent(message, tone) {
        const status = document.getElementById('weather-status');
        if (!status) return;

        window.clearTimeout(eventTimer);
        setText(status, message);
        status.dataset.tone = tone;
        status.classList.add('is-event');
        status.style.transform = 'translateY(2px)';
        eventTimer = window.setTimeout(() => {
            status.classList.remove('is-event');
            status.style.removeProperty('transform');
            delete status.dataset.tone;
            setText(status, stateLabel(visualWeather));
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
        setWeatherState(state, options);
        if (!options.silent) detectCrossing(previousMetrics, metrics);
        previousMetrics = metrics ? { ...metrics } : null;
        return state;
    }

    function syncWeather() {
        syncHomeUtilityPlacement();
        syncWeatherStatusPlacement();
        installPrimaryActionIcon();
        installPixelTradeGlyphs();
        const homeActive = startScreen?.classList.contains('active');
        if (homeActive) {
            setWeatherState('clear', { immediate: true });
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

    function mutationElement(mutation) {
        const target = mutation?.target;
        if (!target) return null;
        if (target.nodeType === Node.TEXT_NODE) return target.parentElement;
        return target instanceof Element ? target : null;
    }

    function isWeatherOwnedMutation(mutation) {
        const element = mutationElement(mutation);
        return Boolean(element?.closest?.('#market-weather-layer, #weather-status'));
    }

    function scheduleSyncFromMutations(mutations) {
        if (mutations.some((mutation) => !isWeatherOwnedMutation(mutation))) {
            scheduleSync();
        }
    }

    function setPressed(element, pressed) {
        if (!element) return;
        element.classList.add('arcade-pressable');
        element.classList.toggle('is-arcade-pressed', pressed);
    }

    function releasePressedControls() {
        document.querySelectorAll('.is-arcade-pressed').forEach((element) => {
            element.classList.remove('is-arcade-pressed');
        });
    }

    function pressTarget(event) {
        return event.target.closest?.(PRESS_SELECTOR) || null;
    }

    function bindPressFeedback() {
        document.addEventListener('pointerdown', (event) => {
            const target = pressTarget(event);
            if (target) setPressed(target, true);
        });
        document.addEventListener('pointerup', releasePressedControls);
        document.addEventListener('pointercancel', releasePressedControls);
        window.addEventListener('blur', releasePressedControls);

        document.addEventListener('keydown', (event) => {
            if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
            const target = pressTarget(event);
            if (target) setPressed(target, true);
        });
        document.addEventListener('keyup', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            const target = pressTarget(event);
            if (target) setPressed(target, false);
        });
    }

    function updateLanguage() {
        const brand = document.querySelector('.home-console-brand');
        const kicker = document.querySelector('.home-console-kicker');
        const legend = document.querySelector('.home-console-legend');
        setText(brand, 'FLAPPYK · POCKET MARKET ARCADE');
        setText(kicker, text('HIDDEN MARKET · PRESS PLAY', '隐藏市场 · 按下开始'));
        setText(legend, text('BUY · SELL · BEAT THE MARKET', '买入 · 卖出 · 跑赢市场'));
        installPrimaryActionIcon();
        installPixelTradeGlyphs();
        syncPrimaryActionLabel();
        applyVisualWeather(visualWeather);
        scheduleSync();
    }

    function init() {
        root.style.setProperty('--pixel-font-readable', "var(--pixel-font-ui, 'Pixelify Sans', monospace)");
        installWeatherLayer();
        installHomeConsole();
        installPixelTradeGlyphs();
        bindPressFeedback();
        syncWeather();

        const startButton = document.getElementById('start-btn');
        if (startButton) {
            new MutationObserver(syncPrimaryActionLabel).observe(startButton, {
                childList: true,
                characterData: true,
                subtree: true,
            });
        }
        if (gameContainer) {
            new MutationObserver(scheduleSyncFromMutations).observe(gameContainer, {
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
        window.addEventListener('orientationchange', scheduleSync);
    }

    init();

    window.FlappyKMarketWeather = {
        WEATHER_DEBOUNCE_MS,
        WEATHER_STEP_MS,
        classifyWeather,
        weatherPath,
        applyMetrics,
        readLiveMetrics,
        setWeatherState,
        syncWeather,
        scheduleSync,
        scheduleSyncFromMutations,
        syncHomeUtilityPlacement,
        syncWeatherStatusPlacement,
        installPrimaryActionIcon,
        installPixelTradeGlyphs,
        get requestedWeather() { return requestedWeather; },
        get visualWeather() { return visualWeather; },
    };
})();