const assert = require('node:assert/strict');
const profileApi = require('../scripts/player-profile.js');

const empty = profileApi.normalizeProfile(null);
assert.equal(empty.bestExcess, null);
assert.equal(empty.runsCompleted, 0);
assert.equal(empty.marketsBeaten, 0);

const firstScore = {
    excess: -4.5,
    games: [
        { excess: 1.2 },
        { excess: 2.3 },
        { excess: 3.4 },
    ],
};
const first = profileApi.applyCompletedRun(empty, firstScore);
assert.equal(first.isNewBest, true);
assert.equal(first.previousBest, null);
assert.equal(first.profile.bestExcess, -4.5);
assert.equal(first.profile.runsCompleted, 1);
assert.equal(first.profile.marketsBeaten, 3);
assert.deepEqual(first.profile.bestByMarket, {
    crypto: 1.2,
    ashare: 2.3,
    usstock: 3.4,
});

const lower = profileApi.applyCompletedRun(first.profile, {
    excess: -8,
    games: [
        { excess: 0.5 },
        { excess: 4.1 },
        { excess: 2.2 },
    ],
});
assert.equal(lower.isNewBest, false);
assert.equal(lower.profile.bestExcess, -4.5);
assert.equal(lower.profile.runsCompleted, 2);
assert.equal(lower.profile.marketsBeaten, 6);
assert.equal(lower.profile.bestByMarket.crypto, 1.2);
assert.equal(lower.profile.bestByMarket.ashare, 4.1);
assert.equal(lower.profile.bestByMarket.usstock, 3.4);

const higher = profileApi.applyCompletedRun(lower.profile, {
    excess: 10,
    games: [
        { excess: 5 },
        { excess: 6 },
        { excess: 7 },
    ],
});
assert.equal(higher.isNewBest, true);
assert.equal(higher.previousBest, -4.5);
assert.equal(higher.improvement, 14.5);
assert.equal(higher.profile.bestExcess, 10);
assert.equal(higher.profile.runsCompleted, 3);

const cards = [
    { market: 'crypto', asset: 'A', periodStr: '2020-01-01 ~ 2020-12-31', excessRetStr: '+1.00%' },
    { market: 'ashare', asset: 'B', periodStr: '2021-01-01 ~ 2021-12-31', excessRetStr: '+2.00%' },
    { market: 'usstock', asset: 'C', periodStr: '2022-01-01 ~ 2022-12-31', excessRetStr: '+3.00%' },
];
const signature = profileApi.buildRunSignature(cards, 0.1234);
assert.equal(signature, profileApi.buildRunSignature(cards, 0.1234));
assert.notEqual(signature, profileApi.buildRunSignature(cards, 0.1235));
assert.equal(profileApi.buildRunSignature(cards.slice(0, 2), 0.1234), '');

assert.throws(
    () => profileApi.applyCompletedRun(empty, { excess: Number.NaN, games: [] }),
    /complete three-game score/
);
assert.throws(
    () => profileApi.applyCompletedRun(empty, { excess: 1, games: [{ excess: 1 }] }),
    /complete three-game score/
);

console.log('Local personal record checks passed');
