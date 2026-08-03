(() => {
    'use strict';

    const STATES = Object.freeze({
        HOME: 'home',
        ONBOARDING: 'onboarding',
        PLAYING: 'playing',
        PAUSED: 'paused',
        SETTLEMENT: 'settlement',
        RUN_COMPLETE: 'run-complete',
        LEADERBOARD: 'leaderboard',
        ACCOUNT: 'account',
        CUSTOM_SELECT: 'custom-select',
    });

    const root = document.documentElement;
    const container = document.getElementById('game-container');
    const uiLayer = document.getElementById('ui-layer');
    const compactWidth = 720;
    const gameChromeStates = new Set([STATES.ONBOARDING, STATES.PLAYING, STATES.PAUSED]);
    let state = STATES.HOME;
    let layout = 'wide';
    let input = 'pointer';

    function emit(name, detail) {
        window.dispatchEvent(new CustomEvent(name, { detail }));
    }

    function syncGameChrome() {
        if (!uiLayer) return;
        const visible = gameChromeStates.has(state);
        const shouldHide = !visible;
        if (uiLayer.hidden !== shouldHide) uiLayer.hidden = shouldHide;
        const ariaHidden = String(shouldHide);
        if (uiLayer.getAttribute('aria-hidden') !== ariaHidden) {
            uiLayer.setAttribute('aria-hidden', ariaHidden);
        }
    }

    function transition(next, detail = {}) {
        if (!Object.values(STATES).includes(next)) return state;
        const previous = state;
        state = next;
        if (root.dataset.uiState !== state) root.dataset.uiState = state;
        syncGameChrome();
        if (previous !== next) emit('flappyk:ui-state', { previous, state, ...detail });
        return state;
    }

    function computeLayout() {
        const width = container?.clientWidth || window.innerWidth;
        const height = window.visualViewport?.height || window.innerHeight;
        const coarse = window.matchMedia?.('(pointer: coarse)').matches
            || Number(navigator.maxTouchPoints || 0) > 0;
        const nextLayout = width < compactWidth || height < 700 || coarse ? 'compact' : 'wide';
        const nextInput = coarse ? 'touch' : 'pointer';
        const changed = nextLayout !== layout || nextInput !== input;
        layout = nextLayout;
        input = nextInput;
        if (root.dataset.layout !== layout) root.dataset.layout = layout;
        if (root.dataset.input !== input) root.dataset.input = input;
        if (changed) emit('flappyk:layout-state', { layout, input, width, height });
    }

    function isActive(selector) {
        return document.querySelector(selector)?.classList.contains('active') || false;
    }

    function inferFromDom() {
        const accountBackdrop = document.querySelector('.membership-backdrop');
        if (accountBackdrop && !accountBackdrop.hidden) return transition(STATES.ACCOUNT, { source: 'dom' });
        if (document.querySelector('.game-coachmark[data-active="true"]')) {
            return transition(STATES.ONBOARDING, { source: 'dom' });
        }
        if (isActive('#leaderboard-screen')) return transition(STATES.LEADERBOARD, { source: 'dom' });
        if (isActive('#custom-challenge-screen')) return transition(STATES.CUSTOM_SELECT, { source: 'dom' });
        if (isActive('#settlement-screen')) return transition(STATES.SETTLEMENT, { source: 'dom' });
        if (isActive('#champagne-screen')) return transition(STATES.RUN_COMPLETE, { source: 'dom' });

        const pacing = window.FlappyKPacing;
        if (pacing?.paused) return transition(STATES.PAUSED, { source: 'pacing' });
        if (pacing?.active || container?.classList.contains('game-active')) {
            return transition(STATES.PLAYING, { source: 'pacing' });
        }
        return transition(STATES.HOME, { source: 'dom' });
    }

    const observer = new MutationObserver(() => {
        computeLayout();
        inferFromDom();
    });
    observer.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class', 'hidden', 'aria-pressed', 'data-active'],
    });

    if (window.ResizeObserver && container) {
        new ResizeObserver(computeLayout).observe(container);
    }
    window.addEventListener('resize', computeLayout);
    window.addEventListener('orientationchange', computeLayout);
    window.visualViewport?.addEventListener('resize', computeLayout);

    computeLayout();
    inferFromDom();

    window.FlappyKUiState = {
        STATES,
        get state() { return state; },
        get layout() { return layout; },
        get input() { return input; },
        transition,
        sync: inferFromDom,
        refreshLayout: computeLayout,
    };
})();
