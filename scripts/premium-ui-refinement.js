(() => {
    'use strict';

    const root = document.documentElement;
    const canvasElement = document.getElementById('game-canvas');
    const gameContainer = document.getElementById('game-container');
    const uiLayer = document.getElementById('ui-layer');
    const topControls = document.getElementById('game-top-controls');
    const controlsHint = document.querySelector('.controls-hint');
    const DESKTOP_CANVAS_WIDTH = 896;
    const DESKTOP_CANVAS_HEIGHT = 672;
    const PIXEL_COMPATIBILITY_STYLE_ID = 'flappyk-pixel-ui-compatibility';
    const HUD_RAIL_ID = 'game-hud-rail';
    let compositionFrame = 0;

    function isChinese() {
        return root.dataset.flappykLanguage === 'zh'
            || root.lang.toLowerCase().startsWith('zh');
    }

    function usesVirtualControls() {
        if (window.FlappyKUiState) return window.FlappyKUiState.virtualControls;
        return window.matchMedia?.('(pointer: coarse)').matches
            || Number(navigator.maxTouchPoints || 0) > 0
            || window.innerWidth < 720;
    }

    function installPixelCompatibilityStyles() {
        if (document.getElementById(PIXEL_COMPATIBILITY_STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = PIXEL_COMPATIBILITY_STYLE_ID;
        style.textContent = `
            .stats-box[data-composition='returns-only'] .hud-total::before,
            .stats-box[data-composition='returns-only'] .hud-return::before,
            .run-progress-panel .hud-game::before,
            .run-progress-panel .hud-day::before {
                content: none !important;
            }

            .stats-box[data-composition='returns-only'] .hud-total span::before,
            .run-progress-panel .hud-game span::after,
            .run-progress-panel .hud-day span::after {
                content: none;
            }

            .hud-metric-label {
                display: block;
                color: var(--pixel-muted);
                font-family: var(--pixel-font-display);
                font-size: 8px;
                font-weight: 400;
                line-height: 1.25;
                letter-spacing: 0.035em;
                white-space: nowrap;
            }

            .stats-box[data-composition='returns-only'] #total-display::before {
                content: '$';
            }

            .run-progress-panel .hud-metric-label {
                font-size: 7px;
            }

            .run-progress-panel #level-display::after {
                content: '/3';
                margin-left: 2px;
                color: var(--pixel-muted);
                font-size: 11px;
            }

            .run-progress-panel #day-display::after {
                content: '/250';
                margin-left: 2px;
                color: var(--pixel-muted);
                font-size: 11px;
            }

            html[lang='zh-CN'] .stats-box[data-composition='returns-only'] {
                font-size: 15px !important;
            }

            #ui-layer[data-hud-composition='rail'] {
                position: absolute;
                inset: 0;
                display: block;
                width: 100%;
                padding: 0 !important;
                pointer-events: none;
            }

            #game-hud-rail {
                position: absolute;
                top: 12px;
                right: 12px;
                left: 12px;
                z-index: 62;
                display: grid;
                grid-template-columns: minmax(112px, 0.46fr) minmax(286px, 1.28fr) minmax(154px, 0.7fr) auto;
                min-height: 52px;
                align-items: stretch;
                overflow: hidden;
                border: 2px solid rgba(216, 226, 239, 0.58);
                border-radius: 0;
                background: rgba(7, 12, 20, 0.88);
                box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.58);
                clip-path: var(--pixel-cut);
                pointer-events: none;
            }

            #game-hud-rail > * {
                min-width: 0;
                pointer-events: auto;
            }

            #game-hud-rail .weather-status {
                position: static !important;
                display: flex;
                width: auto !important;
                min-width: 0 !important;
                max-width: none !important;
                margin: 0 !important;
                padding: 0 10px !important;
                align-items: center;
                justify-content: flex-start;
                overflow: hidden;
                border: 0 !important;
                border-left: 3px solid var(--pixel-cyan) !important;
                background: transparent !important;
                box-shadow: none !important;
                color: var(--pixel-text);
                font-family: var(--pixel-font-ui);
                font-size: 9px;
                line-height: 1.15;
                letter-spacing: 0.035em;
                text-align: left;
                text-overflow: ellipsis;
                white-space: nowrap;
                opacity: 0.82 !important;
                transform: none !important;
                transition: background 160ms steps(3, end), border-color 160ms steps(3, end), opacity 160ms steps(3, end);
            }

            #game-hud-rail .weather-status.is-event {
                background: rgba(25, 39, 57, 0.9) !important;
                opacity: 1 !important;
            }

            #game-hud-rail .weather-status[data-tone='positive'] {
                border-left-color: var(--pixel-green) !important;
                background: rgba(12, 64, 45, 0.72) !important;
            }

            #game-hud-rail .weather-status[data-tone='negative'] {
                border-left-color: var(--pixel-red) !important;
                background: rgba(87, 31, 36, 0.74) !important;
            }

            #game-hud-rail .stats-box[data-composition='returns-only'] {
                position: static !important;
                display: grid !important;
                grid-template-columns: minmax(0, 1fr) minmax(104px, 0.8fr) !important;
                width: auto !important;
                min-width: 0 !important;
                margin: 0 !important;
                padding: 7px 10px !important;
                border: 0 !important;
                border-left: 1px solid rgba(216, 226, 239, 0.22) !important;
                background: transparent !important;
                box-shadow: none !important;
                clip-path: none !important;
            }

            #game-hud-rail .stats-box[data-composition='returns-only'] .hud-main {
                gap: 7px;
            }

            #game-hud-rail .stats-box[data-composition='returns-only'] .hud-total span,
            #game-hud-rail .stats-box[data-composition='returns-only'] .hud-return span,
            #game-hud-rail .excess-meter-label strong {
                font-size: 13px;
            }

            #game-hud-rail .excess-meter-label {
                font-size: 7px;
            }

            #game-hud-rail .run-progress-panel {
                position: static !important;
                display: block !important;
                width: auto !important;
                min-width: 0 !important;
                margin: 0 !important;
                padding: 7px 10px !important;
                border: 0 !important;
                border-left: 1px solid rgba(216, 226, 239, 0.22) !important;
                background: transparent !important;
                box-shadow: none !important;
                clip-path: none !important;
                color: var(--pixel-muted);
            }

            #game-hud-rail .run-progress-panel .hud-header {
                gap: 8px;
            }

            #game-hud-rail .run-progress-panel .day-progress {
                height: 4px;
                margin-top: 5px;
            }

            #game-hud-rail #game-top-controls {
                position: static !important;
                inset: auto !important;
                align-self: stretch;
                gap: 4px !important;
                margin: 0 !important;
                padding: 7px 8px !important;
                border: 0 !important;
                border-left: 1px solid rgba(216, 226, 239, 0.22) !important;
                background: transparent !important;
                box-shadow: none !important;
                clip-path: none !important;
            }

            #game-hud-rail #game-top-controls .desktop-speed-control {
                grid-template-columns: 28px 44px 28px !important;
                gap: 2px !important;
                margin: 0 5px 0 0 !important;
                padding-right: 7px !important;
                border-right: 1px solid rgba(216, 226, 239, 0.22) !important;
            }

            #game-hud-rail #game-top-controls .speed-step,
            #game-hud-rail #game-top-controls > button {
                width: 30px !important;
                min-width: 30px !important;
                height: 30px !important;
                min-height: 30px !important;
                margin: 0 !important;
                padding: 0 !important;
                border: 1px solid #526078 !important;
                border-radius: 0 !important;
                background: #111b2a !important;
                box-shadow: none !important;
            }

            #game-hud-rail #game-top-controls .speed-readout {
                min-width: 44px !important;
                color: var(--pixel-yellow);
                font-size: 14px !important;
            }

            @media (min-width: 1025px) and (pointer: fine) {
                .controls-hint {
                    position: absolute !important;
                    bottom: 14px !important;
                    left: 50% !important;
                    z-index: 62 !important;
                    display: block !important;
                    width: auto !important;
                    margin: 0 !important;
                    padding: 5px !important;
                    overflow: hidden;
                    border: 2px solid rgba(216, 226, 239, 0.58) !important;
                    border-radius: 0 !important;
                    background: rgba(7, 12, 20, 0.88) !important;
                    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.58) !important;
                    clip-path: var(--pixel-cut);
                    opacity: 1 !important;
                    transform: translateX(-50%);
                }

                .trade-key-hints {
                    display: grid !important;
                    grid-template-columns: repeat(2, auto) !important;
                    gap: 0 !important;
                }

                .trade-key-hint {
                    min-height: 30px !important;
                    margin: 0 !important;
                    padding: 4px 9px 4px 4px !important;
                    border: 0 !important;
                    border-radius: 0 !important;
                    background: transparent !important;
                    box-shadow: none !important;
                    clip-path: none !important;
                    opacity: 1 !important;
                }

                .trade-key-hint + .trade-key-hint {
                    padding-left: 9px !important;
                    border-left: 1px solid rgba(216, 226, 239, 0.22) !important;
                }
            }

            .home-utility-bar {
                gap: 4px !important;
                padding: 4px !important;
                border: 2px solid var(--pixel-line) !important;
                border-radius: 0 !important;
                background: #0b111c !important;
                box-shadow: var(--pixel-shadow-small) !important;
                clip-path: var(--pixel-cut);
                backdrop-filter: none !important;
            }

            .home-utility-bar #language-toggle-btn,
            .home-utility-bar .membership-launcher {
                min-height: 32px !important;
                height: 32px !important;
                border: 2px solid #4b5870 !important;
                border-radius: 0 !important;
                background: #121b2a !important;
                box-shadow: none !important;
                color: var(--pixel-text) !important;
            }

            .home-utility-bar #language-toggle-btn {
                min-width: 52px !important;
                border-right: 2px solid #4b5870 !important;
            }

            .home-utility-bar .membership-launcher {
                padding-inline: 10px !important;
            }

            .home-utility-bar #language-toggle-btn:hover,
            .home-utility-bar .membership-launcher:hover {
                background: #1d2940 !important;
            }

            .membership-launcher-tier {
                border-radius: 0 !important;
            }

            #btn-buy > span:last-child,
            #btn-sell > span:last-child {
                display: block;
                min-width: max-content;
                white-space: nowrap;
            }

            @media (max-width: 720px), (pointer: coarse) {
                html[lang='zh-CN'] .stats-box[data-composition='returns-only'] {
                    font-size: 12px !important;
                }

                #game-hud-rail {
                    top: max(6px, env(safe-area-inset-top));
                    right: max(6px, env(safe-area-inset-right));
                    left: max(6px, env(safe-area-inset-left));
                    grid-template-areas:
                        'performance controls'
                        'weather progress';
                    grid-template-columns: minmax(0, 1fr) auto;
                    grid-template-rows: auto auto;
                    min-height: 78px;
                }

                #game-hud-rail .weather-status {
                    grid-area: weather;
                    min-height: 30px;
                    padding: 5px 7px !important;
                    border-top: 1px solid rgba(216, 226, 239, 0.22) !important;
                    border-left-width: 3px !important;
                    font-size: 8px;
                }

                #game-hud-rail .stats-box[data-composition='returns-only'] {
                    grid-area: performance;
                    grid-template-columns: minmax(0, 1fr) minmax(82px, 0.72fr) !important;
                    padding: 5px 7px !important;
                    border-left: 0 !important;
                    border-bottom: 1px solid rgba(216, 226, 239, 0.22) !important;
                }

                #game-hud-rail .stats-box[data-composition='returns-only'] .hud-total span,
                #game-hud-rail .stats-box[data-composition='returns-only'] .hud-return span,
                #game-hud-rail .excess-meter-label strong {
                    font-size: 11px;
                }

                #game-hud-rail .hud-metric-label,
                #game-hud-rail .excess-meter-label {
                    font-size: 7px;
                }

                #game-hud-rail .run-progress-panel {
                    grid-area: progress;
                    min-width: 126px !important;
                    padding: 5px 7px !important;
                    border-top: 1px solid rgba(216, 226, 239, 0.22) !important;
                    border-left: 1px solid rgba(216, 226, 239, 0.22) !important;
                }

                #game-hud-rail .run-progress-panel .hud-metric-label {
                    font-size: 6px;
                }

                #game-hud-rail .run-progress-panel #level-display::after,
                #game-hud-rail .run-progress-panel #day-display::after {
                    font-size: 9px;
                }

                #game-hud-rail #game-top-controls {
                    grid-area: controls;
                    min-width: 68px;
                    padding: 5px !important;
                    border-bottom: 1px solid rgba(216, 226, 239, 0.22) !important;
                    border-left: 1px solid rgba(216, 226, 239, 0.22) !important;
                }

                #game-hud-rail #game-top-controls .desktop-speed-control {
                    display: none !important;
                }

                #game-hud-rail #game-top-controls > button {
                    width: 28px !important;
                    min-width: 28px !important;
                    height: 28px !important;
                    min-height: 28px !important;
                }

                #mobile-controls:not([hidden]) {
                    border-top: 2px solid rgba(216, 226, 239, 0.42);
                    background: rgba(7, 12, 20, 0.9) !important;
                    box-shadow: 0 -4px 0 rgba(0, 0, 0, 0.42);
                }

                .home-utility-bar {
                    padding: 3px !important;
                }

                .home-utility-bar #language-toggle-btn,
                .home-utility-bar .membership-launcher {
                    min-height: 30px !important;
                    height: 30px !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function restoreLegacyGoalNode() {
        if (document.getElementById('target-return-display')) return;
        if (typeof targetDisp === 'undefined' || !targetDisp) return;

        const row = document.createElement('div');
        row.className = 'hud-stat-row hud-legacy-goal';
        row.setAttribute('aria-hidden', 'true');
        row.append('GOAL: ', targetDisp);
        document.querySelector('.hud-details')?.appendChild(row);
    }

    function normalizeMetricRow(row, value, label) {
        if (!row || !value) return;
        const languageKey = isChinese() ? 'zh' : 'en';
        const signature = `${languageKey}:${label}`;
        if (row.dataset.pixelMetric === signature
            && row.children.length === 2
            && row.lastElementChild === value) return;

        const labelElement = document.createElement('span');
        labelElement.className = 'hud-metric-label';
        labelElement.textContent = label;
        labelElement.setAttribute('aria-hidden', 'true');
        row.replaceChildren(labelElement, value);
        row.dataset.pixelMetric = signature;
        row.setAttribute('aria-label', label);
    }

    function normalizeMetricRows() {
        const labels = isChinese()
            ? { total: '总资产', returns: '收益', run: '局数', day: '天数' }
            : { total: 'TOTAL', returns: 'RETURN', run: 'RUN', day: 'DAY' };

        normalizeMetricRow(
            document.querySelector('.hud-total'),
            document.getElementById('total-display'),
            labels.total,
        );
        normalizeMetricRow(
            document.querySelector('.hud-return'),
            document.getElementById('return-display'),
            labels.returns,
        );
        normalizeMetricRow(
            document.querySelector('.hud-game'),
            document.getElementById('level-display'),
            labels.run,
        );
        normalizeMetricRow(
            document.querySelector('.hud-day'),
            document.getElementById('day-display'),
            labels.day,
        );
    }

    function normalizeTopControls() {
        ['game-back-btn', 'pause-btn'].forEach((id) => {
            const button = document.getElementById(id);
            if (button && button.textContent) button.textContent = '';
        });
    }

    function ensureHudRail() {
        if (!uiLayer) return null;
        let rail = document.getElementById(HUD_RAIL_ID);
        if (!rail) {
            rail = document.createElement('section');
            rail.id = HUD_RAIL_ID;
            rail.className = 'game-hud-rail';
            rail.setAttribute('aria-label', isChinese() ? '游戏状态与控制' : 'Game status and controls');
            uiLayer.appendChild(rail);
        }
        uiLayer.dataset.hudComposition = 'rail';
        return rail;
    }

    function refineHudComposition() {
        const stats = document.querySelector('.stats-box');
        if (!stats) return;

        const rail = ensureHudRail();
        if (!rail) return;

        let runPanel = document.getElementById('run-progress-panel');
        if (!runPanel) {
            runPanel = document.createElement('section');
            runPanel.id = 'run-progress-panel';
            runPanel.className = 'run-progress-panel';
        }

        const header = stats.querySelector('.hud-header');
        const progress = stats.querySelector('.day-progress');
        const details = stats.querySelector('.hud-details');
        [header, progress, details].filter(Boolean).forEach((element) => {
            if (element.parentElement !== runPanel) runPanel.appendChild(element);
        });

        stats.dataset.composition = 'returns-only';
        runPanel.dataset.composition = 'run-progress';
        runPanel.setAttribute('aria-label', isChinese() ? '本局进度' : 'Run progress');
        rail.setAttribute('aria-label', isChinese() ? '游戏状态与控制' : 'Game status and controls');

        const status = document.getElementById('weather-status');
        [status, stats, runPanel, topControls].filter(Boolean).forEach((element) => {
            if (element.parentElement !== rail) rail.appendChild(element);
        });

        normalizeMetricRows();
        window.FlappyKMarketWeather?.syncWeatherStatusPlacement?.();
    }

    function refineDesktopControls() {
        const speedControl = document.querySelector('.desktop-speed-control');
        if (speedControl && topControls && speedControl.parentElement !== topControls) {
            topControls.insertBefore(speedControl, topControls.firstChild);
        }
        if (controlsHint && controlsHint.parentElement !== gameContainer) {
            gameContainer?.appendChild(controlsHint);
        }
        normalizeTopControls();
    }

    function readLiveMetrics() {
        if (typeof currentData === 'undefined'
            || !Array.isArray(currentData)
            || !currentData[dayIndex]) return null;

        const startPrice = Number(currentData[0]?.close);
        const currentPriceValue = Number(currentData[dayIndex]?.close);
        const baseCash = Number(levelStartCash || INITIAL_CASH);
        if (!Number.isFinite(startPrice)
            || startPrice <= 0
            || !Number.isFinite(currentPriceValue)
            || !Number.isFinite(baseCash)
            || baseCash <= 0) return null;

        const total = Number(cash || 0) + (Number(shares || 0) * currentPriceValue);
        const playerReturn = (total - baseCash) / baseCash;
        const marketReturn = (currentPriceValue - startPrice) / startPrice;
        return {
            playerReturn,
            marketReturn,
            excess: playerReturn - marketReturn,
        };
    }

    function syncLiveExcess() {
        const metrics = readLiveMetrics();
        if (!metrics) return;

        const display = document.getElementById('live-excess-display');
        const indicator = document.querySelector('.excess-meter-indicator');
        const meter = document.getElementById('excess-meter');
        const percentage = metrics.excess * 100;
        const position = 50 + Math.max(-50, Math.min(50, (percentage / 15) * 50));

        if (display) {
            display.textContent = `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
        }
        if (indicator) indicator.style.left = `${position}%`;
        if (meter) meter.dataset.leading = String(metrics.excess > 0);
    }

    function setSignedBar(element, value, scale) {
        if (!element) return;
        const magnitude = Math.min(50, Math.max(2, (Math.abs(value) / scale) * 50));
        element.style.left = value >= 0 ? '50%' : `${50 - magnitude}%`;
        element.style.width = `${magnitude}%`;
        element.dataset.direction = value >= 0 ? 'positive' : 'negative';
    }

    function parsePercent(value) {
        const number = Number.parseFloat(String(value || '').replace(/[^\d+\-.]/g, ''));
        return Number.isFinite(number) ? number : 0;
    }

    function syncSettlementVerdict() {
        const status = document.getElementById('card-status');
        const card = document.getElementById('profit-card');
        const verdict = document.getElementById('settlement-verdict');
        if (!status || !card || !verdict) return;

        const isSuccess = status.classList.contains('card-positive');
        const isFailure = status.classList.contains('card-negative');
        if (!isSuccess && !isFailure) return;

        verdict.textContent = isSuccess
            ? (isChinese() ? '成功跑赢市场' : 'MARKET BEATEN')
            : (isChinese() ? '本局市场获胜' : 'MARKET WON');
        card.dataset.result = isSuccess ? 'success' : 'failure';
    }

    function syncSettlementComparison() {
        const player = parsePercent(document.getElementById('card-level-return')?.textContent);
        const market = parsePercent(document.getElementById('card-market-return')?.textContent);
        const scale = Math.max(1, Math.abs(player), Math.abs(market));
        setSignedBar(document.getElementById('settlement-player-bar'), player, scale);
        setSignedBar(document.getElementById('settlement-market-bar'), market, scale);
        syncSettlementVerdict();
    }

    function syncGuideTarget() {
        const guide = document.querySelector('.game-coachmark[data-active="true"]');
        if (!guide) return;
        const step = guide.dataset.step;
        if (!['buy', 'sell'].includes(step)) return;

        document.querySelectorAll('.trade-hint-buy, .trade-hint-sell, #btn-buy, #btn-sell')
            .forEach((element) => element.classList.remove('guide-target'));
        const selector = usesVirtualControls()
            ? `#btn-${step}`
            : `.trade-hint-${step}`;
        document.querySelector(selector)?.classList.add('guide-target');
    }

    function syncCanvasLayout() {
        if (!canvasElement || typeof draw !== 'function') return;

        const targetWidth = usesVirtualControls()
            ? (canvasElement.clientWidth || window.innerWidth)
            : DESKTOP_CANVAS_WIDTH;
        const targetHeight = usesVirtualControls()
            ? (canvasElement.clientHeight || Math.round(window.innerHeight * 0.68))
            : DESKTOP_CANVAS_HEIGHT;
        let changed = false;

        if (canvasElement.width !== targetWidth) {
            canvasElement.width = targetWidth;
            changed = true;
        }
        if (canvasElement.height !== targetHeight) {
            canvasElement.height = targetHeight;
            changed = true;
        }
        if (changed && typeof isPlaying !== 'undefined' && isPlaying) draw();
    }

    function syncComposition() {
        refineHudComposition();
        refineDesktopControls();
        syncCanvasLayout();
        syncGuideTarget();
    }

    function scheduleComposition() {
        if (compositionFrame) return;
        compositionFrame = window.requestAnimationFrame(() => {
            compositionFrame = 0;
            syncComposition();
        });
    }

    function observeTextNodes(ids, callback) {
        const observer = new MutationObserver(callback);
        ids.forEach((id) => {
            const node = document.getElementById(id);
            if (node) observer.observe(node, { childList: true, characterData: true, subtree: true });
        });
        return observer;
    }

    installPixelCompatibilityStyles();
    restoreLegacyGoalNode();
    syncComposition();
    syncLiveExcess();
    syncSettlementComparison();

    observeTextNodes(
        ['total-display', 'return-display', 'level-display', 'day-display'],
        () => {
            normalizeMetricRows();
            syncLiveExcess();
        },
    );

    observeTextNodes(
        ['card-level-return', 'card-market-return', 'card-excess-return', 'card-status'],
        syncSettlementComparison,
    );

    const status = document.getElementById('card-status');
    if (status) {
        new MutationObserver(syncSettlementComparison).observe(status, {
            attributes: true,
            attributeFilter: ['class'],
        });
    }

    if (canvasElement) {
        new MutationObserver(scheduleComposition).observe(canvasElement, {
            attributes: true,
            attributeFilter: ['width', 'height'],
        });
    }

    [
        topControls,
        document.getElementById('start-screen'),
        document.getElementById('settlement-screen'),
        document.getElementById('mobile-controls'),
    ].filter(Boolean).forEach((element) => {
        new MutationObserver(scheduleComposition).observe(element, {
            attributes: true,
            attributeFilter: ['hidden', 'aria-hidden', 'class'],
        });
    });

    new MutationObserver(scheduleComposition).observe(root, {
        attributes: true,
        attributeFilter: ['lang', 'data-flappyk-language', 'data-ui-state'],
    });

    if (gameContainer) {
        new MutationObserver(() => window.requestAnimationFrame(() => {
            refineHudComposition();
            syncGuideTarget();
        })).observe(gameContainer, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-step'],
        });
    }

    window.addEventListener('flappyk:layout-state', scheduleComposition);
    window.addEventListener('resize', scheduleComposition);
    window.addEventListener('orientationchange', scheduleComposition);

    window.FlappyKPremiumUIRefinement = {
        DESKTOP_CANVAS_WIDTH,
        DESKTOP_CANVAS_HEIGHT,
        HUD_RAIL_ID,
        restoreLegacyGoalNode,
        normalizeMetricRows,
        normalizeTopControls,
        ensureHudRail,
        refineHudComposition,
        refineDesktopControls,
        syncLiveExcess,
        syncSettlementVerdict,
        syncSettlementComparison,
        syncCanvasLayout,
        syncGuideTarget,
        scheduleComposition,
    };
})();