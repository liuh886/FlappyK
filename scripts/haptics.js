(() => {
    'use strict';

    // Progressive-enhancement haptics. Devices without a vibration API stay
    // silent; nothing here can block gameplay.
    const vibrate = navigator.vibrate?.bind(navigator);
    if (typeof vibrate !== 'function') return;

    const controller = window.FlappyKGameController;

    let muted = window.FlappyKGame?.isSoundMuted?.() || false;
    document.addEventListener('flappyk:sound-changed', (event) => {
        muted = Boolean(event.detail?.muted);
    });

    const patterns = {
        buy: 12,
        sell: 12,
        win: [30, 50, 30],
        fail: [60],
    };

    controller?.on('trade', ({ type }) => {
        if (!muted) vibrate(patterns[type] || 10);
    });

    controller?.on('level-did-settle', ({ isSuccess }) => {
        if (!muted) vibrate(isSuccess ? patterns.win : patterns.fail);
    });
})();
