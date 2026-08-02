(() => {
    'use strict';

    const legendButton = document.getElementById('champagne-btn');
    if (!legendButton) return;

    legendButton.addEventListener('click', () => {
        window.requestAnimationFrame(() => {
            const score = window.FlappyKLegendScore?.calculate?.(collectedCards, finalReturn);
            const signature = window.FlappyKPlayerProfile?.buildRunSignature?.(
                collectedCards,
                finalReturn
            );
            if (!score || !signature) return;

            window.FlappyKMembership?.queueCompletedRun?.({
                signature,
                score,
                mode: window.FlappyKAnalytics?.getGameMode?.() || 'normal',
            });
        });
    });
})();
