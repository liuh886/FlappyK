(() => {
    'use strict';

    const root = document.documentElement;
    const uiState = window.FlappyKUiState;
    const onboarding = window.FlappyKOnboarding;
    const controller = window.FlappyKGameController;
    const controlsHint = document.querySelector('.controls-hint');
    const card = document.getElementById('profit-card');
    const speedState = document.getElementById('speed-btn');

    let toastTimer = 0;
    let guide = null;
    let guideStep = '';
    let guideOriginalSpeed = null;
    let guideObserveTimer = 0;

    function isChinese() {
        return root.dataset.flappykLanguage === 'zh'
            || root.lang.toLowerCase().startsWith('zh');
    }

    function t(english, chinese) {
        return isChinese() ? chinese : english;
    }

    function copy() {
        return {
            rankings: t('RANKINGS', '排行榜'),
            details: t('VIEW DETAILS', '查看详情'),
            hideDetails: t('HIDE DETAILS', '收起详情'),
            excess: t('EXCESS', '超额'),
            player: t('YOU', '你'),
            market: t('MARKET', '市场'),
            bought: t('BOUGHT $1K', '已买入 $1K'),
            sold: t('SOLD $1K', '已卖出 $1K'),
            noCash: t('NOT ENOUGH CASH', '现金不足'),
            noPosition: t('NO POSITION TO SELL', '暂无可卖持仓'),
            guideBuyTitle: t('STEP 1 · BUY', '第 1 步 · 买入'),
            guideBuyBody: t('Press ↑ or BUY once. Each trade uses $1,000.', '按一次 ↑ 或“买入”。每次交易使用 $1,000。'),
            guideObserveTitle: t('STEP 2 · WATCH THE GAP', '第 2 步 · 观察差距'),
            guideObserveBody: t('The thin Excess meter compares your return with the hidden market.', '细线超额仪表比较你的收益与隐藏市场。'),
            guideSellTitle: t('STEP 3 · SELL', '第 3 步 · 卖出'),
            guideSellBody: t('Press ↓ or SELL once to reduce the position.', '按一次 ↓ 或“卖出”，降低当前持仓。'),
            guideGoalTitle: t('STEP 4 · STAY AHEAD', '第 4 步 · 保持领先'),
            guideGoalBody: t('Finish above 0% Excess. Market-specific red and green conventions stay part of the challenge.', '最终超额收益保持在 0% 以上即可通关；不同市场的红绿规则仍是挑战的一部分。'),
            skip: t('SKIP GUIDE', '跳过引导'),
            success: t('MARKET BEATEN', '成功跑赢市场'),
            failure: t('MARKET WON', '本局市场获胜'),
        };
    }

    function syncMetricLabels() {
        const labels = isChinese()
            ? { total: '总资产', cash: '现金', return: '收益', run: '世界', day: '天数' }
            : { total: 'TOTAL', cash: 'CASH', return: 'RETURN', run: 'WORLD', day: 'DAY' };
        document.querySelectorAll('.hud-metric-label[data-metric]').forEach((label) => {
            const key = label.dataset.metric;
            if (labels[key]) label.textContent = labels[key];
            label.parentElement?.setAttribute('aria-label', labels[key] || key);
        });
        document.querySelector('.excess-meter-label span')?.replaceChildren(copy().excess);
        document.getElementById('run-progress-panel')?.setAttribute('aria-label', t('Run progress', '本局进度'));
        document.getElementById('game-hud-rail')?.setAttribute('aria-label', t('Game status and controls', '游戏状态与控制'));
    }

    function syncTopControls() {
        const backButton = document.getElementById('game-back-btn');
        if (backButton) {
            backButton.textContent = '↩';
            backButton.setAttribute('aria-label', t('Return to home', '返回首页'));
            backButton.setAttribute('title', t('Return to home', '返回首页'));
        }

        const pauseButton = document.getElementById('pause-btn');
        if (pauseButton) {
            const paused = pauseButton.getAttribute('aria-pressed') === 'true';
            pauseButton.textContent = paused ? '▶' : 'Ⅱ';
            pauseButton.setAttribute('aria-label', paused ? t('Resume game', '继续游戏') : t('Pause game', '暂停游戏'));
            pauseButton.setAttribute('title', `${paused ? t('Resume', '继续') : t('Pause', '暂停')} [Space]`);
        }

        const soundButton = document.getElementById('sound-toggle-btn');
        if (soundButton) {
            const muted = soundButton.getAttribute('aria-pressed') === 'true';
            soundButton.textContent = muted ? '🔇' : '🔊';
            soundButton.setAttribute('aria-label', muted ? t('Unmute sound', '取消静音') : t('Mute sound', '静音'));
            soundButton.setAttribute('title', muted ? t('Unmute [M]', '取消静音 [M]') : t('Mute [M]', '静音 [M]'));
        }
    }

    function syncStaticCopy() {
        const strings = copy();
        const leaderboard = document.getElementById('leaderboard-open-btn');
        if (leaderboard) leaderboard.textContent = strings.rankings;
        const playerLabel = document.querySelector('#settlement-player-bar')?.closest('.settlement-comparison-row')?.querySelector('span');
        const marketLabel = document.querySelector('#settlement-market-bar')?.closest('.settlement-comparison-row')?.querySelector('span');
        if (playerLabel) playerLabel.textContent = strings.player;
        if (marketLabel) marketLabel.textContent = strings.market;
        const toggle = document.getElementById('settlement-details-toggle');
        if (toggle) {
            const expanded = card?.dataset.detailsExpanded === 'true';
            toggle.textContent = expanded ? strings.hideDetails : strings.details;
        }
        syncMetricLabels();
        syncTopControls();
    }

    function syncSpeedReadouts() {
        const value = `${Number(speedMultiplier) || 1}×`;
        document.querySelectorAll('.speed-readout').forEach((readout) => {
            readout.textContent = value;
        });
    }

    function currentMetrics() {
        if (!Array.isArray(currentData) || !currentData[dayIndex]) return null;
        const startPrice = Number(currentData[0]?.close);
        const price = Number(currentData[dayIndex]?.close);
        const baseCash = Number(levelStartCash || INITIAL_CASH);
        if (!Number.isFinite(startPrice) || startPrice <= 0
            || !Number.isFinite(price)
            || !Number.isFinite(baseCash) || baseCash <= 0) return null;
        const total = Number(cash || 0) + (Number(shares || 0) * price);
        const playerReturn = (total - baseCash) / baseCash;
        const marketReturn = (price - startPrice) / startPrice;
        return { total, playerReturn, marketReturn, excess: playerReturn - marketReturn };
    }

    function renderHud() {
        const day = Math.max(1, Math.min(DAYS_PER_LEVEL, Number(dayIndex || 0) + 1));
        const fill = document.querySelector('.day-progress-fill');
        const progress = document.querySelector('.day-progress');
        if (fill) fill.style.width = `${(day / DAYS_PER_LEVEL) * 100}%`;
        progress?.setAttribute('aria-valuenow', String(day));

        const metrics = currentMetrics();
        if (!metrics) return;
        const display = document.getElementById('live-excess-display');
        const indicator = document.querySelector('.excess-meter-indicator');
        const meter = document.getElementById('excess-meter');
        const pct = metrics.excess * 100;
        const position = 50 + Math.max(-50, Math.min(50, (pct / 15) * 50));
        if (display) display.textContent = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
        if (indicator) indicator.style.left = `${position}%`;
        if (meter) meter.dataset.leading = String(metrics.excess > 0);
    }

    function showToast(message, kind = 'success') {
        const toast = document.getElementById('game-feedback-toast');
        if (!toast) return;
        window.clearTimeout(toastTimer);
        toast.textContent = message;
        toast.dataset.kind = kind;
        toast.hidden = false;
        toast.classList.remove('is-visible');
        requestAnimationFrame(() => toast.classList.add('is-visible'));
        toastTimer = window.setTimeout(() => {
            toast.classList.remove('is-visible');
            window.setTimeout(() => { toast.hidden = true; }, 160);
        }, 1100);
    }

    function rejectControl(type) {
        const control = type === 'buy' ? document.getElementById('btn-buy') : document.getElementById('btn-sell');
        control?.classList.remove('is-rejected');
        requestAnimationFrame(() => control?.classList.add('is-rejected'));
        window.setTimeout(() => control?.classList.remove('is-rejected'), 360);
    }

    function clearGuideTarget() {
        document.querySelectorAll('.guide-target').forEach((element) => element.classList.remove('guide-target'));
    }

    function guideTarget(step) {
        const virtual = window.FlappyKUiState?.virtualControls
            ?? (window.matchMedia?.('(pointer: coarse)').matches || Number(navigator.maxTouchPoints || 0) > 0 || window.innerWidth < 720);
        return virtual ? `#btn-${step}` : `.trade-hint-${step}`;
    }

    function renderGuide(title, body, targetSelector) {
        if (!guide) return;
        clearGuideTarget();
        const titleElement = guide.querySelector('[data-guide-title]');
        const bodyElement = guide.querySelector('[data-guide-body]');
        if (titleElement) titleElement.textContent = title;
        if (bodyElement) bodyElement.textContent = body;
        document.querySelector(targetSelector)?.classList.add('guide-target');
        guide.dataset.step = guideStep;
    }

    function finishGuide() {
        if (!guide) return;
        window.clearTimeout(guideObserveTimer);
        clearGuideTarget();
        guide.remove();
        guide = null;
        guideStep = '';
        onboarding?.markSeen?.();
        if (Number.isFinite(guideOriginalSpeed) && Number(speedMultiplier) !== guideOriginalSpeed) {
            changeSpeed(guideOriginalSpeed - Number(speedMultiplier));
            syncSpeedReadouts();
        }
        guideOriginalSpeed = null;
        uiState?.transition?.(uiState.STATES.PLAYING, { source: 'guide-complete' });
    }

    function beginGuide() {
        if (guide || onboarding?.hasSeen?.()) return;
        guideOriginalSpeed = Number(speedMultiplier) || 15;
        if (guideOriginalSpeed > 5) {
            changeSpeed(5 - guideOriginalSpeed);
            syncSpeedReadouts();
        }

        const strings = copy();
        guide = document.createElement('aside');
        guide.className = 'game-coachmark';
        guide.dataset.active = 'true';
        guide.innerHTML = `
            <div class="game-coachmark-copy">
                <strong data-guide-title></strong>
                <span data-guide-body></span>
            </div>
            <button type="button" data-guide-skip>${strings.skip}</button>`;
        guide.querySelector('[data-guide-skip]')?.addEventListener('click', finishGuide);
        document.getElementById('game-container')?.appendChild(guide);
        guideStep = 'buy';
        renderGuide(strings.guideBuyTitle, strings.guideBuyBody, guideTarget('buy'));
        uiState?.transition?.(uiState.STATES.ONBOARDING, { source: 'first-run' });
    }

    function advanceGuideAfterTrade(type, success) {
        if (!guide || !success) return;
        const strings = copy();
        if (guideStep === 'buy' && type === 'buy') {
            guideStep = 'observe';
            renderGuide(strings.guideObserveTitle, strings.guideObserveBody, '#excess-meter');
            window.clearTimeout(guideObserveTimer);
            guideObserveTimer = window.setTimeout(() => {
                if (!guide) return;
                guideStep = 'sell';
                renderGuide(strings.guideSellTitle, strings.guideSellBody, guideTarget('sell'));
            }, 1700);
        } else if (guideStep === 'sell' && type === 'sell') {
            guideStep = 'goal';
            renderGuide(strings.guideGoalTitle, strings.guideGoalBody, '#excess-meter');
            window.clearTimeout(guideObserveTimer);
            guideObserveTimer = window.setTimeout(finishGuide, 3200);
        }
    }

    function inspectTrade(type, before) {
        window.setTimeout(() => {
            const afterCount = Array.isArray(actions) ? actions.length : 0;
            const success = afterCount > before.actions;
            const strings = copy();
            if (success) {
                showToast(type === 'buy' ? strings.bought : strings.sold, 'success');
                navigator.vibrate?.(18);
            } else {
                showToast(type === 'buy' ? strings.noCash : strings.noPosition, 'error');
                rejectControl(type);
                navigator.vibrate?.([12, 30, 12]);
            }
            advanceGuideAfterTrade(type, success);
        }, 0);
    }

    function bindTradeFeedback() {
        const bind = (element, type) => {
            element?.addEventListener('click', () => {
                inspectTrade(type, { actions: Array.isArray(actions) ? actions.length : 0 });
            }, { capture: true });
        };
        bind(document.getElementById('btn-buy'), 'buy');
        bind(document.getElementById('btn-sell'), 'sell');
        window.addEventListener('keydown', (event) => {
            if (!isPlaying || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
            inspectTrade(event.key === 'ArrowUp' ? 'buy' : 'sell', {
                actions: Array.isArray(actions) ? actions.length : 0,
            });
        }, { capture: true });
    }

    function parsePercent(value) {
        const parsed = Number.parseFloat(String(value || '').replace(/[^\d+\-.]/g, ''));
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function setSignedBar(element, value, scale) {
        if (!element) return;
        const magnitude = Math.min(50, Math.max(2, (Math.abs(value) / scale) * 50));
        element.style.left = value >= 0 ? '50%' : `${50 - magnitude}%`;
        element.style.width = `${magnitude}%`;
        element.dataset.direction = value >= 0 ? 'positive' : 'negative';
    }

    function renderSettlement() {
        if (!card) return;
        const playerText = document.getElementById('card-level-return')?.textContent || '---%';
        const marketText = document.getElementById('card-market-return')?.textContent || '---%';
        const excessText = document.getElementById('card-excess-return')?.textContent || '---%';
        const excess = parsePercent(excessText);
        const player = parsePercent(playerText);
        const market = parsePercent(marketText);
        // Game core owns pass/fail. The displayed excess is rounded and must never become another authority.
        const success = document.getElementById('card-status')?.classList.contains('card-positive') === true;
        const scale = Math.max(1, Math.abs(player), Math.abs(market));
        const strings = copy();

        const verdict = document.getElementById('settlement-verdict');
        const excessSummary = document.getElementById('settlement-excess-summary');
        const playerSummary = document.getElementById('settlement-player-summary');
        const marketSummary = document.getElementById('settlement-market-summary');
        const medalBox = document.getElementById('settlement-medal-box');

        if (verdict) verdict.textContent = success ? strings.success : strings.failure;
        if (excessSummary) excessSummary.textContent = excessText;
        if (playerSummary) playerSummary.textContent = playerText;
        if (marketSummary) marketSummary.textContent = marketText;
        setSignedBar(document.getElementById('settlement-player-bar'), player, scale);
        setSignedBar(document.getElementById('settlement-market-bar'), market, scale);

        if (medalBox) {
            const icon = medalBox.querySelector('.settlement-medal-icon');
            const medalTitle = medalBox.querySelector('.settlement-medal-title');
            if (excess >= 10) {
                if (icon) icon.textContent = '🏆';
                if (medalTitle) medalTitle.textContent = t('LEGEND', '传奇金杯');
                medalBox.dataset.medal = 'legend';
            } else if (success) {
                if (icon) icon.textContent = '🥇';
                if (medalTitle) medalTitle.textContent = t('GOLD', '通关金牌');
                medalBox.dataset.medal = 'gold';
            } else if (player > 0) {
                if (icon) icon.textContent = '🥈';
                if (medalTitle) medalTitle.textContent = t('SILVER', '正收益');
                medalBox.dataset.medal = 'silver';
            } else {
                if (icon) icon.textContent = '💀';
                if (medalTitle) medalTitle.textContent = t('BUST', '未达标');
                medalBox.dataset.medal = 'fail';
            }
        }

        card.dataset.result = success ? 'success' : 'failure';
        card.dataset.detailsExpanded = 'false';
        const toggle = document.getElementById('settlement-details-toggle');
        if (toggle) {
            toggle.textContent = strings.details;
            toggle.setAttribute('aria-expanded', 'false');
        }
    }

    function bindSettlementToggle() {
        const toggle = document.getElementById('settlement-details-toggle');
        toggle?.addEventListener('click', () => {
            const expanded = card?.dataset.detailsExpanded === 'true';
            if (card) card.dataset.detailsExpanded = String(!expanded);
            toggle.setAttribute('aria-expanded', String(!expanded));
            toggle.textContent = expanded ? copy().details : copy().hideDetails;
        });
    }

    function bindDesktopSpeed() {
        document.querySelector('.desktop-speed-control .speed-step-minus')?.addEventListener('click', (event) => {
            event.preventDefault();
            changeSpeed(-1);
            syncSpeedReadouts();
        });
        document.querySelector('.desktop-speed-control .speed-step-plus')?.addEventListener('click', (event) => {
            event.preventDefault();
            changeSpeed(1);
            syncSpeedReadouts();
        });
    }

    bindTradeFeedback();
    bindSettlementToggle();
    bindDesktopSpeed();
    syncStaticCopy();
    syncSpeedReadouts();
    renderHud();

    controller?.on('level-did-start', () => {
        renderHud();
        syncSpeedReadouts();
        if (onboarding?.consumePending?.()) requestAnimationFrame(beginGuide);
    });
    controller?.on('tick', renderHud);
    controller?.on('trade', () => {
        renderHud();
        if (controlsHint && !controlsHint.classList.contains('is-dismissed') && !guide) {
            controlsHint.classList.add('is-dismissed');
        }
    });
    controller?.on('level-did-settle', () => requestAnimationFrame(renderSettlement));

    if (speedState) {
        new MutationObserver(syncSpeedReadouts).observe(speedState, {
            childList: true,
            characterData: true,
            subtree: true,
        });
    }

    new MutationObserver(syncStaticCopy).observe(root, {
        attributes: true,
        attributeFilter: ['lang', 'data-flappyk-language'],
    });
    document.addEventListener('flappyk:language-changed', syncStaticCopy);
    window.addEventListener('flappyk:layout-state', () => {
        if (!guide || !['buy', 'sell'].includes(guideStep)) return;
        const strings = copy();
        renderGuide(
            guideStep === 'buy' ? strings.guideBuyTitle : strings.guideSellTitle,
            guideStep === 'buy' ? strings.guideBuyBody : strings.guideSellBody,
            guideTarget(guideStep),
        );
    });

    window.FlappyKPremiumUI = {
        renderHud,
        renderSettlement,
        beginGuide,
        finishGuide,
        syncSpeedReadouts,
        syncStaticCopy,
    };
})();