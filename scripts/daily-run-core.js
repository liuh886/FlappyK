(function exposeDailyRunCore(root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.FlappyKDailyRunCore = api;
    }
})(typeof window !== 'undefined' ? window : globalThis, () => {
    'use strict';

    const MARKETS = ['crypto', 'ashare', 'usstock'];
    const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

    function utcDateKey(value = new Date()) {
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) throw new TypeError('A valid date is required');
        return date.toISOString().slice(0, 10);
    }

    function previousUtcDate(dateKey) {
        if (!DATE_PATTERN.test(String(dateKey || ''))) throw new TypeError('A UTC date key is required');
        const date = new Date(`${dateKey}T00:00:00.000Z`);
        date.setUTCDate(date.getUTCDate() - 1);
        return utcDateKey(date);
    }

    function hashSeed(value) {
        let hash = 2166136261;
        const text = String(value);
        for (let index = 0; index < text.length; index += 1) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }

    function createPrng(seed) {
        let state = Number(seed) >>> 0;
        return () => {
            state += 0x6D2B79F5;
            let value = state;
            value = Math.imul(value ^ (value >>> 15), value | 1);
            value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
            return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
        };
    }

    function generateDailyDescriptors(stockData, dateKey, daysPerGame = 250) {
        if (!DATE_PATTERN.test(String(dateKey || ''))) throw new TypeError('A UTC date key is required');
        if (!Number.isInteger(daysPerGame) || daysPerGame <= 0) {
            throw new RangeError('daysPerGame must be a positive integer');
        }

        return MARKETS.map((market) => {
            const marketData = stockData?.[market] || {};
            const assets = Object.keys(marketData)
                .filter((asset) => Array.isArray(marketData[asset]))
                .filter((asset) => marketData[asset].length >= daysPerGame)
                .sort();

            if (assets.length === 0) {
                throw new Error(`No ${market} asset has ${daysPerGame} usable days`);
            }

            const random = createPrng(hashSeed(`FlappyK:${dateKey}:${market}`));
            const asset = assets[Math.floor(random() * assets.length)];
            const rows = marketData[asset];
            const maxStart = rows.length - daysPerGame;
            const startIndex = Math.floor(random() * (maxStart + 1));
            const startDate = rows[startIndex]?.date;

            if (!DATE_PATTERN.test(String(startDate || ''))) {
                throw new Error(`Daily ${market} window has no valid starting date`);
            }

            return { m: market, a: asset, s: startDate };
        });
    }

    function emptyDailyRecord() {
        return {
            version: 1,
            lastCompletedDate: null,
            streak: 0,
            bestByDate: {},
        };
    }

    function finiteOrNull(value) {
        if (value === null || value === undefined || value === '') return null;
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }

    function normalizeDailyRecord(value) {
        const source = value && typeof value === 'object' ? value : {};
        const record = emptyDailyRecord();
        if (DATE_PATTERN.test(String(source.lastCompletedDate || ''))) {
            record.lastCompletedDate = source.lastCompletedDate;
        }
        record.streak = Math.max(0, Math.floor(Number(source.streak) || 0));

        if (source.bestByDate && typeof source.bestByDate === 'object') {
            Object.entries(source.bestByDate).forEach(([dateKey, score]) => {
                const best = finiteOrNull(score);
                if (DATE_PATTERN.test(dateKey) && best !== null) record.bestByDate[dateKey] = best;
            });
        }
        return record;
    }

    function updateDailyRecord(currentRecord, dateKey, score) {
        if (!DATE_PATTERN.test(String(dateKey || ''))) throw new TypeError('A UTC date key is required');
        const runExcess = Number(score);
        if (!Number.isFinite(runExcess)) throw new TypeError('A finite daily score is required');

        const record = normalizeDailyRecord(currentRecord);
        const previousBest = finiteOrNull(record.bestByDate[dateKey]);
        const isNewDailyBest = previousBest === null || runExcess > previousBest;

        if (record.lastCompletedDate !== dateKey) {
            record.streak = record.lastCompletedDate === previousUtcDate(dateKey)
                ? record.streak + 1
                : 1;
            record.lastCompletedDate = dateKey;
        }

        if (isNewDailyBest) record.bestByDate[dateKey] = runExcess;

        const retainedDates = Object.keys(record.bestByDate).sort().slice(-60);
        record.bestByDate = Object.fromEntries(
            retainedDates.map((retainedDate) => [retainedDate, record.bestByDate[retainedDate]])
        );

        return {
            record,
            runExcess,
            previousBest,
            isNewDailyBest,
            improvement: isNewDailyBest && previousBest !== null
                ? runExcess - previousBest
                : null,
        };
    }

    return {
        MARKETS,
        utcDateKey,
        previousUtcDate,
        hashSeed,
        createPrng,
        generateDailyDescriptors,
        emptyDailyRecord,
        normalizeDailyRecord,
        updateDailyRecord,
    };
});
