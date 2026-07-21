const assert = require('node:assert/strict');
const { evaluate } = require('../scripts/market-pass-rule.js');

const beatsRisingMarket = evaluate({
    startCash: 10000,
    finalCash: 11200,
    startPrice: 100,
    finalPrice: 108,
});
assert.equal(beatsRisingMarket.isSuccess, true);
assert.ok(Math.abs(beatsRisingMarket.excessReturn - 0.04) < 1e-12);

const losesMoneyButBeatsFallingMarket = evaluate({
    startCash: 10000,
    finalCash: 9500,
    startPrice: 100,
    finalPrice: 90,
});
assert.equal(losesMoneyButBeatsFallingMarket.isSuccess, true);
assert.ok(Math.abs(losesMoneyButBeatsFallingMarket.excessReturn - 0.05) < 1e-12);

const profitsButLosesToMarket = evaluate({
    startCash: 10000,
    finalCash: 11000,
    startPrice: 100,
    finalPrice: 125,
});
assert.equal(profitsButLosesToMarket.isSuccess, false);
assert.ok(Math.abs(profitsButLosesToMarket.excessReturn + 0.15) < 1e-12);

const exactlyMatchesMarket = evaluate({
    startCash: 10000,
    finalCash: 11000,
    startPrice: 100,
    finalPrice: 110,
});
assert.equal(exactlyMatchesMarket.isSuccess, false);

assert.throws(
    () => evaluate({ startCash: 0, finalCash: 100, startPrice: 100, finalPrice: 101 }),
    /startCash/
);

console.log('Beat-the-market pass rule checks passed');
