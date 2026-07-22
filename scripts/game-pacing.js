(() => {
    'use strict';

    const DEFAULT_SPEED = 15;
    const gameContainer = document.getElementById('game-container');
    const pauseButton = document.getElementById('pause-btn');
    let paused = false;

    pauseButton?.parentElement?.classList.add('pause-control-slot');

    function setGameActive(active) {
        gameContainer?.classList.toggle('game-active', Boolean(active));
    }

    function syncPauseControl() {
        if (!pauseButton) return;
        const label = paused ? 'RESUME' : 'PAUSE';
        pauseButton.textContent = label;
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
        togglePause();
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

    setGameActive(false);
    syncPauseControl();
    window.FlappyKPacing = {
        get paused() { return paused; },
        pause: pauseGame,
        resume: resumeGame,
        toggle: togglePause,
    };
})();
