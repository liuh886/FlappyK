'use strict';
const assert = require('node:assert/strict');
const cf = require('../scripts/decision/counterfactual-engine.js');
const metrics = require('../scripts/decision/decision-metrics.js');
const insight = require('../scripts/decision/insight-engine.js');

function makeData(prices) {
    return prices.map((close, i) => ({
        date: `2020-01-${String((i % 30) + 1).padStart(2, '0')}`,
        open: close * 0.99,
        high: close * 1.01,
        low: close * 0.98,
        close,
    }));
}

// Buy and hold invariant
{
    const prices = [];
    for (let i = 0; i < 250; i++) prices.push(100 + i * 0.4);
    const data = makeData(prices);
    const result = cf.simulate({ currentData: data, actions: [], levelStartCash: 10000 });
    assert.equal(result.version, 1);
    assert.equal(result.buyAndHold.label, 'BUY_AND_HOLD_FROM_DAY_0');
    assert.ok(Math.abs(result.buyAndHold.return - (prices[249] / prices[0] - 1)) < 1e-12);
    assert.equal(result.curves.buyAndHoldEquity.length, 250);
    assert.equal(result.curves.buyAndHoldEquity[0], 10000);
    assert.ok(Math.abs(result.curves.buyAndHoldEquity[249] - 10000 * (prices[249] / prices[0])) < 1e-6);
    assert.equal(result.noTrade.return, 0);
    assert.equal(result.firstEntryHold.applicable, false);
}

// First entry hold applicable
{
    const prices = [];
    for (let i = 0; i < 250; i++) prices.push(100);
    const data = makeData(prices);
    // Make market rise after first buy
    for (let i = 50; i < 250; i++) data[i].close = 150;
    const actions = [{ type: 'buy', day: 10, price: 100 }];
    const result = cf.simulate({ currentData: data, actions, levelStartCash: 10000 });
    assert.equal(result.firstEntryHold.applicable, true);
    assert.ok(result.firstEntryHold.return > 0);
    assert.equal(result.curves.firstEntryHoldEquity.length, 250);
    assert.equal(result.curves.firstEntryHoldEquity[0], 10000);
    // Before buy day, flat; after, should be higher
    assert.equal(result.curves.firstEntryHoldEquity[5], 10000);
    assert.ok(result.curves.firstEntryHoldEquity[100] > 10000);
}

// Insight: PAPER_HANDS - synthetic report to ensure gap >0.15
{
    const report = {
        version: 1,
        playerReturn: 0.02,
        marketReturn: 0.80,
        excessReturn: -0.78,
        lastSellDay: 50,
        returnAfterLastSell: 0.45,
        missedUpside: 0.50,
        tradeCount: 2,
        buyCount: 1,
        sellCount: 1,
        maxDrawdown: 0.05,
        longestHoldDays: 30,
    };
    const cfs = {
        firstEntryHold: { applicable: true, return: 0.25 },
        buyAndHold: { return: 0.80 },
    };
    const verdicts = insight.deriveVerdicts(report, cfs, { trend: 'bull' });
    const ids = verdicts.map((v) => v.id);
    assert.ok(ids.includes('PAPER_HANDS'), `expected PAPER_HANDS, got ${ids}`);
    // Trace must be present
    const ph = verdicts.find((v) => v.id === 'PAPER_HANDS');
    assert.ok(ph.trace.reportField === 'playerReturn');
    assert.ok(ph.trace.actual > 0.15);
    assert.equal(ph.trace.actual, 0.23);
}

// Insight: DODGED_THE_CRASH
{
    const prices = [];
    for (let i = 0; i < 250; i++) prices.push(200 - i * 0.5); // bear -62%
    const data = makeData(prices);
    const totalHistory = new Array(250).fill(10000);
    // Player loses little: 10000->9500
    const report = metrics.analyzeRun({
        currentData: data,
        actions: [],
        totalHistory,
        levelStartCash: 10000,
        finalCash: 9500,
        level: 1,
        currentMarket: 'crypto',
        currentAsset: 'BTC',
    });
    // Market return -62.5%, player -5%, excess +57.5%
    assert.ok(report.marketReturn < -0.2);
    assert.ok(report.excessReturn > 0.15);
    const cfs = cf.simulate({ currentData: data, actions: [], levelStartCash: 10000 });
    const verdicts = insight.deriveVerdicts(report, cfs, { trend: 'bear' });
    assert.ok(verdicts.some((v) => v.id === 'DODGED_THE_CRASH'));
    assert.ok(verdicts[0].id === 'DODGED_THE_CRASH', 'DODGED has highest priority');
}

// Insight: OVERTRADER and at most 2 verdicts
{
    const data = makeData(new Array(250).fill(100));
    const actions = new Array(16).fill(0).map((_, i) => ({ type: i % 2 === 0 ? 'buy' : 'sell', day: i * 10, price: 100 }));
    const report = metrics.analyzeRun({
        currentData: data,
        actions,
        totalHistory: new Array(250).fill(10000),
        levelStartCash: 10000,
        finalCash: 9000,
        level: 1,
        currentMarket: 'crypto',
        currentAsset: 'BTC',
    });
    const cfs = cf.simulate({ currentData: data, actions, levelStartCash: 10000 });
    const verdicts = insight.deriveVerdicts(report, cfs, {});
    assert.ok(verdicts.some((v) => v.id === 'OVERTRADER'));
    assert.ok(verdicts.length <= 2);
}

// Insight: DIAMOND_HANDS_LEVEL
{
    const data = makeData(new Array(250).fill(100));
    const actions = [{ type: 'buy', day: 0, price: 100 }];
    const totalHistory = new Array(250).fill(10000);
    const report = metrics.analyzeRun({
        currentData: data,
        actions,
        totalHistory,
        levelStartCash: 10000,
        finalCash: 10500,
        level: 1,
        currentMarket: 'crypto',
        currentAsset: 'BTC',
    });
    assert.ok(report.longestHoldDays >= 100);
    const cfs = cf.simulate({ currentData: data, actions, levelStartCash: 10000 });
    const verdicts = insight.deriveVerdicts(report, cfs, {});
    assert.ok(verdicts.some((v) => v.id === 'DIAMOND_HANDS_LEVEL'));
}

// Insight: MISSED_THE_DIP
{
    const prices = [];
    for (let i = 0; i < 125; i++) prices.push(100 - i * 0.4); // down to 50
    for (let i = 125; i < 250; i++) prices.push(50 + (i - 125) * 0.6); // up to 125
    const data = makeData(prices);
    const report = metrics.analyzeRun({
        currentData: data,
        actions: [], // stayed in cash the whole dip
        totalHistory: new Array(250).fill(10000),
        levelStartCash: 10000,
        finalCash: 10000,
        level: 1,
        currentMarket: 'crypto',
        currentAsset: 'BTC',
    });
    // Market MaxDD ~50% (player DD is 0 because stayed in cash)
    assert.ok(report.marketMaxDrawdown > 0.2);
    assert.ok(report.marketReturn > 0);
    const cfs = cf.simulate({ currentData: data, actions: [], levelStartCash: 10000 });
    // Pass market regime for dip detection (or rely on report.marketMaxDrawdown)
    const regimeForDip = { maxDrawdown: report.marketMaxDrawdown };
    const verdicts = insight.deriveVerdicts(report, cfs, regimeForDip);
    assert.ok(verdicts.some((v) => v.id === 'MISSED_THE_DIP'));
}

// Whitelisted only
{
    const data = makeData(new Array(250).fill(100));
    const report = metrics.analyzeRun({
        currentData: data,
        actions: [],
        totalHistory: new Array(250).fill(10000),
        levelStartCash: 10000,
        finalCash: 10000,
        level: 1,
        currentMarket: 'crypto',
        currentAsset: 'BTC',
    });
    const cfs = cf.simulate({ currentData: data, actions: [], levelStartCash: 10000 });
    const verdicts = insight.deriveVerdicts(report, cfs, {});
    const allowed = new Set(Object.values(insight.VERDICTS));
    verdicts.forEach((v) => assert.ok(allowed.has(v.id), `verdict ${v.id} not whitelisted`));
}

console.log('counterfactual and insight checks passed');
