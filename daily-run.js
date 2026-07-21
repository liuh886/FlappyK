(() => {
    'use strict';

    const STORAGE_KEY = 'flappyk_daily_record_v1';
    const DATASET_VERSION = 'snapshot-2026-07-18';
    const SITE_URL = 'https://liuh886.github.io/FlappyK/';
    const DEFAULT_TITLE = 'FlappyK — Can You Beat a Hidden Market?';
    const core = window.FlappyKDailyRunCore;
    const codec = window.FlappyKChallengeCodec;
    const scoreApi = window.FlappyKLegendScore;
    const dailyButton = document.getElementById('daily-run-btn');
    const dailySummary = document.getElementById('daily-run-summary');
    const dailyResult = document.getElementById('daily-run-result');
    const startButton = document.getElementById('start-btn');
    const startScreenElement = document.getElementById('start-screen');
    const legendButton = document.getElementById('champagne-btn');
    const playAgainButton = document.getElementById('champagne-restart-btn');
    const customStartButton = document.getElementById('custom-start-btn');
    const dateKey = core?.utcDateKey(new Date());

    const state = {
        active: false,
        descriptors: [],
        record: loadRecord(),
        lastRecordedSignature: '',
    };

    function formatPercent(value) {
        return scoreApi?.formatPercent(value)
            || `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`;
    }

    function hasFriendChallengeToken() {
        const query = new URLSearchParams(window.location.search);
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        return query.has('challenge') || hash.has('challenge');
    }

    function loadRecord() {
        if (!core) return null;
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            return core.normalizeDailyRecord(raw ? JSON.parse(raw) : null);
        } catch (error) {
            console.warn('Daily Run record could not be loaded.', error);
            return core.emptyDailyRecord();
        }
    }

    function saveRecord(record) {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
        } catch (error) {
            console.warn('Daily Run record could not be saved.', error);
        }
    }

    function createDescriptors() {
        try {
            return core.generateDailyDescriptors(stockData, dateKey, DAYS_PER_LEVEL);
        } catch (error) {
            console.warn('Daily Run is unavailable.', error);
            return [];
        }
    }

    state.descriptors = createDescriptors();

    function resolveDescriptor(descriptor) {
        const rows = stockData?.[descriptor?.m]?.[descriptor?.a];
        if (!Array.isArray(rows)) return null;
        const startIndex = rows.findIndex((row) => row?.date === descriptor.s);
        if (startIndex < 0 || startIndex + DAYS_PER_LEVEL > rows.length) return null;
        return {
            market: descriptor.m,
            asset: descriptor.a,
            data: rows.slice(startIndex, startIndex + DAYS_PER_LEVEL),
        };
    }

    function renderDailySummary() {
        if (!dailySummary || !dailyButton) return;
        const hiddenForFriendChallenge = hasFriendChallengeToken();
        dailySummary.hidden = hiddenForFriendChallenge;
        dailyButton.hidden = hiddenForFriendChallenge;
        if (hiddenForFriendChallenge) return;

        const todayBest = state.record?.bestByDate?.[dateKey];
        const bestText = Number.isFinite(Number(todayBest))
            ? `TODAY ${formatPercent(todayBest)}`
            : 'SAME MARKETS FOR EVERYONE';
        const streak = Math.max(0, Number(state.record?.streak) || 0);

        dailySummary.replaceChildren();
        const title = document.createElement('strong');
        title.textContent = `DAILY RUN · ${dateKey}`;
        const detail = document.createElement('span');
        detail.textContent = bestText;
        const streakNode = document.createElement('small');
        streakNode.textContent = `DAILY STREAK ${streak}`;
        dailySummary.append(title, detail, streakNode);

        dailyButton.disabled = state.descriptors.length !== 3;
        dailyButton.textContent = state.descriptors.length === 3
            ? Number.isFinite(Number(todayBest)) ? 'REPLAY DAILY' : 'DAILY RUN'
            : 'DAILY UNAVAILABLE';
    }

    function hideDailyResult() {
        if (!dailyResult) return;
        dailyResult.hidden = true;
        dailyResult.replaceChildren();
        dailyResult.className = 'daily-run-result';
    }

    function resetDailyMode() {
        state.active = false;
        state.lastRecordedSignature = '';
        hideDailyResult();
    }

    function exitDailyMode() {
        resetDailyMode();
        document.title = DEFAULT_TITLE;
    }

    function startDailyRun() {
        if (state.descriptors.length !== 3) {
            window.alert('Today’s Daily Run is unavailable for the current market snapshot.');
            return;
        }

        state.active = true;
        state.lastRecordedSignature = '';
        hideDailyResult();
        level = 1;
        targetReturn = 0;
        collectedCards = [];
        startScreenElement?.classList.remove('active');
        document.title = `Daily Run ${dateKey} · FlappyK`;
        initAudio();
        startLevel();
    }

    const previousPickRandomData = pickRandomData;
    pickRandomData = function dailyRunPickRandomData() {
        if (state.active) {
            const descriptor = state.descriptors[level - 1];
            const resolved = descriptor && resolveDescriptor(descriptor);
            if (resolved) {
                currentMarket = resolved.market;
                currentAsset = resolved.asset;
                return resolved.data;
            }

            exitDailyMode();
            window.alert('Today’s Daily Run could not be restored. A random run will start instead.');
        }
        return previousPickRandomData();
    };

    const previousStartLevel = startLevel;
    startLevel = function dailyRunAwareStartLevel() {
        previousStartLevel();
        if (state.active && targetDisp) targetDisp.textContent = 'DAILY · BEAT THE MARKET';
    };

    function buildDailyChallengeUrl(score) {
        if (!state.active || state.descriptors.length !== 3 || !codec) return null;
        const payload = {
            v: codec.CHALLENGE_VERSION,
            d: DATASET_VERSION,
            g: state.descriptors.map((game) => ({ m: game.m, a: game.a, s: game.s })),
            t: Number(Number(score?.excess).toFixed(6)),
        };
        if (!codec.validateChallengeShape(payload)) return null;
        const url = new URL(SITE_URL);
        url.searchParams.set('challenge', codec.encodeChallenge(payload));
        return url.toString();
    }

    if (window.FlappyKFriendChallenge?.buildChallengeUrl) {
        const originalBuildChallengeUrl = window.FlappyKFriendChallenge.buildChallengeUrl;
        window.FlappyKFriendChallenge.buildChallengeUrl = (score) =>
            buildDailyChallengeUrl(score) || originalBuildChallengeUrl(score);
    }

    function renderDailyResult(result) {
        if (!dailyResult) return;
        dailyResult.hidden = false;
        dailyResult.className = `daily-run-result${result.isNewDailyBest ? ' daily-run-result--new' : ''}`;
        dailyResult.replaceChildren();

        const title = document.createElement('strong');
        title.textContent = result.isNewDailyBest ? 'NEW DAILY BEST' : 'DAILY RUN COMPLETE';
        const score = document.createElement('span');
        score.textContent = `${formatPercent(result.runExcess)} EXCESS`;
        const detail = document.createElement('small');
        if (result.improvement !== null) {
            detail.textContent = `IMPROVED BY ${formatPercent(result.improvement)} · STREAK ${result.record.streak}`;
        } else {
            detail.textContent = `UTC ${dateKey} · STREAK ${result.record.streak}`;
        }
        dailyResult.append(title, score, detail);
    }

    function recordDailyCompletion() {
        if (!state.active) return;
        const score = scoreApi?.calculate(collectedCards, finalReturn);
        if (!score) return;
        const signature = `${dateKey}|${score.excess.toFixed(6)}|${finalReturn.toFixed(8)}`;
        if (signature === state.lastRecordedSignature) return;
        state.lastRecordedSignature = signature;

        try {
            const result = core.updateDailyRecord(state.record, dateKey, score.excess);
            state.record = result.record;
            saveRecord(state.record);
            renderDailySummary();
            renderDailyResult(result);
        } catch (error) {
            console.warn('Daily Run completion could not be recorded.', error);
        }
    }

    dailyButton?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        startDailyRun();
    }, { capture: true });
    startButton?.addEventListener('click', resetDailyMode, { capture: true });
    customStartButton?.addEventListener('click', resetDailyMode, { capture: true });
    playAgainButton?.addEventListener('click', exitDailyMode, { capture: true });
    legendButton?.addEventListener('click', recordDailyCompletion);

    window.addEventListener('popstate', renderDailySummary);
    window.addEventListener('hashchange', renderDailySummary);

    renderDailySummary();

    window.FlappyKDailyRun = {
        isActive: () => state.active,
        getDate: () => dateKey,
        getDescriptors: () => state.descriptors.map((descriptor) => ({ ...descriptor })),
        getRecord: () => core.normalizeDailyRecord(state.record),
    };
})();
