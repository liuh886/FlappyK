(() => {
    'use strict';

    function closeActiveModal() {
        const leaderboardScreen = document.getElementById('leaderboard-screen');
        if (leaderboardScreen && leaderboardScreen.classList.contains('active')) {
            const closeBtn = document.getElementById('leaderboard-close-btn');
            if (closeBtn) {
                closeBtn.click();
                return true;
            }
        }

        const customScreen = document.getElementById('custom-challenge-screen');
        if (customScreen && customScreen.classList.contains('active')) {
            const cancelBtn = document.getElementById('custom-cancel-btn');
            if (cancelBtn) {
                cancelBtn.click();
                return true;
            }
        }

        const onboardingScreen = document.getElementById('onboarding-screen');
        if (onboardingScreen && !onboardingScreen.hidden) {
            const startBtn = document.getElementById('onboarding-start-btn');
            if (startBtn) {
                startBtn.click();
                return true;
            }
        }

        return false;
    }

    function returnToHome() {
        if (closeActiveModal()) return;

        if (typeof isPlaying !== 'undefined' && isPlaying) {
            if (window.FlappyKPacing && typeof window.FlappyKPacing.returnHome === 'function') {
                window.FlappyKPacing.returnHome();
                return;
            }
        }

        if (typeof gameInterval !== 'undefined') clearInterval(gameInterval);
        if (typeof isPlaying !== 'undefined') isPlaying = false;
        if (typeof stopAudio === 'function') stopAudio();

        if (window.FlappyKGame && typeof window.FlappyKGame.resetGame === 'function') {
            window.FlappyKGame.resetGame();
            return;
        }

        // Fallback reloading if engine is uninitialized
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
