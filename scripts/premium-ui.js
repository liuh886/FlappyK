(() => {
    'use strict';

    const root = document.documentElement;
    const uiState = window.FlappyKUiState;
    const onboarding = window.FlappyKOnboarding;
    const t = (english, chinese) => root.dataset.flappykLanguage === 'zh' ? chinese : english;

    const refs = {
        stats: document.querySelector('.stats-box'),
        controlsHint: document.querySelector('.controls-hint'),
        mobileControls: document.getElementById('mobile-controls'),
        speedLegacy: document.getElementById('speed-btn'),
        startActions: document.querySelector('#start-screen .start-actions'),
        dailyButton: document.getElementById('daily-run-btn'),
        leaderboardButton: document.getElementById('leaderboard-open-btn'),
        dailySummary: document.getElementById('daily-run-summary'),
        profileSummary: document.getElementById('personal-profile-summary'),
        settlement: document.getElementById('settlement-screen'),
        card: document.getElementById('profit-card'),
    };

    const copy = {
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

    let toastTimer = 0;
    let guide = null;
    let guideStep = '';
    let guideOriginalSpeed = null;
    let guideObserveTimer = 0;

    function rowFor(id) {
        return document.getElementById(id)?.parentElement || null;
    }

    function installHomeHierarchy() {
        const startScreen = document.getElementById('start-screen');
        if (!startScreen || !refs.startActions || document.querySelector('.home-mode-stack')) return;

        refs.startActions.classList.add('home-primary-actions');
        const modeStack = document.createElement('div');
        modeStack.className = 'home-mode-stack';

        const dailyCard = document.createElement('section');
        dailyCard.className = 'daily-mode-card';
        if (refs.dailySummary) dailyCard.appendChild(refs.dailySummary);
        if (refs.dailyButton) dailyCard.appendChild(refs.dailyButton);

        const secondary = document.createElement('div');
        secondary.className = 'home-secondary-actions';
        if (refs.leaderboardButton) {
            refs.leaderboardButton.textContent = copy.rankings;
            secondary.appendChild(refs.leaderboardButton);
        }
        const installButton = document.getElementById('pwa-install-btn');
        if (installButton) secondary.appendChild(installButton);

        modeStack.append(dailyCard, secondary);
        refs.startActions.after(modeStack);
        if (refs.profileSummary) modeStack.before(refs.profileSummary);
    }

    function installHud() {
        if (!refs.stats || refs.stats.dataset.premium === 'true') return;
        refs.stats.dataset.premium = 'true';

        const gameRow = rowFor('level-display');
        const dayRow = rowFor('day-display');
        const cashRow = rowFor('cash-display');
        const assetRow = rowFor('asset-display');
        const totalRow = rowFor('total-display');
        const returnRow = rowFor('return-display');
        const targetRow = rowFor('target-return-display');

        [gameRow, dayRow, cashRow, assetRow, totalRow, returnRow, targetRow]
            .filter(Boolean)
            .forEach((row) => row.classList.add('hud-stat-row'));
        gameRow?.classList.add('hud-game');
        dayRow?.classList.add('hud-day');
        cashRow?.classList.add('hud-cash');
        assetRow?.classList.add('hud-detail-row');
        totalRow?.classList.add('hud-total');
        returnRow?.classList.add('hud-return');
        targetRow?.classList.add('hud-legacy-goal');

        const header = document.createElement('div');
        header.className = 'hud-header';
        [gameRow, dayRow].filter(Boolean).forEach((row) => header.appendChild(row));

        const main = document.createElement('div');
        main.className = 'hud-main';
        [totalRow, cashRow, returnRow].filter(Boolean).forEach((row) => main.appendChild(row));

        const progress = document.createElement('div');
        progress.className = 'day-progress';
        progress.setAttribute('role', 'progressbar');
        progress.setAttribute('aria-valuemin', '1');
        progress.setAttribute('aria-valuemax', '250');
        progress.innerHTML = '<span class="day-progress-fill"></span>';

        const meter = document.createElement('div');
        meter.id = 'excess-meter';
        meter.className = 'excess-meter';
        meter.innerHTML = `
            <div class="excess-meter-label"><span>${copy.excess}</span><strong id="live-excess-display">+0.00%</strong></div>
            <div class="excess-meter-track" aria-hidden="true">
                <span class="excess-meter-negative"></span>
                <span class="excess-meter-positive"></span>
                <span class="excess-meter-zero"></span>
                <span class="excess-meter-indicator"></span>
            </div>`;

        const details = document.createElement('details');
        details.className = 'hud-details';
        details.innerHTML = `<summary aria-label="${t('Show cash and position details', '显示现金与持仓详情')}">•••</summary>`;
        [assetRow].filter(Boolean).forEach((row) => details.appendChild(row));

        refs.stats.replaceChildren(header, main, progress, meter, details);
    }

    function buildSpeedControl(className, readoutId) {
        const wrapper = document.createElement('div');
        wrapper.className = `game-speed-control ${className}`;
        const minus = document.createElement('button');
        minus.type = 'button';
        minus.className = 'speed-step speed-step-minus';
        minus.setAttribute('aria-label', t('Slow down', '减速'));
        minus.textContent = '−';
        const output = document.createElement('output');
        output.id = readoutId;
        output.className = 'speed-readout';
        output.textContent = `${Number(speedMultiplier) || 15}×`;
        const plus = document.createElement('button');
        plus.type = 'button';
        plus.className = 'speed-step speed-step-plus';
        plus.setAttribute('aria-label', t('Speed up', '加速'));
        plus.textContent = '+';
        minus.addEventListener('click', (event) => {
            event.preventDefault();
            changeSpeed(-1);
        });
        plus.addEventListener('click', (event) => {
            event.preventDefault();
            changeSpeed(1);
        });
        wrapper.append(minus, output, plus);
        return wrapper;
    }

    function installDesktopControls() {
        if (!refs.controlsHint || refs.controlsHint.dataset.premium === 'true') return;
        refs.controlsHint.dataset.premium = 'true';
        refs.controlsHint.innerHTML = `
            <div class="trade-key-hints">
                <div class="trade-key-hint trade-hint-buy"><span class="key">↑</span><span>${t('BUY $1K', '买入 $1K')}</span></div>
                <div class="trade-key-hint trade-hint-sell"><span class="key">↓</span><span>${t('SELL $1K', '卖出 $1K')}</span></div>
            </div>`;
        refs.controlsHint.appendChild(buildSpeedControl('desktop-speed-control', 'desktop-speed-readout'));
        if (refs.speedLegacy) {
            refs.speedLegacy.hidden = true;
            refs.speedLegacy.tabIndex = -1;
            refs.speedLegacy.setAttribute('aria-hidden', 'true');
            refs.controlsHint.appendChild(refs.speedLegacy);
        }
    }

    function installMobileControls() {
        if (!refs.mobileControls || refs.mobileControls.dataset.premium === 'true') return;
        refs.mobileControls.dataset.premium = 'true';
        const buy = document.getElementById('btn-buy');
        const sell = document.getElementById('btn-sell');
        const down = document.getElementById('btn-speed-down');
        const up = document.getElementById('btn-speed-up');
        if (!buy || !sell || !down || !up) return;

        buy.classList.add('mobile-trade-primary');
        sell.classList.add('mobile-trade-primary');
        down.textContent = '−';
        up.textContent = '+';
        down.setAttribute('aria-label', t('Slow down', '减速'));
        up.setAttribute('aria-label', t('Speed up', '加速'));

        const center = document.createElement('div');
        center.className = 'mobile-speed-control';
        const output = document.createElement('output');
        output.id = 'mobile-speed-readout';
        output.className = 'speed-readout';
        output.textContent = `${Number(speedMultiplier) || 15}×`;
        center.append(down, output, up);
        refs.mobileControls.replaceChildren(buy, center, sell);
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
        if (!Number.isFinite(startPrice) || startPrice <= 0 || !Number.isFinite(price)) return null;
        const assetValue = Number(shares || 0) * price;
        const total = Number(cash || 0) + assetValue;
        const playerReturn = (total - INITIAL_CASH) / INITIAL_CASH;
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

    function installToast() {
        if (document.getElementById('game-feedback-toast')) return;
        const toast = document.createElement('div');
        toast.id = 'game-feedback-toast';
        toast.className = 'game-feedback-toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        toast.hidden = true;
        document.getElementById('game-container')?.appendChild(toast);
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

    function advanceGuideAfterTrade(type, success) {
        if (!guide || !success) return;
        if (guideStep === 'buy' && type === 'buy') {
            guideStep = 'observe';
            renderGuide(copy.guideObserveTitle, copy.guideObserveBody, '#excess-meter');
            window.clearTimeout(guideObserveTimer);
            guideObserveTimer = window.setTimeout(() => {
                if (!guide) return;
                guideStep = 'sell';
                renderGuide(copy.guideSellTitle, copy.guideSellBody, root.dataset.layout === 'compact' ? '#btn-sell' : '.trade-hint-sell');
            }, 1700);
        } else if (guideStep === 'sell' && type === 'sell') {
            guideStep = 'goal';
            renderGuide(copy.guideGoalTitle, copy.guideGoalBody, '#excess-meter');
            window.clearTimeout(guideObserveTimer);
            guideObserveTimer = window.setTimeout(finishGuide, 3200);
        }
    }

    function inspectTrade(type, before) {
        window.setTimeout(() => {
            const afterCount = Array.isArray(actions) ? actions.length : 0;
            const success = afterCount > before.actions;
            if (success) {
                showToast(type === 'buy' ? copy.bought : copy.sold, 'success');
                navigator.vibrate?.(18);
            } else {
                showToast(type === 'buy' ? copy.noCash : copy.noPosition, 'error');
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
            const type = event.key === 'ArrowUp' ? 'buy' : 'sell';
            inspectTrade(type, { actions: Array.isArray(actions) ? actions.length : 0 });
        }, { capture: true });
    }

    function clearGuideTarget() {
        document.querySelectorAll('.guide-target').forEach((element) => element.classList.remove('guide-target'));
    }

    function renderGuide(title, body, targetSelector) {
        if (!guide) return;
        clearGuideTarget();
        const titleElement = guide.querySelector('[data-guide-title]');
        const bodyElement = guide.querySelector('[data-guide-body]');
        if (titleElement) titleElement.textContent = title;
        if (bodyElement) bodyElement.textContent = body;
        const target = document.querySelector(targetSelector);
        target?.classList.add('guide-target');
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
        }
        guideOriginalSpeed = null;
        uiState?.transition?.(uiState.STATES.PLAYING, { source: 'guide-complete' });
    }

    function beginGuide() {
        if (guide || onboarding?.hasSeen?.()) return;
        guideOriginalSpeed = Number(speedMultiplier) || 15;
        if (guideOriginalSpeed > 5) changeSpeed(5 - guideOriginalSpeed);

        guide = document.createElement('aside');
        guide.className = 'game-coachmark';
        guide.dataset.active = 'true';
        guide.innerHTML = `
            <div class="game-coachmark-copy">
                <strong data-guide-title></strong>
                <span data-guide-body></span>
            </div>
            <button type="button" data-guide-skip>${copy.skip}</button>`;
        guide.querySelector('[data-guide-skip]').addEventListener('click', finishGuide);
        document.getElementById('game-container')?.appendChild(guide);
        guideStep = 'buy';
        renderGuide(copy.guideBuyTitle, copy.guideBuyBody, root.dataset.layout === 'compact' ? '#btn-buy' : '.trade-hint-buy');
        uiState?.transition?.(uiState.STATES.ONBOARDING, { source: 'first-run' });
    }

    function installSettlementSummary() {
        if (!refs.card || document.getElementById('settlement-summary')) return;
        const title = refs.card.querySelector('#card-title');
        const summary = document.createElement('section');
        summary.id = 'settlement-summary';
        summary.className = 'settlement-summary';
        summary.innerHTML = `
            <div id="settlement-medal-box" class="settlement-medal-box">
                <span class="settlement-medal-icon">🏅</span>
                <strong class="settlement-medal-title">MEDAL</strong>
            </div>
            <div class="settlement-main-result">
                <div id="settlement-verdict" class="settlement-verdict"></div>
                <div id="settlement-excess-summary" class="settlement-excess-summary">---%</div>
            </div>
            <div class="settlement-comparison">
                <div class="settlement-comparison-row">
                    <span>${copy.player}</span>
                    <div class="settlement-comparison-track"><i id="settlement-player-bar"></i></div>
                    <strong id="settlement-player-summary">---%</strong>
                </div>
                <div class="settlement-comparison-row">
                    <span>${copy.market}</span>
                    <div class="settlement-comparison-track"><i id="settlement-market-bar"></i></div>
                    <strong id="settlement-market-summary">---%</strong>
                </div>
            </div>`;
        title?.after(summary);

        const toggle = document.createElement('button');
        toggle.id = 'settlement-details-toggle';
        toggle.type = 'button';
        toggle.className = 'settlement-details-toggle';
        toggle.textContent = copy.details;
        toggle.setAttribute('aria-expanded', 'false');
        toggle.addEventListener('click', () => {
            const expanded = refs.card.dataset.detailsExpanded === 'true';
            refs.card.dataset.detailsExpanded = String(!expanded);
            toggle.setAttribute('aria-expanded', String(!expanded));
            toggle.textContent = expanded ? copy.details : copy.hideDetails;
        });
        refs.card.querySelector('.card-details')?.after(toggle);
    }

    function parsePercent(value) {
        const parsed = Number.parseFloat(String(value || '').replace(/[^\d+\-.]/g, ''));
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function renderSettlement() {
        const playerText = document.getElementById('card-level-return')?.textContent || '---%';
        const marketText = document.getElementById('card-market-return')?.textContent || '---%';
        const excessText = document.getElementById('card-excess-return')?.textContent || '---%';
        const excess = parsePercent(excessText);
        const player = parsePercent(playerText);
        const market = parsePercent(marketText);
        const success = excess > 0;
        const scale = Math.max(1, Math.abs(player), Math.abs(market));

        const verdict = document.getElementById('settlement-verdict');
        const excessSummary = document.getElementById('settlement-excess-summary');
        const playerSummary = document.getElementById('settlement-player-summary');
        const marketSummary = document.getElementById('settlement-market-summary');
        const playerBar = document.getElementById('settlement-player-bar');
        const marketBar = document.getElementById('settlement-market-bar');
        const medalBox = document.getElementById('settlement-medal-box');

        if (verdict) verdict.textContent = success ? copy.success : copy.failure;
        if (excessSummary) excessSummary.textContent = excessText;
        if (playerSummary) playerSummary.textContent = playerText;
        if (marketSummary) marketSummary.textContent = marketText;
        if (playerBar) playerBar.style.width = `${Math.max(4, Math.abs(player) / scale * 100)}%`;
        if (marketBar) marketBar.style.width = `${Math.max(4, Math.abs(market) / scale * 100)}%`;

        if (medalBox) {
            const icon = medalBox.querySelector('.settlement-medal-icon');
            const medalTitle = medalBox.querySelector('.settlement-medal-title');
            if (excess >= 10) {
                if (icon) icon.textContent = '🏆';
                if (medalTitle) medalTitle.textContent = t('LEGEND', '传奇金杯');
                medalBox.dataset.medal = 'legend';
            } else if (excess > 0) {
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

        refs.card.dataset.result = success ? 'success' : 'failure';
        refs.card.dataset.detailsExpanded = 'false';
        const toggle = document.getElementById('settlement-details-toggle');
        if (toggle) {
            toggle.textContent = copy.details;
            toggle.setAttribute('aria-expanded', 'false');
        }
    }

    function installFinalWrappers() {
        const previousUpdateUI = updateUI;
        updateUI = function premiumUpdateUI() {
            const result = previousUpdateUI();
            renderHud();
            syncSpeedReadouts();
            return result;
        };

        window.FlappyKGameController?.on('level-did-start', () => {
            renderHud();
            syncSpeedReadouts();
            uiState?.transition?.(uiState.STATES.PLAYING, { source: 'start-level' });
            if (onboarding?.consumePending?.()) requestAnimationFrame(beginGuide);
        });

        window.FlappyKGameController?.on('level-did-settle', () => {
            requestAnimationFrame(() => {
                renderSettlement();
                uiState?.transition?.(uiState.STATES.SETTLEMENT, { source: 'end-level' });
            });
        });
    }

    installHomeHierarchy();
    if (refs.startActions) {
        new MutationObserver(() => {
            const installButton = document.getElementById('pwa-install-btn');
            const secondary = document.querySelector('.home-secondary-actions');
            if (installButton && secondary && installButton.parentElement !== secondary) {
                secondary.appendChild(installButton);
            }
        }).observe(refs.startActions, { childList: true });
    }
    installHud();
    installDesktopControls();
    installMobileControls();
    installToast();
    installSettlementSummary();
    bindTradeFeedback();
    installFinalWrappers();
    renderHud();
    syncSpeedReadouts();

    const speedObserver = refs.speedLegacy
        ? new MutationObserver(syncSpeedReadouts)
        : null;
    speedObserver?.observe(refs.speedLegacy, { childList: true, characterData: true, subtree: true });

    window.addEventListener('flappyk:layout-state', () => {
        if (guide && guideStep === 'buy') {
            renderGuide(copy.guideBuyTitle, copy.guideBuyBody, root.dataset.layout === 'compact' ? '#btn-buy' : '.trade-hint-buy');
        } else if (guide && guideStep === 'sell') {
            renderGuide(copy.guideSellTitle, copy.guideSellBody, root.dataset.layout === 'compact' ? '#btn-sell' : '.trade-hint-sell');
        }
    });

    window.FlappyKPremiumUI = {
        renderHud,
        renderSettlement,
        beginGuide,
        finishGuide,
        syncSpeedReadouts,
    };
})();