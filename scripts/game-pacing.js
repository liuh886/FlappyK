(() => {
    'use strict';

    const DEFAULT_SPEED = 15;
    const gameContainer = document.getElementById('game-container');
    const topControls = document.getElementById('game-top-controls');
    const mobileControls = document.getElementById('mobile-controls');
    const pauseButton = document.getElementById('pause-btn');
    const backButton = document.getElementById('game-back-btn');
    const mobileViewport = window.matchMedia('(max-width: 768px)');
    let paused = false;
    let gameActive = false;

    function syncControlVisibility() {
        if (topControls) {
            topControls.hidden = !gameActive;
            topControls.setAttribute('aria-hidden', String(!gameActive));
        }
        if (mobileControls) {
            const showMobileControls = gameActive && mobileViewport.matches;
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
        if (!pauseButton) return;
        pauseButton.textContent = '';
        pauseButton.setAttribute('aria-label', paused ? 'Resume game' : 'Pause game');
        pauseButton.setAttribute('aria-pressed', String(paused));
        pauseButton.setAttribute('title', `${paused ? 'Resume' : 'Pause'} [Space]`);
    }

    function pauseGame() {
        if (!isPlaying || paused) return false;
        paused = true;
        isPlaying = false;
        clearInterval(gameInterval);
        stopAudio();
        syncPauseControl();
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
        const confirmed = window.confirm('Exit this run and return to home? Current progress will be lost.');
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

    if (typeof mobileViewport.addEventListener === 'function') {
        mobileViewport.addEventListener('change', syncControlVisibility);
    } else if (typeof mobileViewport.addListener === 'function') {
        mobileViewport.addListener(syncControlVisibility);
    }

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
    };
})();
