(() => {
    'use strict';

    const legendButton = document.getElementById('champagne-btn');
    if (!legendButton) return;

    function getGameMode() {
        if (document.getElementById('level-display')?.textContent?.trim() === 'CUSTOM') {
            return 'custom';
        }
        if (window.FlappyKDailyRun?.isActive?.()) return 'daily';
        if (window.FlappyKFriendChallenge?.isActive?.()) return 'friend';
        return 'normal';
    }

    legendButton.addEventListener('click', () => {
        window.requestAnimationFrame(() => {
            const membership = window.FlappyKMembership;
            if (!membership?.isConfigured?.()) return;

            const score = window.FlappyKLegendScore?.calculate?.(collectedCards, finalReturn);
            const signature = window.FlappyKPlayerProfile?.buildRunSignature?.(
                collectedCards,
                finalReturn
            );
            if (!score || !signature) return;

            membership.queueCompletedRun?.({
                signature,
                score,
                mode: getGameMode(),
            });
        });
    });
})();
