(() => {
    'use strict';

    // Trade bursts: the canvas renderer owns all pixel output; this module only
    // translates lifecycle hooks into burst requests.
    const controller = window.FlappyKGameController;

    controller?.on('trade', ({ type }) => {
        window.FlappyKMarketCanvas?.requestBurst?.(type === 'sell' ? 'sell' : 'buy');
    });

    // Weather stage changes get a short chirp; the attribute is the single source.
    const weatherObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            const next = mutation.target?.getAttribute?.('data-weather');
            if (next && mutation.oldValue !== next) {
                window.FlappyKGameController?.playSfx?.('weather');
                return;
            }
        }
    });
    document.querySelectorAll('[data-weather]').forEach((layer) => {
        weatherObserver.observe(layer, { attributes: true, attributeFilter: ['data-weather'], attributeOldValue: true });
    });
})();
