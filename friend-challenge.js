(() => {
    'use strict';

    const SITE_URL = 'https://liuh886.github.io/FlappyK/';
    const DATASET_VERSION = 'snapshot-2026-07-18';
    const codec = window.FlappyKChallengeCodec;

    if (!codec) {
        console.warn('FlappyK friend challenge codec is unavailable.');
        return;
    }

    const startScreen = document.getElementById('start-screen');
    const startButton = document.getElementById('start-btn');
    const restartButton = document.getElementById('restart-btn');
    const legendRestartButton = document.getElementById('champagne-restart-btn');
    const challengeShareButton = document.getElementById('challenge-share-btn');
    const challengeResult = document.getElementById('friend-challenge-result');

    const state = {
        invite: null,
        active: false,
        descriptors: [],
        customLaunchPending: false,
    };

    function formatPercent(value) {
        const number = Number(value);
        return `${number >= 0 ? '+' : ''}${number.toFixed(2)}%`;
    }

    function getChallengeToken() {
        const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        return params.get('challenge');
    }

    function removeChallengeHash() {
        if (!getChallengeToken()) return;
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }

    function resolveDescriptor(descriptor) {
        const data = stockData?.[descriptor.m]?.[descriptor.a];
        if (!Array.isArray(data)) return null;

        const startIndex = data.findIndex((row) => row?.date === descriptor.s);
        if (startIndex < 0 || startIndex + DAYS_PER_LEVEL > data.length) return null;

        return {
            market: descriptor.m,
            asset: descriptor.a,
            startIndex,
            data: data.slice(startIndex, startIndex + DAYS_PER_LEVEL),
        };
    }

    function validateAgainstDataset(payload) {
        return payload.g.every((descriptor) => Boolean(resolveDescriptor(descriptor)));
    }

    function ensureInvitePanel() {
        let panel = document.getElementById('friend-challenge-invite');
        if (panel) return panel;

        panel = document.createElement('div');
        panel.id = 'friend-challenge-invite';
        panel.className = 'friend-challenge-invite';
        startScreen?.querySelector('.start-actions')?.before(panel);
        return panel;
    }

    function applyInviteVisual(payload) {
        const panel = ensureInvitePanel();
        if (!panel) return;

        const legacy = payload.d && payload.d !== DATASET_VERSION;
        panel.innerHTML = [
            '<strong>FRIEND CHALLENGE</strong>',
            `<span>BEAT ${formatPercent(payload.t)} EXCESS</span>`,
            '<small>SAME 3 HIDDEN MARKETS · SAME 250-DAY WINDOWS</small>',
            legacy ? '<small>LEGACY SNAPSHOT · RESTORED BY ASSET + DATE</small>' : '',
        ].join('');
        panel.classList.toggle('friend-challenge-invite--legacy', Boolean(legacy));

        if (startButton) startButton.textContent = 'PLAY CHALLENGE';
        document.title = 'Friend Challenge · FlappyK';
    }

    function clearInviteVisual() {
        document.getElementById('friend-challenge-invite')?.remove();
        if (startButton) startButton.textContent = 'PLAY';
        document.title = 'FlappyK — Can You Beat a Hidden Market?';
    }

    function hideChallengeResult() {
        if (challengeResult) {
            challengeResult.hidden = true;
            challengeResult.textContent = '';
            challengeResult.className = 'friend-challenge-result';
        }
        if (challengeShareButton) challengeShareButton.textContent = 'CHALLENGE A FRIEND';
    }

    function loadInviteFromLocation() {
        const token = getChallengeToken();
        if (!token) {
            state.invite = null;
            clearInviteVisual();
            return;
        }

        const payload = codec.decodeChallenge(token);
        if (!payload || !validateAgainstDataset(payload)) {
            state.invite = null;
            removeChallengeHash();
            clearInviteVisual();
            window.alert('This friend challenge is invalid or no longer matches the bundled market snapshot.');
            return;
        }

        state.invite = payload;
        state.descriptors = payload.g.map((game) => ({ ...game }));
        applyInviteVisual(payload);
    }

    function beginRunFromStart() {
        hideChallengeResult();

        if (state.invite) {
            state.active = true;
            state.descriptors = state.invite.g.map((game) => ({ ...game }));
            return;
        }

        state.active = false;
        state.descriptors = [];
    }

    function beginNewRandomRun() {
        state.active = false;
        state.invite = null;
        state.descriptors = [];
        removeChallengeHash();
        clearInviteVisual();
        hideChallengeResult();
    }

    function captureNormalDescriptor(data) {
        if (level < 1 || level > 3 || !Array.isArray(data) || data.length === 0) return;
        const startDate = data[0]?.date;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(startDate || ''))) return;

        state.descriptors[level - 1] = {
            m: currentMarket,
            a: currentAsset,
            s: startDate,
        };
    }

    document.getElementById('custom-start-btn')?.addEventListener('click', () => {
        state.customLaunchPending = true;
    }, { capture: true });

    document.getElementById('custom-retry-btn')?.addEventListener('click', () => {
        state.customLaunchPending = true;
    }, { capture: true });

    document.getElementById('custom-cancel-btn')?.addEventListener('click', () => {
        state.customLaunchPending = false;
    }, { capture: true });

    document.getElementById('custom-change-btn')?.addEventListener('click', () => {
        state.customLaunchPending = false;
    }, { capture: true });

    startButton?.addEventListener('click', beginRunFromStart, { capture: true });
    legendRestartButton?.addEventListener('click', beginNewRandomRun, { capture: true });
    restartButton?.addEventListener('click', () => {
        hideChallengeResult();
        if (!state.active) state.descriptors = [];
    }, { capture: true });

    const previousPickRandomData = pickRandomData;
    pickRandomData = function friendChallengePickRandomData() {
        if (state.active && state.invite) {
            const descriptor = state.descriptors[level - 1];
            const resolved = descriptor && resolveDescriptor(descriptor);

            if (resolved) {
                currentMarket = resolved.market;
                currentAsset = resolved.asset;
                return resolved.data;
            }

            state.active = false;
            state.invite = null;
            state.descriptors = [];
            removeChallengeHash();
            clearInviteVisual();
            window.alert('This friend challenge could not be restored. A new random run will start instead.');
        }

        const wasCustomLaunch = state.customLaunchPending;
        const data = previousPickRandomData();
        state.customLaunchPending = false;

        if (!wasCustomLaunch) captureNormalDescriptor(data);
        return data;
    };

    function buildChallengeUrl(score) {
        const games = state.descriptors.slice(0, 3);
        if (games.length !== 3 || games.some((game) => !game)) return SITE_URL;

        const payload = {
            v: codec.CHALLENGE_VERSION,
            d: DATASET_VERSION,
            g: games.map((game) => ({ m: game.m, a: game.a, s: game.s })),
            t: Number(Number(score?.excess).toFixed(6)),
        };

        if (!codec.validateChallengeShape(payload)) return SITE_URL;
        return `${SITE_URL}#challenge=${codec.encodeChallenge(payload)}`;
    }

    function renderChallengeResult() {
        if (!challengeResult || !state.active || !state.invite) {
            hideChallengeResult();
            return;
        }

        const score = window.FlappyKShare?.calculateLegendScore();
        if (!score) return;

        const target = Number(state.invite.t);
        const margin = score.excess - target;
        const tied = Math.abs(margin) < 0.005;
        const won = !tied && margin > 0;
        const outcomeClass = tied
            ? 'friend-challenge-result--tied'
            : won
                ? 'friend-challenge-result--won'
                : 'friend-challenge-result--lost';

        challengeResult.hidden = false;
        challengeResult.className = `friend-challenge-result ${outcomeClass}`;
        challengeResult.innerHTML = [
            '<strong>FRIEND CHALLENGE</strong>',
            `<span>YOU ${formatPercent(score.excess)}</span>`,
            `<span>TARGET ${formatPercent(target)}</span>`,
            `<em>${tied ? 'TIE GAME' : won ? `WON BY ${formatPercent(Math.abs(margin))}` : `LOST BY ${formatPercent(Math.abs(margin))}`}</em>`,
        ].join('');

        if (challengeShareButton) challengeShareButton.textContent = 'CHALLENGE BACK';
    }

    if (typeof champagneBtn !== 'undefined' && champagneBtn) {
        champagneBtn.addEventListener('click', () => requestAnimationFrame(renderChallengeResult));
    }

    window.addEventListener('hashchange', () => {
        state.active = false;
        hideChallengeResult();
        loadInviteFromLocation();
    });

    window.FlappyKFriendChallenge = {
        buildChallengeUrl,
        isActive: () => state.active,
        getDescriptors: () => state.descriptors.map((game) => ({ ...game })),
    };

    loadInviteFromLocation();
})();