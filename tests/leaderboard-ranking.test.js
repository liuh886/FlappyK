const assert = require('node:assert/strict');
const {
    normalizeEntries,
    updateTop10,
} = require('../scripts/leaderboard-ranking.js');

const baseEntries = Array.from({ length: 10 }, (_, index) => ({
    player: `player-${index + 1}`,
    excess: 20 - index,
    totalReturn: 30 - index,
    submittedAt: `2026-07-${String(index + 1).padStart(2, '0')}T00:00:00Z`,
    issueNumber: index + 1,
}));

const normalized = normalizeEntries(baseEntries);
assert.equal(normalized.length, 10);
assert.equal(normalized[0].rank, 1);
assert.equal(normalized[9].rank, 10);
assert.equal(normalized[0].excess, 20);

const belowCutoff = updateTop10(baseEntries, {
    player: 'new-player',
    excess: 5,
    totalReturn: 50,
    submittedAt: '2026-07-18T00:00:00Z',
    issueNumber: 100,
});
assert.equal(belowCutoff.accepted, false);
assert.equal(belowCutoff.reason, 'below_cutoff');
assert.equal(belowCutoff.entries.length, 10);

const topScore = updateTop10(baseEntries, {
    player: 'new-player',
    excess: 25,
    totalReturn: 28,
    submittedAt: '2026-07-18T00:00:00Z',
    issueNumber: 101,
});
assert.equal(topScore.accepted, true);
assert.equal(topScore.rank, 1);
assert.equal(topScore.entries[0].player, 'new-player');
assert.equal(topScore.entries.length, 10);

const worsePersonalScore = updateTop10(baseEntries, {
    player: 'PLAYER-1',
    excess: 19,
    totalReturn: 99,
    submittedAt: '2026-07-18T00:00:00Z',
    issueNumber: 102,
});
assert.equal(worsePersonalScore.accepted, false);
assert.equal(worsePersonalScore.reason, 'not_personal_best');
assert.equal(worsePersonalScore.entries[0].player, 'player-1');

const betterPersonalScore = updateTop10(baseEntries, {
    player: 'player-10',
    excess: 21,
    totalReturn: 31,
    submittedAt: '2026-07-18T00:00:00Z',
    issueNumber: 103,
});
assert.equal(betterPersonalScore.accepted, true);
assert.equal(betterPersonalScore.rank, 1);
assert.equal(betterPersonalScore.entries.filter((entry) => entry.player === 'player-10').length, 1);

console.log('Leaderboard ranking checks passed');
