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

    function resetDisplay() {
        levelDisp.textContent = '1';
        dayDisp.textContent = '1';
        cashDisp.textContent = INITIAL_CASH.toFixed(2);
        assetDisp.textContent = '0.00';
        totalDisp.textContent = INITIAL_CASH.toFixed(2);
        returnDisp.textContent = '0.00%';
        returnDisp.className = 'neutral';
        targetDisp.textContent = 'ANY PROFIT';
    }

    function returnToHome() {
        clearAutoNext();
        clearInterval(gameInterval);
        isPlaying = false;
        stopAudio();

        window.resetCustomChallengeState?.();

        settlementScreen.classList.remove('active');
        champagneScreen.classList.remove('active');
        document.getElementById('custom-challenge-screen')?.classList.remove('active');
        startScreen.classList.add('active');

        level = 1;
        targetReturn = 0;
        currentAsset = '';
        currentMarket = 'crypto';
        currentData = [];
        dayIndex = 0;
        cash = INITIAL_CASH;
        shares = 0;
        totalHistory = [];
        actions = [];
        collectedCards = [];
        levelStartCash = INITIAL_CASH;
        currentPrice = 0;

        if (typeof finalReturn !== 'undefined') finalReturn = 0;

        nextBtn.style.display = 'none';
        champagneBtn.style.display = 'none';
        saveBtn.style.display = 'none';
        restartBtn.style.display = 'none';
        document.getElementById('custom-result-actions').style.display = 'none';
        champagneExportArea.innerHTML = '';

        resetDisplay();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        startBtn.focus();
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