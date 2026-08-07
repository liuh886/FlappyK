(() => {
    'use strict';

    const STATE_KEY = 'indicator_cards';
    const VERSION = 1;
    const STARTER_COUNT = 3;
    const DAILY_DRAW_LIMIT = 3;
    const TYPES = Object.freeze(['boll', 'macd']);
    const EMPTY = Object.freeze({
        version: VERSION,
        boll: 0,
        macd: 0,
        starterGranted: false,
        drawDate: '',
        drawsUsed: 0,
    });

    let accountState = null;
    let cards = { ...EMPTY };
    let saveQueue = Promise.resolve();

    function integer(value, minimum = 0, maximum = 999) {
        const number = Math.floor(Number(value));
        return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : minimum;
    }

    function normalize(value) {
        const source = value && typeof value === 'object' ? value : EMPTY;
        return {
            version: VERSION,
            boll: integer(source.boll),
            macd: integer(source.macd),
            starterGranted: source.starterGranted === true,
            drawDate: /^\d{4}-\d{2}-\d{2}$/.test(String(source.drawDate || '')) ? String(source.drawDate) : '',
            drawsUsed: integer(source.drawsUsed, 0, DAILY_DRAW_LIMIT),
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

    function drawsRemaining(date = new Date()) {
        if (!isPro()) return 0;
        return cards.drawDate === localDateKey(date)
            ? Math.max(0, DAILY_DRAW_LIMIT - cards.drawsUsed)
            : DAILY_DRAW_LIMIT;
    }

    function snapshot() {
        return Object.freeze({
            accountId: signedIn() ? String(accountState.user.id) : null,
            signedIn: signedIn(),
            isPro: isPro(),
            boll: cards.boll,
            macd: cards.macd,
            starterGranted: cards.starterGranted,
            dailyDrawsRemaining: drawsRemaining(),
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
        const productState = {
            ...(accountState.productAccount?.state || {}),
            [STATE_KEY]: payload,
        };
        saveQueue = saveQueue
            .catch(() => undefined)
            .then(async () => {
                if (!accountState?.user || String(accountState.user.id) !== accountId) return;
                await window.HaoAccount.saveProductData({ productState });
            })
            .catch((error) => {
                console.warn('FlappyK indicator card inventory could not be saved.', error);
                emit('save-error');
            });
        return saveQueue;
    }

    function grantStarterPack() {
        if (!signedIn() || cards.starterGranted) return false;
        cards = {
            ...cards,
            boll: cards.boll + STARTER_COUNT,
            macd: cards.macd + STARTER_COUNT,
            starterGranted: true,
        };
        emit('starter-granted', { awarded: { boll: STARTER_COUNT, macd: STARTER_COUNT } });
        void save();
        return true;
    }

    function setAccountState(nextState) {
        const previousId = accountState?.user?.id ? String(accountState.user.id) : null;
        const nextId = nextState?.user?.id ? String(nextState.user.id) : null;
        accountState = nextState || null;
        if (!nextId) {
            cards = { ...EMPTY };
            emit(previousId ? 'signed-out' : 'guest');
            return;
        }
        cards = remoteState();
        emit(previousId === nextId ? 'account-refreshed' : 'signed-in');
        grantStarterPack();
    }

    function consume(type) {
        if (!TYPES.includes(type) || !signedIn() || cards[type] < 1) return false;
        cards = { ...cards, [type]: cards[type] - 1 };
        emit('consumed', { type });
        void save();
        return true;
    }

    function randomType(randomValue) {
        const value = Number.isFinite(randomValue) ? randomValue : Math.random();
        return TYPES[Math.max(0, Math.min(TYPES.length - 1, Math.floor(value * TYPES.length)))];
    }

    function draw(randomValue) {
        const remaining = drawsRemaining();
        if (remaining < 1) return null;
        const today = localDateKey();
        const type = randomType(randomValue);
        const used = cards.drawDate === today ? cards.drawsUsed : 0;
        cards = {
            ...cards,
            [type]: cards[type] + 1,
            drawDate: today,
            drawsUsed: used + 1,
        };
        emit('drawn', { type });
        void save();
        return type;
    }

    window.addEventListener('hao:account-changed', (event) => setAccountState(event.detail));

    const current = window.HaoAccount?.getState?.();
    if (current) setAccountState(current);
    else emit('initial');

    window.FlappyKIndicatorCardStore = Object.freeze({
        TYPES,
        STARTER_COUNT,
        DAILY_DRAW_LIMIT,
        STATE_KEY,
        normalize,
        localDateKey,
        getSnapshot: snapshot,
        setAccountState,
        grantStarterPack,
        consume,
        draw,
    });
})();
