(() => {
    'use strict';

    const DEFAULT_SPEED = 15;
    const root = document.documentElement;
    const gameContainer = document.getElementById('game-container');
    const topControls = document.getElementById('game-top-controls');
    const mobileControls = document.getElementById('mobile-controls');
    const pauseButton = document.getElementById('pause-btn');
    const backButton = document.getElementById('game-back-btn');
    const narrowViewport = window.matchMedia('(max-width: 719px)');
    const coarsePointer = window.matchMedia('(pointer: coarse)');
    let paused = false;
    let gameActive = false;

    function isChinese() {
        return root.dataset.flappykLanguage === 'zh'
            || root.lang.toLowerCase().startsWith('zh');
    }

    function wantsVirtualControls() {
        const sharedLayout = window.FlappyKUiState;
        if (sharedLayout) return sharedLayout.virtualControls;
        const hasTouch = Number(navigator.maxTouchPoints || 0) > 0;
        return narrowViewport.matches || coarsePointer.matches || hasTouch;
    }

    function shouldShowVirtualControls() {
        return gameActive && wantsVirtualControls();
    }

    function syncControlVisibility() {
        if (topControls) {
            topControls.hidden = !gameActive;
            topControls.setAttribute('aria-hidden', String(!gameActive));
        }
        if (mobileControls) {
            const showMobileControls = shouldShowVirtualControls();
            mobileControls.hidden = !showMobileControls;
            mobileControls.setAttribute('aria-hidden', String(!showMobileControls));
        }
    }

    function setGameActive(active) {
        gameActive = Boolean(active);
        gameContainer?.classList.toggle('game-active', gameActive);
        syncControlVisibility();
    }

    function syncPauseControl() {
        if (pauseButton) {
            const resume = paused;
            const action = resume
                ? (isChinese() ? '继续游戏' : 'Resume game')
                : (isChinese() ? '暂停游戏' : 'Pause game');
            pauseButton.textContent = resume ? '▶' : 'Ⅱ';
            pauseButton.setAttribute('aria-label', action);
            pauseButton.setAttribute('aria-pressed', String(paused));
            pauseButton.setAttribute(
                'title',
                `${resume ? (isChinese() ? '继续' : 'Resume') : (isChinese() ? '暂停' : 'Pause')} [Space]`,
            );
        }
        if (backButton) {
            backButton.textContent = '↩';
            backButton.setAttribute('aria-label', isChinese() ? '返回首页' : 'Return to home');
            backButton.setAttribute('title', isChinese() ? '返回首页' : 'Return to home');
        }
    }

    function pauseGame() {
        if (!isPlaying || paused) return false;
        paused = true;
        isPlaying = false;
        clearInterval(gameInterval);
        stopAudio();
        syncPauseControl();
        syncControlVisibility();
        window.FlappyKUiState?.transition?.(window.FlappyKUiState.STATES.PAUSED, { source: 'pacing' });
        return true;
    }

    function resumeGame() {
        if (!paused) return false;
        paused = false;
        isPlaying = true;
        startAudio();
        clearInterval(gameInterval);
        gameInterval = setInterval(gameTick, TICK_RATE);
        syncPauseControl();
        syncControlVisibility();
        window.FlappyKUiState?.transition?.(window.FlappyKUiState.STATES.PLAYING, { source: 'pacing' });
        return true;
    }

    function togglePause() {
        if (paused) return resumeGame();
        return pauseGame();
    }

    function returnHome() {
        if (!gameActive) return false;
        const wasPaused = paused;
        if (!wasPaused) pauseGame();
        const message = isChinese()
            ? '退出本局并返回首页？当前进度将丢失。'
            : 'Exit this run and return to home? Current progress will be lost.';
        const confirmed = window.confirm(message);
        if (confirmed) {
            setGameActive(false);
            window.location.reload();
            return true;
        }
        if (!wasPaused) resumeGame();
        return false;
    }

    if (Number.isFinite(speedMultiplier) && speedMultiplier !== DEFAULT_SPEED) {
        changeSpeed(DEFAULT_SPEED - speedMultiplier);
    }

    const previousStartLevel = startLevel;
    startLevel = function pacedStartLevel() {
        paused = false;
        previousStartLevel();
        setGameActive(true);
        syncPauseControl();
        window.FlappyKUiState?.transition?.(window.FlappyKUiState.STATES.PLAYING, { source: 'pacing' });
    };

    const previousEndLevel = endLevel;
    endLevel = function pacedEndLevel() {
        paused = false;
        const result = previousEndLevel();
        setGameActive(false);
        syncPauseControl();
        return result;
    };

    pauseButton?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        togglePause();
    });

    backButton?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        returnHome();
    });

    document.addEventListener('keydown', (event) => {
        if (event.code !== 'Space' || (!isPlaying && !paused)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        togglePause();
    }, { capture: true });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) pauseGame();
    });

    [narrowViewport, coarsePointer].forEach((mediaQuery) => {
        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', syncControlVisibility);
        } else if (typeof mediaQuery.addListener === 'function') {
            mediaQuery.addListener(syncControlVisibility);
        }
    });
    window.addEventListener('flappyk:layout-state', syncControlVisibility);
    window.addEventListener('resize', syncControlVisibility);
    window.addEventListener('orientationchange', syncControlVisibility);
    new MutationObserver(syncPauseControl).observe(root, {
        attributes: true,
        attributeFilter: ['lang', 'data-flappyk-language'],
    });

    setGameActive(false);
    syncPauseControl();
    window.FlappyKPacing = {
        get paused() { return paused; },
        get active() { return gameActive; },
        pause: pauseGame,
        resume: resumeGame,
        toggle: togglePause,
        returnHome,
        syncControls: syncControlVisibility,
        shouldShowVirtualControls,
    };
})();
