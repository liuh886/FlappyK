(() => {
    'use strict';

    const DEFAULT_SPEED = 15;
    const pauseButton = document.getElementById('pause-btn');
    const mobilePauseButton = document.getElementById('btn-pause');
    let paused = false;

    function syncPauseControls() {
        const label = paused ? 'RESUME' : 'PAUSE';
        if (pauseButton) pauseButton.textContent = `${label} [SPACE]`;
        if (mobilePauseButton) {
            mobilePauseButton.textContent = paused ? '▶' : 'Ⅱ';
            mobilePauseButton.setAttribute('aria-label', paused ? 'Resume game' : 'Pause game');
        }
    }

    function pauseGame() {
        if (!isPlaying || paused) return false;
        paused = true;
        isPlaying = false;
        clearInterval(gameInterval);
        stopAudio();
        syncPauseControls();
        return true;
    }

    function resumeGame() {
        if (!paused) return false;
        paused = false;
        isPlaying = true;
        startAudio();
        clearInterval(gameInterval);
        gameInterval = setInterval(gameTick, TICK_RATE);
        syncPauseControls();
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
        syncPauseControls();
    };

    pauseButton?.addEventListener('click', (event) => {
        event.preventDefault();
        togglePause();
    });

    mobilePauseButton?.addEventListener('click', (event) => {
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

    syncPauseControls();
    window.FlappyKPacing = {
        get paused() { return paused; },
        pause: pauseGame,
        resume: resumeGame,
        toggle: togglePause,
    };
})();
