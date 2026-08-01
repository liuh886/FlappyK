(() => {
    'use strict';

    const MEASUREMENT_ID = 'G-ZW4437KBXE';
    const PWA_INSTALL_KEY = 'flappyk_ga4_pwa_install_v1';
    let levelStartedAt = 0;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
        window.dataLayer.push(arguments);
    };

    if (!document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}"]`)) {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
        document.head.appendChild(script);
    }

    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID);

    function isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches
            || window.matchMedia('(display-mode: fullscreen)').matches
            || window.navigator.standalone === true;
    }

    function getGameMode() {
        const levelText = document.getElementById('level-display')?.textContent?.trim();
        if (levelText === 'CUSTOM') return 'custom';
        if (window.FlappyKDailyRun?.isActive?.()) return 'daily';
        if (window.FlappyKFriendChallenge?.isActive?.()) return 'friend';
        return 'normal';
    }

    function track(eventName, parameters = {}) {
        if (!eventName || typeof window.gtag !== 'function') return;

        window.gtag('event', eventName, {
            game_mode: getGameMode(),
            language: document.documentElement.dataset.flappykLanguage
                || document.documentElement.lang
                || 'en',
            pwa_standalone: isStandalone(),
            ...parameters,
        });
    }

    function roundPercent(value) {
        const number = Number(value);
        return Number.isFinite(number) ? Number((number * 100).toFixed(2)) : undefined;
    }

    function installGameLifecycleTracking() {
        if (typeof startLevel === 'function') {
            const previousStartLevel = startLevel;
            startLevel = function analyticsAwareStartLevel(...args) {
                const startingLevel = Number(level);
                const result = previousStartLevel.apply(this, args);
                levelStartedAt = Date.now();

                if (startingLevel === 1) {
                    track('play_start');
                }

                return result;
            };
        }

        if (typeof endLevel === 'function') {
            const previousEndLevel = endLevel;
            endLevel = function analyticsAwareEndLevel(...args) {
                const completedLevel = Number(level);
                const gameMode = getGameMode();
                const completedMarket = String(currentMarket || 'unknown');
                const tradeCount = Array.isArray(actions) ? actions.length : 0;
                const durationSeconds = levelStartedAt
                    ? Math.max(0, Math.round((Date.now() - levelStartedAt) / 1000))
                    : undefined;
                const projectedCash = Number(cash) + (Number(shares) * Number(currentPrice));
                const performance = window.FlappyKMarketPassRule?.evaluate?.({
                    startCash: Number(levelStartCash),
                    finalCash: projectedCash,
                    startPrice: Number(currentData?.[0]?.close),
                    finalPrice: Number(currentPrice),
                });

                const result = previousEndLevel.apply(this, args);
                const success = Boolean(performance?.isSuccess);

                track('level_complete', {
                    game_mode: gameMode,
                    level_number: completedLevel,
                    market: completedMarket,
                    result: success ? 'success' : 'failure',
                    trade_count: tradeCount,
                    duration_seconds: durationSeconds,
                    player_return_pct: roundPercent(performance?.playerReturn),
                    market_return_pct: roundPercent(performance?.marketReturn),
                    excess_return_pct: roundPercent(performance?.excessReturn),
                });

                if (gameMode !== 'custom' && completedLevel === 3 && success) {
                    const score = window.FlappyKLegendScore?.calculate?.(collectedCards, finalReturn);
                    track('run_complete', {
                        game_mode: gameMode,
                        total_return_pct: Number.isFinite(Number(score?.totalReturn))
                            ? Number(Number(score.totalReturn).toFixed(2))
                            : undefined,
                        total_excess_pct: Number.isFinite(Number(score?.excess))
                            ? Number(Number(score.excess).toFixed(2))
                            : undefined,
                    });
                }

                return result;
            };
        }
    }

    function recordPwaInstall(source) {
        try {
            if (window.localStorage.getItem(PWA_INSTALL_KEY)) return;
            window.localStorage.setItem(PWA_INSTALL_KEY, source);
        } catch (error) {
            console.warn('FlappyK analytics could not persist the PWA install marker.', error);
        }

        track('pwa_install', { install_source: source });
    }

    window.addEventListener('appinstalled', () => recordPwaInstall('browser_event'));
    if (isStandalone()) recordPwaInstall('standalone_first_open');

    installGameLifecycleTracking();

    window.FlappyKAnalytics = {
        track,
        getGameMode,
        isStandalone,
    };
})();
