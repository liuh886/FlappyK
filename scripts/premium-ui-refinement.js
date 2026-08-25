(() => {
    'use strict';

    const root = document.documentElement;
    const gameContainer = document.getElementById('game-container');
    const uiLayer = document.getElementById('ui-layer');
    const topControls = document.getElementById('game-top-controls');
    const controlsHint = document.querySelector('.controls-hint');
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
        const backButton = document.getElementById('game-back-btn');
        if (backButton) {
            backButton.textContent = '↩';
            backButton.setAttribute('aria-label', isChinese() ? '返回首页' : 'Return to home');
            backButton.setAttribute('title', isChinese() ? '返回首页' : 'Return to home');
        }

        const pauseButton = document.getElementById('pause-btn');
        if (pauseButton) {
            const paused = pauseButton.getAttribute('aria-pressed') === 'true';
            pauseButton.textContent = paused ? '▶' : 'Ⅱ';
            pauseButton.setAttribute(
                'aria-label',
                paused
                    ? (isChinese() ? '继续游戏' : 'Resume game')
                    : (isChinese() ? '暂停游戏' : 'Pause game'),
            );
            pauseButton.setAttribute(
                'title',
                `${paused ? (isChinese() ? '继续' : 'Resume') : (isChinese() ? '暂停' : 'Pause')} [Space]`,
            );
        }

        const soundButton = document.getElementById('sound-toggle-btn');
        if (soundButton) {
            const muted = soundButton.getAttribute('aria-pressed') === 'true';
            soundButton.textContent = muted ? '🔇' : '🔊';
            soundButton.setAttribute(
                'aria-label',
                muted
                    ? (isChinese() ? '取消静音' : 'Unmute sound')
                    : (isChinese() ? '静音' : 'Mute sound'),
            );
            soundButton.setAttribute(
                'title',
                muted
                    ? (isChinese() ? '取消静音 [M]' : 'Unmute [M]')
                    : (isChinese() ? '静音 [M]' : 'Mute [M]'),
            );
        }
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

        [stats, runPanel, topControls].filter(Boolean).forEach((element) => {
            if (element.parentElement !== rail) rail.appendChild(element);
        });

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

    function syncComposition() {
        refineHudComposition();
        refineDesktopControls();
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

    // The keyboard hint box dismisses itself after the first unguided trade;
    // guided first runs keep the hints until the coachmark flow finishes.
    window.FlappyKGameController?.on('trade', () => {
        if (!controlsHint || controlsHint.classList.contains('is-dismissed')) return;
        if (document.querySelector('.game-coachmark[data-active="true"]')) return;
        controlsHint.classList.add('is-dismissed');
    });

    window.FlappyKPremiumUIRefinement = {
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
        syncGuideTarget,
        scheduleComposition,
    };
})();
