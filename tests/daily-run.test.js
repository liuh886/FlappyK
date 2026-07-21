const assert = require('node:assert/strict');
const daily = require('../scripts/daily-run-core.js');

function rows(count, year) {
    return Array.from({ length: count }, (_, index) => ({
        date: `${year}-${String(Math.floor(index / 28) + 1).padStart(2, '0')}-${String((index % 28) + 1).padStart(2, '0')}`,
        close: 100 + index,
    }));
}

const stockDataA = {
    crypto: { Zeta: rows(280, 2020), Alpha: rows(300, 2021) },
    ashare: { 中证样本: rows(310, 2022), AShare: rows(290, 2023) },
    usstock: { Zebra: rows(275, 2024), Apple: rows(320, 2025) },
};
const stockDataB = {
    crypto: { Alpha: stockDataA.crypto.Alpha, Zeta: stockDataA.crypto.Zeta },
    ashare: { AShare: stockDataA.ashare.AShare, 中证样本: stockDataA.ashare.中证样本 },
    usstock: { Apple: stockDataA.usstock.Apple, Zebra: stockDataA.usstock.Zebra },
};

const first = daily.generateDailyDescriptors(stockDataA, '2026-07-21', 250);
const repeated = daily.generateDailyDescriptors(stockDataA, '2026-07-21', 250);
const reordered = daily.generateDailyDescriptors(stockDataB, '2026-07-21', 250);
assert.deepEqual(first, repeated);
assert.deepEqual(first, reordered);
assert.deepEqual(first.map((game) => game.m), ['crypto', 'ashare', 'usstock']);
assert.equal(first.length, 3);
first.forEach((game) => assert.match(game.s, /^\d{4}-\d{2}-\d{2}$/));

assert.equal(daily.utcDateKey(new Date('2026-07-21T23:59:59.000Z')), '2026-07-21');
assert.equal(daily.previousUtcDate('2026-03-01'), '2026-02-28');
assert.equal(daily.previousUtcDate('2024-03-01'), '2024-02-29');

const dayOne = daily.updateDailyRecord(null, '2026-07-20', 10);
assert.equal(dayOne.record.streak, 1);
assert.equal(dayOne.isNewDailyBest, true);
assert.equal(dayOne.record.bestByDate['2026-07-20'], 10);

const sameDayLower = daily.updateDailyRecord(dayOne.record, '2026-07-20', 8);
assert.equal(sameDayLower.record.streak, 1);
assert.equal(sameDayLower.isNewDailyBest, false);
assert.equal(sameDayLower.record.bestByDate['2026-07-20'], 10);

const sameDayHigher = daily.updateDailyRecord(sameDayLower.record, '2026-07-20', 14);
assert.equal(sameDayHigher.isNewDailyBest, true);
assert.equal(sameDayHigher.improvement, 4);
assert.equal(sameDayHigher.record.bestByDate['2026-07-20'], 14);

const consecutive = daily.updateDailyRecord(sameDayHigher.record, '2026-07-21', 5);
assert.equal(consecutive.record.streak, 2);
assert.equal(consecutive.record.lastCompletedDate, '2026-07-21');

const missedDay = daily.updateDailyRecord(consecutive.record, '2026-07-23', 6);
assert.equal(missedDay.record.streak, 1);

assert.throws(
    () => daily.generateDailyDescriptors({ crypto: {}, ashare: {}, usstock: {} }, '2026-07-21', 250),
    /No crypto asset/
);
assert.throws(() => daily.updateDailyRecord(null, 'bad-date', 1), /UTC date key/);
assert.throws(() => daily.updateDailyRecord(null, '2026-07-21', Number.NaN), /finite daily score/);

console.log('Daily Run deterministic selection and streak checks passed');
