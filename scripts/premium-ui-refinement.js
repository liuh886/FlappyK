(() => {
    'use strict';

    const root = document.documentElement;
    const canvasElement = document.getElementById('game-canvas');

    function restoreLegacyGoalNode() {
        if (document.getElementById('target-return-display')) return;
        if (typeof targetDisp === 'undefined' || !targetDisp) return;

        const row = document.createElement('div');
        row.className = 'hud-stat-row hud-legacy-goal';
        row.setAttribute('aria-hidden', 'true');
        row.append('GOAL: ', targetDisp);
        document.querySelector('.hud-details')?.appendChild(row);
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

    function syncSettlementComparison() {
        const player = parsePercent(document.getElementById('card-level-return')?.textContent);
        const market = parsePercent(document.getElementById('card-market-return')?.textContent);
        const scale = Math.max(1, Math.abs(player), Math.abs(market));
        setSignedBar(document.getElementById('settlement-player-bar'), player, scale);
        setSignedBar(document.getElementById('settlement-market-bar'), market, scale);
    }

    function syncCanvasLayout() {
        if (!canvasElement || typeof draw !== 'function') return;
        const compact = window.FlappyKUiState?.layout === 'compact';
        if (compact) {
            canvasElement.width = canvasElement.clientWidth || window.innerWidth;
            canvasElement.height = canvasElement.clientHeight || Math.round(window.innerHeight * 0.68);
        } else {
            canvasElement.width = 800;
            canvasElement.height = 600;
        }
        if (typeof isPlaying !== 'undefined' && isPlaying) draw();
    }

    restoreLegacyGoalNode();
    syncLiveExcess();
    syncCanvasLayout();

    const previousUpdateUI = updateUI;
    updateUI = function refinedUpdateUI() {
        const result = previousUpdateUI();
        syncLiveExcess();
        return result;
    };

    const previousEndLevel = endLevel;
    endLevel = function refinedEndLevel() {
        const result = previousEndLevel();
        requestAnimationFrame(syncSettlementComparison);
        return result;
    };

    window.addEventListener('flappyk:layout-state', () => requestAnimationFrame(syncCanvasLayout));
    window.addEventListener('resize', () => requestAnimationFrame(syncCanvasLayout));
    window.addEventListener('orientationchange', () => requestAnimationFrame(syncCanvasLayout));

    window.FlappyKPremiumUIRefinement = {
        restoreLegacyGoalNode,
        syncLiveExcess,
        syncSettlementComparison,
        syncCanvasLayout,
    };
})();
