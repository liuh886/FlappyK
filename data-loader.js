const stockData = { crypto: {}, ashare: {}, usstock: {} };

(() => {
    'use strict';

    const MARKETS = Object.freeze(['crypto', 'ashare', 'usstock']);
    const pending = new Map();
    const loaded = new Set();

    function marketForLevel(level) {
        if (Number(level) === 1) return 'crypto';
        if (Number(level) === 2) return 'ashare';
        return 'usstock';
    }

    async function loadMarket(market) {
        if (!MARKETS.includes(market)) throw new Error(`Unknown market: ${market}`);
        if (loaded.has(market)) return stockData[market];
        if (pending.has(market)) return pending.get(market);

        const request = fetch(`./data/markets/${market}.json`, { cache: 'force-cache' })
            .then(async (response) => {
                if (!response.ok) throw new Error(`${market} data request failed with ${response.status}`);
                const payload = await response.json();
                if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
                    throw new Error(`${market} data payload is invalid`);
                }
                Object.assign(stockData[market], payload);
                loaded.add(market);
                document.dispatchEvent(new CustomEvent('flappyk:data-updated', {
                    detail: { market, assets: Object.keys(payload).length },
                }));
                return stockData[market];
            })
            .finally(() => pending.delete(market));

        pending.set(market, request);
        return request;
    }

    function loadMarkets(markets) {
        return Promise.all([...new Set(markets)].map(loadMarket));
    }

    window.FlappyKData = Object.freeze({
        markets: () => [...MARKETS],
        marketForLevel,
        isLoaded: (market) => loaded.has(market),
        loadMarket,
        loadMarkets,
    });
})();
