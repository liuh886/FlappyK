(() => {
    'use strict';

    const target = new EventTarget();

    const FlappyKEvents = {
        EVENTS: Object.freeze({
            LEVEL_WILL_START: 'flappyk:level-will-start',
            LEVEL_DID_START: 'flappyk:level-did-start',
            TICK: 'flappyk:tick',
            TRADE: 'flappyk:trade',
            LEVEL_WILL_SETTLE: 'flappyk:level-will-settle',
            LEVEL_SETTLED: 'flappyk:level-settled',
            RUN_COMPLETE: 'flappyk:run-complete',
            SPEED_CHANGED: 'flappyk:speed-changed',
            GAME_RESET: 'flappyk:game-reset',
        }),

        on(eventType, callback, options) {
            target.addEventListener(eventType, callback, options);
            return () => target.removeEventListener(eventType, callback, options);
        },

        off(eventType, callback, options) {
            target.removeEventListener(eventType, callback, options);
        },

        emit(eventType, detail = {}) {
            const event = new CustomEvent(eventType, { detail, cancelable: true });
            target.dispatchEvent(event);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(event);
            }
            return event;
        },
    };

    if (typeof window !== 'undefined') {
        window.FlappyKEvents = FlappyKEvents;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = FlappyKEvents;
    }
})();