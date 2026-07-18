(() => {
    'use strict';

    const AUTO_NEXT_DELAY_MS = 2200;
    let autoNextTimer = null;

    function clearAutoNext() {
        if (autoNextTimer !== null) {
            window.clearTimeout(autoNextTimer);
            autoNextTimer = null;
        }
    }

    function returnToHome() {
        clearAutoNext();
        clearInterval(gameInterval);
        isPlaying = false;
        stopAudio();

        // Reloading guarantees that normal mode, custom mode, settlement state,
        // audio, timers, and collected cards all return to the same clean home state.
        window.location.reload();
    }

    function scheduleAutoNext() {
        clearAutoNext();

        const settlementIsActive = settlementScreen.classList.contains('active');
        const nextIsAvailable = nextBtn.style.display !== 'none';

        if (!settlementIsActive || !nextIsAvailable) return;

        autoNextTimer = window.setTimeout(() => {
            autoNextTimer = null;

            if (settlementScreen.classList.contains('active')
                && nextBtn.style.display !== 'none') {
                nextBtn.click();
            }
        }, AUTO_NEXT_DELAY_MS);
    }

    const settlementObserver = new MutationObserver(scheduleAutoNext);
    settlementObserver.observe(settlementScreen, {
        attributes: true,
        attributeFilter: ['class'],
    });

    nextBtn.addEventListener('click', clearAutoNext, { capture: true });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        returnToHome();
    }, { capture: true });

    window.returnFlappyKToHome = returnToHome;
})();