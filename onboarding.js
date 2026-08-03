(() => {
    'use strict';

    const STORAGE_KEY = 'flappyk_onboarding_seen_v1';
    const launchButtons = [
        document.getElementById('start-btn'),
        document.getElementById('daily-run-btn'),
    ].filter(Boolean);

    let pending = false;
    let seenInSession = false;

    function hasSeen() {
        if (seenInSession) return true;
        try {
            return window.localStorage.getItem(STORAGE_KEY) === '1';
        } catch {
            return false;
        }
    }

    function markSeen() {
        seenInSession = true;
        pending = false;
        try {
            window.localStorage.setItem(STORAGE_KEY, '1');
        } catch (error) {
            console.warn('Onboarding preference could not be saved.', error);
        }
    }

    function queueGuide() {
        if (!hasSeen()) pending = true;
    }

    function consumePending() {
        if (!pending || hasSeen()) return false;
        pending = false;
        return true;
    }

    launchButtons.forEach((button) => {
        button.addEventListener('click', queueGuide, { capture: true });
    });

    window.FlappyKOnboarding = {
        STORAGE_KEY,
        hasSeen,
        markSeen,
        consumePending,
        reset() {
            pending = false;
            seenInSession = false;
            try {
                window.localStorage.removeItem(STORAGE_KEY);
            } catch (error) {
                console.warn('Onboarding preference could not be reset.', error);
            }
        },
    };
})();
