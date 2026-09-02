'use strict';
const assert = require('node:assert/strict');
const storage = require('../scripts/decision/decision-storage.js');
const mastery = require('../scripts/decision/mastery-system.js');
const metrics = require('../scripts/decision/decision-metrics.js');

function makeData(prices) {
    return prices.map((close) => ({ date: '2020-01-01', open: close, high: close, low: close, close }));
}

// Mock localStorage
global.window = global;
global.localStorage = (() => {
    let store = {};
    return {
        getItem(k) { return store[k] ?? null; },
        setItem(k, v) { store[k] = String(v); },
        removeItem(k) { delete store[k]; },
        clear() { store = {}; },
        _store() { return store; },
    };
})();
// Re-require after mock? Our storage module already captured window at load time via safeGetStorage.
// It checks window.localStorage dynamically each call, so mock works.

// Storage: save and load capping
{
    global.localStorage.clear();
    for (let i = 0; i < 55; i++) {
        const report = {
            version: 1,
            level: 1,
            market: 'crypto',
            asset: 'BTC',
            periodStart: '2020-01-01',
            periodEnd: '2020-12-31',
            days: 250,
            startCash: 10000,
            finalCash: 10000 + i,
            startPrice: 100,
            finalPrice: 100,
            playerReturn: i / 10000,
            marketReturn: 0,
            excessReturn: i / 10000,
            isSuccess: i > 0,
            tradeCount: 0,
            buyCount: 0,
            sellCount: 0,
            feeDrag: 0,
            turnover: 0,
            maxDrawdown: 0,
            maxDrawdownDay: null,
            marketExposure: 0,
            cashExposure: 1,
            longestHoldDays: 0,
            avgEntryPrice: null,
            avgExitPrice: null,
            firstBuyDay: null,
            lastSellDay: null,
            timeInCashAfterLastSell: 0,
            returnAfterFirstSell: null,
            returnAfterLastSell: null,
            maxFavorableAfterLastSell: null,
            maxAdverseAfterLastBuy: null,
            missedUpside: null,
            avoidedDownside: null,
            bestPossibleTrade: 0,
            buyAndHoldReturn: 0,
            closes: new Array(250).fill(100),
            equityCurve: new Array(250).fill(10000),
            actions: [],
        };
        storage.saveReport(report);
    }
    const loaded = storage.loadReports();
    assert.equal(loaded.length, 50, 'capped at 50');
    assert.equal(loaded[0].finalCash, 10005, 'oldest dropped, should be 10005');
    assert.equal(loaded[49].finalCash, 10054);
}

// Storage: invalid version filtered
{
    global.localStorage.clear();
    global.localStorage.setItem(storage.STORAGE_KEYS.REPORTS, JSON.stringify([{ version: 999, foo: 1 }, { version: 1, level: 1, market: 'crypto', asset: 'BTC', finalCash: 10000 }]));
    const loaded = storage.loadReports();
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].version, 1);
}

// Storage: corrupt JSON returns []
{
    global.localStorage.setItem(storage.STORAGE_KEYS.REPORTS, 'not json');
    const loaded = storage.loadReports();
    assert.deepEqual(loaded, []);
}

// Mastery: empty and progression
{
    const empty = mastery.emptyMastery();
    assert.equal(empty.version, 1);
    assert.equal(empty.runsObserved, 0);
    for (const id of Object.keys(mastery.ACHIEVEMENTS)) {
        assert.equal(empty.achievements[id].progress, 0);
        assert.equal(empty.achievements[id].unlockedAt, null);
    }
}

// Mastery: DIAMOND_HANDS progresses
{
    let state = mastery.emptyMastery();
    const data = makeData(new Array(250).fill(100));
    const report = metrics.analyzeRun({
        currentData: data,
        actions: [{ type: 'buy', day: 0, price: 100 }],
        totalHistory: new Array(250).fill(10000),
        levelStartCash: 10000,
        finalCash: 10500,
        level: 1,
        currentMarket: 'crypto',
        currentAsset: 'BTC',
    });
    assert.ok(report.longestHoldDays >= 100);
    for (let i = 0; i < 5; i++) {
        state = mastery.reduceMastery(state, report);
    }
    assert.equal(state.achievements.DIAMOND_HANDS.progress, 5);
    assert.ok(state.achievements.DIAMOND_HANDS.unlockedAt);
    assert.equal(state.runsObserved, 5);
}

// Mastery: CRASH_SURVIVOR
{
    let state = mastery.emptyMastery();
    const prices = [];
    for (let i = 0; i < 250; i++) prices.push(200 - i * 0.6); // strong bear
    const data = makeData(prices);
    const report = metrics.analyzeRun({
        currentData: data,
        actions: [],
        totalHistory: new Array(250).fill(10000),
        levelStartCash: 10000,
        finalCash: 11000, // wins despite bear
        level: 1,
        currentMarket: 'crypto',
        currentAsset: 'BTC',
    });
    assert.ok(report.marketReturn < -0.25);
    assert.ok(report.excessReturn > 0.2);
    for (let i = 0; i < 3; i++) state = mastery.reduceMastery(state, report);
    assert.equal(state.achievements.CRASH_SURVIVOR.progress, 3);
    assert.ok(state.achievements.CRASH_SURVIVOR.unlockedAt);
}

// Mastery: OVERTRADER_NEG consecutive
{
    let state = mastery.emptyMastery();
    const data = makeData(new Array(250).fill(100));
    const overtraderReport = metrics.analyzeRun({
        currentData: data,
        actions: new Array(16).fill(0).map((_, i) => ({ type: i % 2 === 0 ? 'buy' : 'sell', day: i * 10, price: 100 })),
        totalHistory: new Array(250).fill(10000),
        levelStartCash: 10000,
        finalCash: 9000,
        level: 1,
        currentMarket: 'crypto',
        currentAsset: 'BTC',
    });
    const normalReport = metrics.analyzeRun({
        currentData: data,
        actions: [],
        totalHistory: new Array(250).fill(10000),
        levelStartCash: 10000,
        finalCash: 10000,
        level: 1,
        currentMarket: 'crypto',
        currentAsset: 'BTC',
    });
    state = mastery.reduceMastery(state, overtraderReport); // 1
    assert.equal(state.achievements.OVERTRADER_NEG.progress, 1);
    state = mastery.reduceMastery(state, overtraderReport); // 2
    assert.equal(state.achievements.OVERTRADER_NEG.progress, 2);
    state = mastery.reduceMastery(state, normalReport); // reset
    assert.equal(state.achievements.OVERTRADER_NEG.progress, 0);
    state = mastery.reduceMastery(state, overtraderReport);
    state = mastery.reduceMastery(state, overtraderReport);
    state = mastery.reduceMastery(state, overtraderReport);
    assert.equal(state.achievements.OVERTRADER_NEG.progress, 3);
    assert.ok(state.achievements.OVERTRADER_NEG.unlockedAt);
}

// Mastery: DIP_BUYER
{
    let state = mastery.emptyMastery();
    const prices = [];
    for (let i = 0; i < 125; i++) prices.push(100 - i * 0.5);
    for (let i = 125; i < 250; i++) prices.push(50 + (i - 125) * 0.2);
    const data = makeData(prices);
    const report = metrics.analyzeRun({
        currentData: data,
        actions: [{ type: 'buy', day: 120, price: prices[120] }, { type: 'buy', day: 121, price: prices[121] }],
        totalHistory: new Array(250).fill(10000),
        levelStartCash: 10000,
        finalCash: 10500,
        level: 1,
        currentMarket: 'crypto',
        currentAsset: 'BTC',
    });
    assert.ok(report.marketMaxDrawdown > 0.2);
    const prev = state.achievements.DIP_BUYER.progress;
    state = mastery.reduceMastery(state, report);
    assert.ok(state.achievements.DIP_BUYER.progress > prev);
}

// Persistence roundtrip for mastery
{
    global.localStorage.clear();
    let state = mastery.emptyMastery();
    const data = makeData(new Array(250).fill(100));
    const report = metrics.analyzeRun({
        currentData: data,
        actions: [{ type: 'buy', day: 0, price: 100 }],
        totalHistory: new Array(250).fill(10000),
        levelStartCash: 10000,
        finalCash: 10500,
        level: 1,
        currentMarket: 'crypto',
        currentAsset: 'BTC',
    });
    state = mastery.reduceMastery(state, report);
    storage.saveMastery(state);
    const loaded = storage.loadMastery(mastery.emptyMastery());
    assert.equal(loaded.runsObserved, 1);
    assert.equal(loaded.achievements.DIAMOND_HANDS.progress, 1);
}

console.log('decision-storage and mastery checks passed');
