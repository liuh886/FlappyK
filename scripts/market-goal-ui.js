(() => {
    'use strict';

    // Single owner of the persistent gameplay goal label. Registration order
    // matters only for Daily Run, which intentionally overrides this afterwards.
    window.FlappyKGameController?.on('level-did-start', () => {
        if (targetDisp) targetDisp.textContent = 'BEAT THE MARKET';
    });
})();
