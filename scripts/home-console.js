(() => {
    'use strict';

    const root = document.documentElement;
    const gameContainer = document.getElementById('game-container');
    const startScreen = document.getElementById('start-screen');

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

    function buildHomeWorldStrip() {
        const strip = createElement('section', 'home-world-strip');
        strip.setAttribute('aria-label', text('Three hidden market worlds', '三个隐藏市场世界'));

        const worlds = [
            ['crypto', '01', text('CRYPTO', '加密市场')],
            ['ashare', '02', text('A-SHARES', 'A股市场')],
            ['us', '03', text('US STOCKS', '美股市场')],
        ];
        worlds.forEach(([key, number, label]) => {
            const world = createElement('div', `home-world home-world--${key}`);
            world.dataset.homeWorld = key;
            const index = createElement('strong', 'home-world-index', number);
            const name = createElement('span', 'home-world-name', label);
            world.append(index, name);
            strip.appendChild(world);
        });
        return strip;
    }

    function syncHomeWorldStrip() {
        const strip = document.querySelector('.home-world-strip');
        if (!strip) return;
        strip.setAttribute('aria-label', text('Three hidden market worlds', '三个隐藏市场世界'));
        const labels = {
            crypto: text('CRYPTO', '加密市场'),
            ashare: text('A-SHARES', 'A股市场'),
            us: text('US STOCKS', '美股市场'),
        };
        Object.entries(labels).forEach(([key, label]) => {
            setText(strip.querySelector(`[data-home-world='${key}'] .home-world-name`), label);
        });
    }

    function installHomeConsole() {
        if (!startScreen || startScreen.querySelector('.home-console-bezel')) return;

        const legacyIntroParagraphs = Array.from(startScreen.querySelectorAll(':scope > p'));
        const bezel = createElement('div', 'home-console-bezel');
        const topLine = createElement('div', 'home-console-topline');
        const brand = createElement('span', 'home-console-brand', 'FLAPPY K');
        const series = createElement('span', 'home-console-series', text('HIDDEN MARKET ARCADE', '隐藏市场街机'));
        topLine.append(brand, series);

        const screen = createElement('div', 'home-console-screen');
        const kicker = createElement(
            'div',
            'home-console-kicker',
            text('3 WORLDS · 250 DAYS · BEAT THE MARKET', '三大市场 · 250 天 · 跑赢市场'),
        );
        const worldStrip = buildHomeWorldStrip();
        screen.appendChild(kicker);
        [...startScreen.children].forEach((child) => {
            if (legacyIntroParagraphs.includes(child)) {
                const visibleCopy = child.cloneNode(true);
                visibleCopy.classList.add('home-console-intro-copy');
                screen.appendChild(visibleCopy);
                return;
            }
            if (child.classList?.contains('start-actions')) {
                screen.appendChild(worldStrip);
            }
            screen.appendChild(child);
        });

        const footer = createElement('div', 'home-console-footer');
        const speaker = createElement('span', 'home-console-speaker');
        speaker.setAttribute('aria-hidden', 'true');
        for (let index = 0; index < 14; index += 1) speaker.appendChild(document.createElement('span'));
        const legend = createElement(
            'span',
            'home-console-legend',
            text('↑ BUY · ↓ SELL · EXCESS > 0 WINS', '↑ 买入 · ↓ 卖出 · 超额 > 0 即通关'),
        );
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

    function syncHome() {
        syncHomeUtilityPlacement();
        installPrimaryActionIcon();
        installPixelTradeGlyphs();
        syncPrimaryActionLabel();
    }

    function scheduleSync() {
        if (syncFrame) return;
        syncFrame = requestAnimationFrame(() => {
            syncFrame = 0;
            syncHome();
        });
    }

    function updateLanguage() {
        const brand = document.querySelector('.home-console-brand');
        const series = document.querySelector('.home-console-series');
        const kicker = document.querySelector('.home-console-kicker');
        const legend = document.querySelector('.home-console-legend');
        setText(brand, 'FLAPPY K');
        setText(series, text('HIDDEN MARKET ARCADE', '隐藏市场街机'));
        setText(kicker, text('3 WORLDS · 250 DAYS · BEAT THE MARKET', '三大市场 · 250 天 · 跑赢市场'));
        setText(legend, text('↑ BUY · ↓ SELL · EXCESS > 0 WINS', '↑ 买入 · ↓ 卖出 · 超额 > 0 即通关'));
        syncHomeWorldStrip();
        installPrimaryActionIcon();
        installPixelTradeGlyphs();
        syncPrimaryActionLabel();
    }

    function init() {
        root.style.setProperty('--pixel-font-readable', "var(--pixel-font-ui, 'Pixelify Sans', monospace)");
        installHomeConsole();
        installPixelTradeGlyphs();
        bindPressFeedback();
        syncHome();

        const startButton = document.getElementById('start-btn');
        if (startButton) {
            new MutationObserver(syncPrimaryActionLabel).observe(startButton, {
                childList: true,
                characterData: true,
                subtree: true,
            });
        }
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
        window.addEventListener('orientationchange', scheduleSync);
    }

    init();

    window.FlappyKHomeConsole = {
        installHomeConsole,
        buildHomeWorldStrip,
        syncHomeWorldStrip,
        syncHomeUtilityPlacement,
        installPrimaryActionIcon,
        installPixelTradeGlyphs,
        syncHome,
    };
})();
