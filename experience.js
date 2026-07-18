(() => {
    'use strict';

    function returnToHome() {
        clearInterval(gameInterval);
        isPlaying = false;
        stopAudio();

        // Reloading guarantees that normal mode, custom mode, settlement state,
        // audio, timers, and collected cards all return to the same clean home state.
        window.location.reload();
    }

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        returnToHome();
    }, { capture: true });

    window.returnFlappyKToHome = returnToHome;
})();
