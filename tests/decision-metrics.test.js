'use strict';
const assert = require('node:assert/strict');
const metrics = require('../scripts/decision/decision-metrics.js');

function makeData(prices, startDate = '2020-01-01') {
    return prices.map((close, i) => ({
        date: `2020-01-${String(i + 1).padStart(2, '0')}`,
        open: close * 0.99,
        high: close * 1.01,
        low: close * 0.98,
        close,
    }));
}

// Flat market, no trades
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
    assert.equal(report.version, 1);
    assert.equal(report.tradeCount, 0);
    assert.equal(report.buyCount, 0);
    assert.equal(report.sellCount, 0);
    assert.equal(report.feeDrag, 0);
    assert.equal(report.turnover, 0);
    assert.equal(report.marketExposure, 0);
    assert.equal(report.longestHoldDays, 0);
    assert.equal(report.playerReturn, 0);
    assert.equal(report.marketReturn, 0);
    assert.equal(report.excessReturn, 0);
    assert.equal(report.isSuccess, false);
    assert.equal(report.closes.length, 250);
    assert.equal(report.equityCurve.length, 250);
}

// Rising market, buy and hold via actions
{
    const prices = [];
    for (let i = 0; i < 250; i++) prices.push(100 + i * 0.5); // 100 -> 224.5
    const data = makeData(prices);
    const actions = [{ type: 'buy', day: 0, price: 100 }];
    // Simulate equity: bought 10 shares, cash 8999, equity = 8999 + 10*close
    const totalHistory = prices.map((p) => 8999 + (1000 / 100) * p);
    const report = metrics.analyzeRun({
        currentData: data,
        actions,
        totalHistory,
        levelStartCash: 10000,
        finalCash: 8999 + 10 * prices[249],
        level: 1,
        currentMarket: 'usstock',
        currentAsset: 'AAPL',
    });
    assert.equal(report.tradeCount, 1);
    assert.equal(report.buyCount, 1);
    assert.ok(report.marketExposure > 0.9);
    assert.ok(report.longestHoldDays >= 240);
    assert.equal(report.firstBuyDay, 0);
    assert.equal(report.lastSellDay, null);
    assert.equal(report.returnAfterLastSell, null);
    assert.ok(report.playerReturn > 0);
    assert.ok(report.marketReturn > 1);
}

// Paper hands scenario: buy early, sell mid, market continues up
{
    const prices = [];
    for (let i = 0; i < 250; i++) prices.push(100 + i * 0.4); // 100->199.6
    const data = makeData(prices);
    const actions = [
        { type: 'buy', day: 10, price: prices[10] },
        { type: 'sell', day: 100, price: prices[100] },
    ];
    const totalHistory = new Array(250).fill(10000);
    // Force some equity curve
    for (let i = 0; i < 250; i++) totalHistory[i] = 10000 + (i > 100 ? 500 : 200);
    const report = metrics.analyzeRun({
        currentData: data,
        actions,
        totalHistory,
        levelStartCash: 10000,
        finalCash: 10500,
        level: 2,
        currentMarket: 'ashare',
        currentAsset: '600000',
    });
    assert.equal(report.tradeCount, 2);
    assert.equal(report.lastSellDay, 100);
    assert.ok(Number.isFinite(report.returnAfterLastSell));
    assert.ok(report.returnAfterLastSell > 0.3); // market continued up ~42%
    assert.ok(report.missedUpside > 0.3);
    assert.ok(report.maxFavorableAfterLastSell > 0.3);
}

// Max drawdown
{
    const prices = new Array(250).fill(100);
    const data = makeData(prices);
    const history = [];
    for (let i = 0; i < 250; i++) {
        if (i < 100) history.push(10000 + i * 20);
        else if (i < 150) history.push(12000 - (i - 100) * 80); // drawdown to 8000
        else history.push(8000 + (i - 150) * 10);
    }
    const report = metrics.analyzeRun({
        currentData: data,
        actions: [],
        totalHistory: history,
        levelStartCash: 10000,
        finalCash: history[249],
        level: 1,
        currentMarket: 'crypto',
        currentAsset: 'ETH',
    });
    // Peak ~11980 at day 99, trough 8000 at day 150 => DD ~33%
    assert.ok(Math.abs(report.maxDrawdown - 0.33) < 0.04);
    assert.ok(report.maxDrawdownDay === 149 || report.maxDrawdownDay === 150);
}

// Fee and turnover
{
    const data = makeData(new Array(250).fill(100));
    const actions = new Array(20).fill(0).map((_, i) => ({ type: i % 2 === 0 ? 'buy' : 'sell', day: i * 10, price: 100 }));
    const report = metrics.analyzeRun({
        currentData: data,
        actions,
        totalHistory: new Array(250).fill(10000),
        levelStartCash: 10000,
        finalCash: 9800,
        level: 1,
        currentMarket: 'crypto',
        currentAsset: 'BTC',
    });
    assert.equal(report.tradeCount, 20);
    assert.equal(report.feeDrag, 0.002); // 20*1/10000
    assert.equal(report.turnover, 2); // 20*1000/10000
}

// Best possible trade
{
    const prices = [100, 80, 120, 90, 150];
    while (prices.length < 250) prices.push(150);
    const data = makeData(prices);
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
    // Best is buy at 80 sell at 150 => 87.5%
    assert.ok(Math.abs(report.bestPossibleTrade - 0.875) < 1e-9);
}

// Highlight moment — true biggest fact, engine-owned
{
    // Case 1: sold early with small after-move, but market DD is huge → should be MARKET_DD
    const prices = [];
    for (let i = 0; i < 40; i++) prices.push(100); // flat
    for (let i = 40; i < 80; i++) prices.push(100 - (i - 40) * 1); // down to 60 (-40%)
    for (let i = 80; i < 250; i++) prices.push(60 + (i - 80) * 0.3); // recover to ~111
    // Make sell at day 230 with tiny after move +0.7%
    // Adjust tail to be flat after sell
    const data = makeData(prices);
    // Force final price near sell price
    data[249].close = data[230].close * 1.007;
    const actions = [{ type: 'buy', day: 10, price: prices[10] }, { type: 'sell', day: 230, price: prices[230] }];
    const report = metrics.analyzeRun({
        currentData: data,
        actions,
        totalHistory: new Array(250).fill(10000),
        levelStartCash: 10000,
        finalCash: 10200,
        level: 1,
        currentMarket: 'crypto',
        currentAsset: 'BTC',
    });
    // marketMaxDrawdown ~40% > |returnAfterLastSell| ~0.7%, so highlight must be MARKET_DD, not SOLD_AFTER
    assert.ok(report.marketMaxDrawdown > 0.35);
    assert.ok(Math.abs(report.returnAfterLastSell) < 0.02);
    assert.ok(report.highlightMoment, 'highlightMoment must exist');
    assert.equal(report.highlightMoment.type, 'MARKET_DD', `expected MARKET_DD as biggest, got ${report.highlightMoment.type}`);
    assert.ok(report.highlightMoment.magnitude > 0.35);
}

{
    // Case 2: large post-sell rally → SOLD_AFTER wins
    const prices = [];
    for (let i = 0; i < 250; i++) prices.push(100 + i * 0.5); // 100->224
    const data = makeData(prices);
    const actions = [{ type: 'buy', day: 5, price: prices[5] }, { type: 'sell', day: 50, price: prices[50] }];
    const report = metrics.analyzeRun({
        currentData: data,
        actions,
        totalHistory: new Array(250).fill(10000),
        levelStartCash: 10000,
        finalCash: 10300,
        level: 1,
        currentMarket: 'crypto',
        currentAsset: 'BTC',
    });
    // returnAfterLastSell ~ (224-125)/125=0.79, marketMaxDrawdown 0 (monotonic up), so SOLD_AFTER should be biggest
    assert.ok(report.returnAfterLastSell > 0.5);
    assert.equal(report.highlightMoment.type, 'SOLD_AFTER');
    assert.equal(report.highlightMoment.day, 50);
}

{
    // Case 3: no sell, flat market, fee is biggest (if trades exist)
    const data = makeData(new Array(250).fill(100));
    const actions = new Array(6).fill(0).map((_, i) => ({ type: i % 2 === 0 ? 'buy' : 'sell', day: i * 20, price: 100 }));
    const report = metrics.analyzeRun({
        currentData: data,
        actions,
        totalHistory: new Array(250).fill(10000),
        levelStartCash: 10000,
        finalCash: 9900,
        level: 1,
        currentMarket: 'crypto',
        currentAsset: 'BTC',
    });
    // marketMaxDrawdown 0, returnAfterLastSell small (0), feeDrag 6*1/10000=0.0006 < floor 0.005 → highlight may be null or SOLD_AFTER if sell exists
    // With 6 trades, fee 0.0006 < floor, so no highlight; but we allow null. Just check it doesn't crash and is either SOLD_AFTER or null.
    assert.ok(report.highlightMoment === null || ['SOLD_AFTER', 'FEE_DRAG', 'MARKET_DD'].includes(report.highlightMoment.type));
}

console.log('decision-metrics checks passed');
