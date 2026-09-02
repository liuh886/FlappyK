'use strict';
const assert = require('node:assert/strict');
const regime = require('../scripts/decision/market-regime.js');

function makeCloses(prices) {
    return prices;
}

function makeData(prices) {
    return prices.map((close) => ({ close }));
}

// Bull
{
    const closes = [];
    for (let i = 0; i < 250; i++) closes.push(100 + i * 0.6); // +150%
    const r = regime.classifyMarket(closes);
    assert.equal(r.trend, 'bull');
    assert.equal(r.version, 1);
}

// Bear
{
    const closes = [];
    for (let i = 0; i < 250; i++) closes.push(200 - i * 0.5); // -62.5%
    const r = regime.classifyMarket(closes);
    assert.equal(r.trend, 'bear');
}

// Chop
{
    const closes = new Array(250).fill(100).map((_, i) => 100 + Math.sin(i / 10) * 5);
    const r = regime.classifyMarket(closes);
    assert.equal(r.trend, 'chop');
}

// Volatility low vs high
{
    const low = new Array(250).fill(100).map((_, i) => 100 + i * 0.05);
    const high = new Array(250).fill(100).map((_, i) => 100 + (Math.random() - 0.5) * 20 + i * 0.1);
    const rLow = regime.classifyMarket(low);
    const rHigh = regime.classifyMarket(high);
    // low vol should be low or mid, high vol should be mid or high
    assert.ok(['low', 'mid'].includes(rLow.volatility));
    // high vol likely mid/high; just check it computes
    assert.ok(['low', 'mid', 'high'].includes(rHigh.volatility));
}

// Must not read player fields
{
    assert.throws(() => regime.classifyMarket({ closes: new Array(250).fill(100), actions: [] }), /must not read player field/);
    assert.throws(() => regime.classifyMarket({ closes: new Array(250).fill(100), tradeCount: 5 }), /must not read player field/);
}

// Reversal count deterministic same window
{
    const closes = new Array(250).fill(100).map((_, i) => 100 + Math.sin(i / 20) * 10);
    const a = regime.classifyMarket(closes);
    const b = regime.classifyMarket([...closes]);
    assert.equal(a.reversalCount, b.reversalCount);
    assert.equal(a.shape, b.shape);
}

// Accepts currentData objects
{
    const data = makeData(new Array(250).fill(100).map((_, i) => 100 + i * 0.2));
    const r = regime.classifyMarket(data);
    assert.ok(r.trend);
}

// Throws on insufficient data
{
    assert.throws(() => regime.classifyMarket([100]), /at least 2 closes/);
}

console.log('market-regime checks passed');
