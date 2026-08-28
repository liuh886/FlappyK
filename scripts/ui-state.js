(() => {
    'use strict';

    const STATES = Object.freeze({
        HOME: 'home',
        ONBOARDING: 'onboarding',
        PLAYING: 'playing',
        PAUSED: 'paused',
        SETTLEMENT: 'settlement',
        RUN_COMPLETE: 'run-complete',
    });

    const root = document.documentElement;
    const container = document.getElementById('game-container');
    const uiLayer = document.getElementById('ui-layer');
    const compactWidth = 720;
    const gameChromeStates = new Set([STATES.ONBOARDING, STATES.PLAYING, STATES.PAUSED]);
    let state = STATES.HOME;
    let layout = 'wide';
    let input = 'pointer';
    let virtualControls = false;

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
        const nextVirtualControls = coarse || width < compactWidth;
        const changed = nextLayout !== layout
            || nextInput !== input
            || nextVirtualControls !== virtualControls;
        layout = nextLayout;
        input = nextInput;
        virtualControls = nextVirtualControls;
        if (root.dataset.layout !== layout) root.dataset.layout = layout;
        if (root.dataset.input !== input) root.dataset.input = input;
        if (root.dataset.virtualControls !== String(virtualControls)) {
            root.dataset.virtualControls = String(virtualControls);
        }
        if (changed) emit('flappyk:layout-state', {
            layout,
            input,
            virtualControls,
            width,
            height,
        });
    }

    const controller = window.FlappyKGameController;
    controller?.on('level-did-start', () => transition(STATES.PLAYING, { source: 'controller' }));
    controller?.on('level-will-settle', () => transition(STATES.SETTLEMENT, { source: 'controller' }));

    window.addEventListener('flappyk:game-reset', () => transition(STATES.HOME, { source: 'controller' }));
    document.getElementById('champagne-btn')?.addEventListener('click', () => {
        transition(STATES.RUN_COMPLETE, { source: 'run-complete-action' });
    });

    if (window.ResizeObserver && container) {
        new ResizeObserver(computeLayout).observe(container);
    }
    window.addEventListener('resize', computeLayout);
    window.addEventListener('orientationchange', computeLayout);
    window.visualViewport?.addEventListener('resize', computeLayout);

    computeLayout();
    transition(STATES.HOME, { source: 'init' });

    window.FlappyKUiState = {
        STATES,
        get state() { return state; },
        get layout() { return layout; },
        get input() { return input; },
        get virtualControls() { return virtualControls; },
        transition,
        refreshLayout: computeLayout,
    };
})();