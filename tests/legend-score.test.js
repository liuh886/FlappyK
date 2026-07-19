const assert = require('node:assert/strict');
const scoreApi = require('../scripts/legend-score.js');

const cards = [
    {
        levelReturn: 0.10,
        marketReturn: 0.05,
        excessReturn: 0.05,
        asset: 'Bitcoin',
        periodStr: '2020-01-01 — 2020-12-31',
    },
    {
        levelReturn: -0.02,
        marketReturn: -0.04,
        excessReturn: 0.02,
        asset: 'A|Share\nName',
        periodStr: '2021-01-01 — 2021-12-31',
    },
    {
        levelReturn: 0.25,
        marketReturn: 0.20,
        excessReturn: 0.05,
        asset: 'US Stock',
        periodStr: '2022-01-01 — 2022-12-31',
    },
];

const score = scoreApi.calculate(cards, 0.30);
const benchmarkReturn = (1.05 * 0.96 * 1.20) - 1;

assert.ok(score);
assert.ok(Math.abs(score.totalReturn - 30) < 1e-9);
assert.ok(Math.abs(score.excess - ((0.30 - benchmarkReturn) * 100)) < 1e-9);
assert.equal(score.totalExcess, score.excess);
assert.equal(score.games.length, 3);
assert.equal(score.levels, score.games);
assert.equal(score.games[0].game, 1);
assert.equal(score.games[1].asset, 'A Share Name');
assert.equal(score.games[2].marketReturn, 20);

const stringFallback = scoreApi.calculate([
    { levelRetStr: '+10.00%', excessRetStr: '+5.00%', asset: 'A', periodStr: 'P1' },
    { levelRetStr: '+0.00%', excessRetStr: '-5.00%', asset: 'B', periodStr: 'P2' },
    { levelRetStr: '-10.00%', excessRetStr: '+0.00%', asset: 'C', periodStr: 'P3' },
], 0.02);
assert.ok(stringFallback);
assert.equal(stringFallback.games[0].marketReturn, 5);
assert.equal(stringFallback.games[1].marketReturn, 5);
assert.equal(stringFallback.games[2].marketReturn, -10);

assert.equal(scoreApi.calculate([], 0), null);
assert.equal(scoreApi.calculate(cards.slice(0, 2), 0), null);
assert.equal(scoreApi.calculate(cards, Number.NaN), null);
assert.equal(scoreApi.formatPercent(1.234), '+1.23%');
assert.equal(scoreApi.formatPercent(-1.234), '-1.23%');
assert.equal(scoreApi.formatPercent(Number.NaN), '---%');

console.log('Shared legend score calculation checks passed');
