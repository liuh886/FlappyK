(() => {
    'use strict';

    if (typeof startLevel !== 'function') return;

    const previousStartLevel = startLevel;
    startLevel = function marketGoalAwareStartLevel() {
        previousStartLevel();
        if (targetDisp) targetDisp.textContent = 'BEAT THE MARKET';
    };
})();
