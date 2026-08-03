(() => {
    'use strict';

    const root = document.documentElement;
    const canvasElement = document.getElementById('game-canvas');
    const gameContainer = document.getElementById('game-container');
    const topControls = document.getElementById('game-top-controls');
    const controlsHint = document.querySelector('.controls-hint');
    const DESKTOP_CANVAS_WIDTH = 896;
    const DESKTOP_CANVAS_HEIGHT = 672;

    function usesVirtualControls() {
        if (window.FlappyKUiState) return window.FlappyKUiState.virtualControls;
        return window.matchMedia?.('(pointer: coarse)').matches
            || Number(navigator.maxTouchPoints || 0) > 0
            || window.innerWidth < 720;
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

    function refineHudComposition() {
        const stats = document.querySelector('.stats-box');
        if (!stats) return;

        let runPanel = document.getElementById('run-progress-panel');
        if (!runPanel) {
            runPanel = document.createElement('section');
            runPanel.id = 'run-progress-panel';
            runPanel.className = 'run-progress-panel';
            runPanel.setAttribute('aria-label', 'Run progress');
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
    }

    function refineDesktopControls() {
        const speedControl = document.querySelector('.desktop-speed-control');
        if (speedControl && topControls && speedControl.parentElement !== topControls) {
            topControls.insertBefore(speedControl, topControls.firstChild);
        }
        if (controlsHint && controlsHint.parentElement !== gameContainer) {
            gameContainer?.appendChild(controlsHint);
        }
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
            ? (root.dataset.flappykLanguage === 'zh' ? '成功跑赢市场' : 'MARKET BEATEN')
            : (root.dataset.flappykLanguage === 'zh' ? '本局市场获胜' : 'MARKET WON');
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

    restoreLegacyGoalNode();
    refineHudComposition();
    refineDesktopControls();
    syncLiveExcess();
    syncCanvasLayout();
    syncGuideTarget();

    const previousUpdateUI = updateUI;
    updateUI = function refinedUpdateUI() {
        const result = previousUpdateUI();
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
        refineHudComposition,
        refineDesktopControls,
        syncLiveExcess,
        syncSettlementVerdict,
        syncSettlementComparison,
        syncCanvasLayout,
        syncGuideTarget,
    };
})();