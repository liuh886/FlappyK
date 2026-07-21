(function exposePlayerProfile(root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.FlappyKPlayerProfile = api;
    }
})(typeof window !== 'undefined' ? window : globalThis, () => {
    'use strict';

    const STORAGE_KEY = 'flappyk_player_profile_v1';
    const MARKET_KEYS = ['crypto', 'ashare', 'usstock'];

    function emptyProfile() {
        return {
            version: 1,
            bestExcess: null,
            runsCompleted: 0,
            marketsBeaten: 0,
            bestByMarket: {},
        };
    }

    function finiteOrNull(value) {
        if (value === null || value === undefined || value === '') return null;
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }

    function normalizeProfile(value) {
        const source = value && typeof value === 'object' ? value : {};
        const profile = emptyProfile();
        profile.bestExcess = finiteOrNull(source.bestExcess);
        profile.runsCompleted = Math.max(0, Math.floor(Number(source.runsCompleted) || 0));
        profile.marketsBeaten = Math.max(0, Math.floor(Number(source.marketsBeaten) || 0));

        if (source.bestByMarket && typeof source.bestByMarket === 'object') {
            MARKET_KEYS.forEach((market) => {
                const best = finiteOrNull(source.bestByMarket[market]);
                if (best !== null) profile.bestByMarket[market] = best;
            });
        }

        return profile;
    }

    function applyCompletedRun(currentProfile, score) {
        const profile = normalizeProfile(currentProfile);
        if (!score
            || !Number.isFinite(Number(score.excess))
            || !Array.isArray(score.games)
            || score.games.length !== 3) {
            throw new TypeError('A complete three-game score is required');
        }

        const runExcess = Number(score.excess);
        const previousBest = profile.bestExcess;
        const isNewBest = previousBest === null || runExcess > previousBest;

        profile.runsCompleted += 1;
        profile.marketsBeaten += score.games.length;
        if (isNewBest) profile.bestExcess = runExcess;

        score.games.forEach((game, index) => {
            const market = MARKET_KEYS[index];
            const excess = Number(game?.excess);
            if (!market || !Number.isFinite(excess)) return;
            const currentBest = finiteOrNull(profile.bestByMarket[market]);
            if (currentBest === null || excess > currentBest) {
                profile.bestByMarket[market] = excess;
            }
        });

        return {
            profile,
            runExcess,
            previousBest,
            isNewBest,
            improvement: isNewBest && previousBest !== null
                ? runExcess - previousBest
                : null,
        };
    }

    function buildRunSignature(cards, cumulativeReturn) {
        if (!Array.isArray(cards) || cards.length !== 3) return '';
        const cardSignature = cards.map((card) => [
            card?.market,
            card?.asset,
            card?.periodStr,
            card?.excessRetStr,
        ].join(':')).join('|');
        return `${cardSignature}|${Number(cumulativeReturn).toFixed(8)}`;
    }

    return {
        STORAGE_KEY,
        emptyProfile,
        normalizeProfile,
        applyCompletedRun,
        buildRunSignature,
    };
});

(() => {
    'use strict';

    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const api = window.FlappyKPlayerProfile;
    const scoreApi = window.FlappyKLegendScore;
    const homeSummary = document.getElementById('personal-profile-summary');
    const resultBanner = document.getElementById('personal-best-result');
    const legendButton = document.getElementById('champagne-btn');
    const playAgainButton = document.getElementById('champagne-restart-btn');
    let profile = loadProfile();
    let lastRecordedSignature = '';

    function loadProfile() {
        try {
            const raw = window.localStorage.getItem(api.STORAGE_KEY);
            return api.normalizeProfile(raw ? JSON.parse(raw) : null);
        } catch (error) {
            console.warn('Local FlappyK profile could not be loaded.', error);
            return api.emptyProfile();
        }
    }

    function saveProfile(nextProfile) {
        try {
            window.localStorage.setItem(api.STORAGE_KEY, JSON.stringify(nextProfile));
            return true;
        } catch (error) {
            console.warn('Local FlappyK profile could not be saved.', error);
            return false;
        }
    }

    function formatPercent(value) {
        return scoreApi?.formatPercent(value)
            || `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`;
    }

    function renderHomeSummary() {
        if (!homeSummary) return;
        const best = profile.bestExcess === null ? '---%' : formatPercent(profile.bestExcess);
        homeSummary.replaceChildren();

        const bestNode = document.createElement('span');
        bestNode.textContent = 'YOUR BEST ';
        const bestValue = document.createElement('strong');
        bestValue.textContent = best;
        bestNode.appendChild(bestValue);

        const runsNode = document.createElement('span');
        runsNode.textContent = `RUNS ${profile.runsCompleted}`;

        homeSummary.append(bestNode, runsNode);
    }

    function renderResultBanner(result) {
        if (!resultBanner) return;
        resultBanner.replaceChildren();
        resultBanner.hidden = false;
        resultBanner.classList.toggle('local-record-result--new', result.isNewBest);

        const title = document.createElement('strong');
        title.textContent = result.isNewBest ? 'NEW PERSONAL BEST' : 'PERSONAL RECORD';

        const score = document.createElement('span');
        score.textContent = `${formatPercent(result.runExcess)} EXCESS`;

        const detail = document.createElement('small');
        if (result.isNewBest && result.improvement !== null) {
            detail.textContent = `IMPROVED BY ${formatPercent(result.improvement)}`;
        } else if (result.isNewBest) {
            detail.textContent = 'FIRST COMPLETED RUN';
        } else {
            detail.textContent = `BEST ${formatPercent(result.profile.bestExcess)} · RUN ${result.profile.runsCompleted}`;
        }

        resultBanner.append(title, score, detail);
    }

    function resetRunRecording() {
        lastRecordedSignature = '';
        if (!resultBanner) return;
        resultBanner.hidden = true;
        resultBanner.replaceChildren();
        resultBanner.classList.remove('local-record-result--new');
    }

    function recordCompletedRun() {
        const score = scoreApi?.calculate(collectedCards, finalReturn);
        if (!score) return;

        const signature = api.buildRunSignature(collectedCards, finalReturn);
        if (!signature || signature === lastRecordedSignature) return;
        lastRecordedSignature = signature;

        try {
            const result = api.applyCompletedRun(profile, score);
            profile = result.profile;
            saveProfile(profile);
            renderHomeSummary();
            renderResultBanner(result);
        } catch (error) {
            console.warn('Completed run could not be added to the local profile.', error);
        }
    }

    legendButton?.addEventListener('click', recordCompletedRun);
    playAgainButton?.addEventListener('click', resetRunRecording, { capture: true });
    renderHomeSummary();

    window.FlappyKLocalProfile = {
        getProfile: () => api.normalizeProfile(profile),
        refresh: () => {
            profile = loadProfile();
            renderHomeSummary();
            return api.normalizeProfile(profile);
        },
    };
})();
