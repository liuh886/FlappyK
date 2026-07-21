(() => {
    'use strict';

    const STORAGE_KEY = 'flappyk_onboarding_seen_v1';
    const overlay = document.getElementById('onboarding-screen');
    const continueButton = document.getElementById('onboarding-start-btn');
    const launchButtons = [
        document.getElementById('start-btn'),
        document.getElementById('daily-run-btn'),
    ].filter(Boolean);

    let pendingButton = null;
    let seenInSession = false;

    function hasSeenOnboarding() {
        if (seenInSession) return true;
        try {
            return window.localStorage.getItem(STORAGE_KEY) === '1';
        } catch (error) {
            return false;
        }
    }

    function markSeen() {
        seenInSession = true;
        try {
            window.localStorage.setItem(STORAGE_KEY, '1');
        } catch (error) {
            console.warn('Onboarding preference could not be saved.', error);
        }
    }

    function showOnboarding(button) {
        pendingButton = button;
        if (!overlay) return;
        overlay.hidden = false;
        overlay.classList.add('active');
        continueButton?.focus();
    }

    function hideOnboarding() {
        if (!overlay) return;
        overlay.classList.remove('active');
        overlay.hidden = true;
    }

    function interceptFirstLaunch(event) {
        if (hasSeenOnboarding()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        showOnboarding(event.currentTarget);
    }

    launchButtons.forEach((button) => {
        button.addEventListener('click', interceptFirstLaunch, { capture: true });
    });

    continueButton?.addEventListener('click', (event) => {
        event.preventDefault();
        const button = pendingButton;
        pendingButton = null;
        markSeen();
        hideOnboarding();
        button?.click();
    });

    overlay?.addEventListener('click', (event) => {
        if (event.target !== overlay) return;
        continueButton?.focus();
    });

    window.FlappyKOnboarding = {
        hasSeen: hasSeenOnboarding,
        reset: () => {
            seenInSession = false;
            try {
                window.localStorage.removeItem(STORAGE_KEY);
            } catch (error) {
                console.warn('Onboarding preference could not be reset.', error);
            }
        },
    };
})();
