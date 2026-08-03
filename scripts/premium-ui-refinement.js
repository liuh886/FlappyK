(() => {
    'use strict';

    const root = document.documentElement;
    const canvasElement = document.getElementById('game-canvas');
    const gameContainer = document.getElementById('game-container');
    const topControls = document.getElementById('game-top-controls');
    const controlsHint = document.querySelector('.controls-hint');
    const DESKTOP_CANVAS_WIDTH = 896;
    const DESKTOP_CANVAS_HEIGHT = 672;
    const PIXEL_COMPATIBILITY_STYLE_ID = 'flappyk-pixel-ui-compatibility';

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
                line-height: 1.4;
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
                font-size: 12px;
            }

            .run-progress-panel #day-display::after {
                content: '/250';
                margin-left: 2px;
                color: var(--pixel-muted);
                font-size: 12px;
            }

            html[lang='zh-CN'] .stats-box[data-composition='returns-only'] {
                font-size: 15px !important;
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

                .hud-metric-label {
                    font-size: 7px;
                }

                .run-progress-panel .hud-metric-label {
                    font-size: 6px;
                }

                .run-progress-panel #level-display::after,
                .run-progress-panel #day-display::after {
                    font-size: 10px;
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

    function refineHudComposition() {
        const stats = document.querySelector('.stats-box');
        if (!stats) return;

        let runPanel = document.getElementById('run-progress-panel');
        if (!runPanel) {
            runPanel = document.createElement('section');
            runPanel.id = 'run-progress-panel';
            runPanel.className = 'run-progress-panel';
            runPanel.setAttribute('aria-label', isChinese() ? '本局进度' : 'Run progress');
            gameContainer?.appendChild(runPanel);
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
        normalizeMetricRows();
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
        if (usesVirtualControls()) {
            canvasElement.width = canvasElement.clientWidth || window.innerWidth;
            canvasElement.height = canvasElement.clientHeight || Math.round(window.innerHeight * 0.68);
        } else {
            canvasElement.width = DESKTOP_CANVAS_WIDTH;
            canvasElement.height = DESKTOP_CANVAS_HEIGHT;
        }
        if (typeof isPlaying !== 'undefined' && isPlaying) draw();
    }

    installPixelCompatibilityStyles();
    restoreLegacyGoalNode();
    refineHudComposition();
    refineDesktopControls();
    syncLiveExcess();
    syncCanvasLayout();
    syncGuideTarget();

    const previousUpdateUI = updateUI;
    updateUI = function refinedUpdateUI() {
        const result = previousUpdateUI();
        normalizeMetricRows();
        syncLiveExcess();
        return result;
    };

    const previousStartLevel = startLevel;
    startLevel = function refinedStartLevel() {
        const result = previousStartLevel();
        refineHudComposition();
        refineDesktopControls();
        requestAnimationFrame(() => {
            syncCanvasLayout();
            syncGuideTarget();
        });
        return result;
    };

    const previousEndLevel = endLevel;
    endLevel = function refinedEndLevel() {
        const result = previousEndLevel();
        requestAnimationFrame(syncSettlementComparison);
        return result;
    };

    const syncComposition = () => requestAnimationFrame(() => {
        refineHudComposition();
        refineDesktopControls();
        syncCanvasLayout();
        syncGuideTarget();
    });

    if (gameContainer) {
        new MutationObserver(syncComposition).observe(gameContainer, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-step'],
        });
    }

    window.addEventListener('flappyk:layout-state', syncComposition);
    window.addEventListener('resize', syncComposition);
    window.addEventListener('orientationchange', syncComposition);

    window.FlappyKPremiumUIRefinement = {
        DESKTOP_CANVAS_WIDTH,
        DESKTOP_CANVAS_HEIGHT,
        restoreLegacyGoalNode,
        normalizeMetricRows,
        normalizeTopControls,
        refineHudComposition,
        refineDesktopControls,
        syncLiveExcess,
        syncSettlementVerdict,
        syncSettlementComparison,
        syncCanvasLayout,
        syncGuideTarget,
    };
})();