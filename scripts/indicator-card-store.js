(() => {
    'use strict';

    const STATE_KEY = 'indicator_cards';
    const VERSION = 2;
    const DAILY_PRO_GRANT = 3;
    const DAILY_TRIAL_GRANT = 1;
    const TYPES = Object.freeze(['boll', 'macd']);
    const EMPTY = Object.freeze({
        version: VERSION,
        boll: 0,
        macd: 0,
        dailyGrantDate: '',
    });

    let accountState = null;
    let cards = { ...EMPTY };
    let dailyTrial = null;
    let saveQueue = Promise.resolve();

    function integer(value, minimum = 0, maximum = 999) {
        const number = Math.floor(Number(value));
        return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : minimum;
    }

    function normalize(value) {
        if (!value || typeof value !== 'object' || Number(value.version) !== VERSION) return { ...EMPTY };
        return {
            version: VERSION,
            boll: integer(value.boll),
            macd: integer(value.macd),
            dailyGrantDate: /^\d{4}-\d{2}-\d{2}$/.test(String(value.dailyGrantDate || '')) ? String(value.dailyGrantDate) : '',
        };
    }

    function localDateKey(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function signedIn() {
        return Boolean(accountState?.user?.id);
    }

    function isPro() {
        return signedIn() && accountState?.isPro === true;
    }

    function isDailyTrial() {
        return !isPro() && dailyTrial !== null;
    }

    function snapshot() {
        const visibleCards = isDailyTrial() ? dailyTrial : cards;
        return Object.freeze({
            accountId: signedIn() ? String(accountState.user.id) : null,
            signedIn: signedIn(),
            isPro: isPro(),
            isDailyTrial: isDailyTrial(),
            boll: integer(visibleCards?.boll),
            macd: integer(visibleCards?.macd),
            dailyGrantDate: cards.dailyGrantDate,
        });
    }

    function emit(reason, detail = {}) {
        window.dispatchEvent(new CustomEvent('flappyk:indicator-cards', {
            detail: { reason, ...snapshot(), ...detail },
        }));
    }

    function remoteState() {
        return normalize(accountState?.productAccount?.state?.[STATE_KEY]);
    }

    function save() {
        if (!signedIn() || !window.HaoAccount?.saveProductData) return Promise.resolve();
        const accountId = String(accountState.user.id);
        const payload = normalize(cards);
        saveQueue = saveQueue
            .catch(() => undefined)
            .then(async () => {
                if (!accountState?.user || String(accountState.user.id) !== accountId) return;
                const liveState = window.HaoAccount.getState?.() || accountState;
                const productState = {
                    ...(liveState?.productAccount?.state || {}),
                    [STATE_KEY]: payload,
                };
                await window.HaoAccount.saveProductData({ productState });
            })
            .catch((error) => {
                console.warn('FlappyK indicator card inventory could not be saved.', error);
                emit('save-error');
            });
        return saveQueue;
    }

    function grantDailyProCards(date = new Date()) {
        if (!isPro()) return false;
        const today = localDateKey(date);
        if (cards.dailyGrantDate === today) return false;
        cards = {
            ...cards,
            boll: integer(cards.boll + DAILY_PRO_GRANT),
            macd: integer(cards.macd + DAILY_PRO_GRANT),
            dailyGrantDate: today,
        };
        emit('pro-daily-granted', { awarded: { boll: DAILY_PRO_GRANT, macd: DAILY_PRO_GRANT } });
        void save();
        return true;
    }

    function setAccountState(nextState) {
        const previousId = accountState?.user?.id ? String(accountState.user.id) : null;
        const nextId = nextState?.user?.id ? String(nextState.user.id) : null;
        accountState = nextState || null;
        dailyTrial = null;
        if (!nextId) {
            cards = { ...EMPTY };
            emit(previousId ? 'signed-out' : 'guest');
            return;
        }
        cards = remoteState();
        emit(previousId === nextId ? 'account-refreshed' : 'signed-in');
        grantDailyProCards();
    }

    function startDailyTrial() {
        if (isPro()) {
            dailyTrial = null;
            emit('daily-run-pro');
            return;
        }
        dailyTrial = { boll: DAILY_TRIAL_GRANT, macd: DAILY_TRIAL_GRANT };
        emit('daily-trial-started', { awarded: { boll: DAILY_TRIAL_GRANT, macd: DAILY_TRIAL_GRANT } });
    }

    function endDailyTrial() {
        if (dailyTrial === null) return;
        dailyTrial = null;
        emit('daily-trial-ended');
    }

    function consume(type) {
        if (!TYPES.includes(type)) return false;
        if (isPro()) {
            if (cards[type] < 1) return false;
            cards = { ...cards, [type]: cards[type] - 1 };
            emit('consumed', { type });
            void save();
            return true;
        }
        if (!isDailyTrial() || dailyTrial[type] < 1) return false;
        dailyTrial = { ...dailyTrial, [type]: dailyTrial[type] - 1 };
        emit('trial-consumed', { type });
        return true;
    }

    window.addEventListener('hao:account-changed', (event) => setAccountState(event.detail));
    window.addEventListener('flappyk:daily-run-started', startDailyTrial);
    window.addEventListener('flappyk:daily-run-ended', endDailyTrial);

    const current = window.HaoAccount?.getState?.();
    if (current) setAccountState(current);
    else emit('initial');

    window.FlappyKIndicatorCardStore = Object.freeze({
        TYPES,
        DAILY_PRO_GRANT,
        DAILY_TRIAL_GRANT,
        STATE_KEY,
        normalize,
        localDateKey,
        getSnapshot: snapshot,
        setAccountState,
        grantDailyProCards,
        startDailyTrial,
        endDailyTrial,
        consume,
    });
})();
