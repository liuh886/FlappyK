/**
 * FlappyK Market Regime — pure market description.
 * Owner: scripts/decision/market-regime.js
 * Forbidden: must not read player actions / returns / trade count.
 * Input: closes[] or currentData[] (array of numbers or {close} objects)
 * Output: MarketRegime { trend, volatility, maxDrawdown, maxDrawdownDepth, reversalCount, shape }
 */
(function exposeMarketRegime(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.FlappyKMarketRegime = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
    'use strict';

    const VERSION = 1;

    function closesFromInput(input) {
        if (!input) return [];
        if (Array.isArray(input)) {
            // Check if it's currentData with objects
            if (input.length && typeof input[0] === 'object' && input[0] !== null && 'close' in input[0]) {
                return input.map((row) => Number(row.close)).filter((v) => Number.isFinite(v));
            }
            return input.map(Number).filter((v) => Number.isFinite(v));
        }
        if (typeof input === 'object' && Array.isArray(input.closes)) return input.closes.map(Number).filter((v) => Number.isFinite(v));
        return [];
    }

    function computeVolatility(closes) {
        if (closes.length < 2) return 0;
        const logReturns = [];
        for (let i = 1; i < closes.length; i += 1) {
            if (closes[i - 1] > 0 && closes[i] > 0) {
                logReturns.push(Math.log(closes[i] / closes[i - 1]));
            }
        }
        if (logReturns.length === 0) return 0;
        const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
        let variance = 0;
        for (const r of logReturns) variance += (r - mean) * (r - mean);
        variance /= logReturns.length;
        return Math.sqrt(variance);
    }

    function computeMaxDrawdown(closes) {
        if (closes.length === 0) return 0;
        let peak = closes[0];
        let maxDD = 0;
        for (let i = 1; i < closes.length; i += 1) {
            if (closes[i] > peak) peak = closes[i];
            const dd = peak > 0 ? (peak - closes[i]) / peak : 0;
            if (dd > maxDD) maxDD = dd;
        }
        return maxDD;
    }

    function classifyMarket(windowInput) {
        // Strictly forbid player data: throw if windowInput contains actions/tradeCount/excess
        if (windowInput && typeof windowInput === 'object' && !Array.isArray(windowInput)) {
            const forbiddenKeys = ['actions', 'tradeCount', 'excessReturn', 'playerReturn', 'totalHistory'];
            for (const key of forbiddenKeys) {
                if (key in windowInput) {
                    throw new TypeError(`market-regime must not read player field: ${key}`);
                }
            }
        }

        const closes = closesFromInput(windowInput);
        if (closes.length < 2) throw new TypeError('classifyMarket requires at least 2 closes');

        const start = closes[0];
        const end = closes[closes.length - 1];
        const marketReturn = start > 0 ? (end - start) / start : 0;

        let trend;
        if (marketReturn > 0.15) trend = 'bull';
        else if (marketReturn < -0.15) trend = 'bear';
        else trend = 'chop';

        const vol = computeVolatility(closes);
        let volatility;
        if (vol < 0.015) volatility = 'low';
        else if (vol < 0.03) volatility = 'mid';
        else volatility = 'high';

        const maxDrawdown = computeMaxDrawdown(closes);

        // Reversal count via 20-day SMA slope sign changes
        let reversalCount = 0;
        const smaPeriod = 20;
        const sma = [];
        for (let i = 0; i < closes.length; i += 1) {
            if (i < smaPeriod - 1) {
                sma.push(null);
            } else {
                let sum = 0;
                for (let k = i - smaPeriod + 1; k <= i; k += 1) sum += closes[k];
                sma.push(sum / smaPeriod);
            }
        }
        let prevSlope = null;
        for (let i = smaPeriod; i < sma.length; i += 1) {
            if (sma[i] === null || sma[i - 1] === null) continue;
            const slope = sma[i] - sma[i - 1];
            const sign = slope > 0 ? 1 : slope < 0 ? -1 : 0;
            if (sign === 0) continue;
            if (prevSlope !== null && sign !== prevSlope) reversalCount += 1;
            prevSlope = sign;
        }

        // Shape heuristics
        let shape = 'trend';
        const maxDD = maxDrawdown;
        // Find max and min positions
        let maxIdx = 0;
        let minIdx = 0;
        for (let i = 1; i < closes.length; i += 1) {
            if (closes[i] > closes[maxIdx]) maxIdx = i;
            if (closes[i] < closes[minIdx]) minIdx = i;
        }
        // boom-bust: strong early run then large DD, peak early
        if (trend === 'bull' && maxDD > 0.2 && maxIdx < closes.length * 0.6) shape = 'boom-bust';
        else if (trend === 'bear' && maxDD > 0.25) {
            // v-shape: trough in middle and recovery
            if (minIdx > closes.length * 0.25 && minIdx < closes.length * 0.75 && end > closes[minIdx] * 1.15) shape = 'v-shape';
            else shape = 'trend';
        } else if (trend === 'chop' && reversalCount >= 4) shape = 'range';
        else if (reversalCount >= 5) shape = 'range';

        return Object.freeze({
            version: VERSION,
            trend,
            volatility,
            maxDrawdown: maxDD,
            maxDrawdownDepth: maxDD,
            reversalCount,
            shape,
        });
    }

    return {
        VERSION,
        classifyMarket,
        _private: {
            computeVolatility,
            computeMaxDrawdown,
        },
    };
});
