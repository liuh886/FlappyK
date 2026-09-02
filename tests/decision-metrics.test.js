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

console.log('decision-metrics checks passed');
