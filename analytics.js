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

    let analyticsLevelStartedAt = 0;

    function installGameLifecycleTracking() {
        const controller = window.FlappyKGameController;
        if (!controller) return;

        controller.on('level-will-start', () => {
            analyticsLevelStartedAt = Date.now();
        });

        controller.on('level-did-start', ({ level }) => {
            if (Number(level) === 1) track('play_start');
        });

        controller.on('level-did-settle', ({
            completedLevel,
            market,
            isSuccess,
            playerReturn,
            marketReturn,
            excessReturn,
        }) => {
            const gameMode = getGameMode();
            track('level_complete', {
                game_mode: gameMode,
                level_number: Number(completedLevel),
                market: String(market || 'unknown'),
                result: isSuccess ? 'success' : 'failure',
                trade_count: Array.isArray(actions) ? actions.length : 0,
                duration_seconds: analyticsLevelStartedAt
                    ? Math.max(0, Math.round((Date.now() - analyticsLevelStartedAt) / 1000))
                    : undefined,
                player_return_pct: roundPercent(playerReturn),
                market_return_pct: roundPercent(marketReturn),
                excess_return_pct: roundPercent(excessReturn),
            });

            if (gameMode !== 'custom' && Number(completedLevel) === 3 && isSuccess) {
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
        });
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
