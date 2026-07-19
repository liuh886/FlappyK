const assert = require('node:assert/strict');
const {
    CHALLENGE_VERSION,
    encodeChallenge,
    decodeChallenge,
    validateChallengeShape,
} = require('../scripts/friend-challenge-codec.js');

const payload = {
    v: CHALLENGE_VERSION,
    d: 'snapshot-2026-07-18',
    g: [
        { m: 'crypto', a: 'Cardano', s: '2024-12-02' },
        { m: 'ashare', a: '贵州茅台 (A-Share)', s: '2025-06-20' },
        { m: 'usstock', a: 'Visa (US)', s: '2024-07-01' },
    ],
    t: 82.46658,
};

assert.equal(validateChallengeShape(payload), true);

const token = encodeChallenge(payload);
assert.match(token, /^[A-Za-z0-9_-]+$/);
assert.deepEqual(decodeChallenge(token), payload);
assert.equal(encodeChallenge(payload), token);

assert.equal(decodeChallenge('not-valid-base64'), null);
assert.equal(validateChallengeShape({ ...payload, v: 99 }), false);
assert.equal(validateChallengeShape({ ...payload, t: Number.NaN }), false);
assert.equal(validateChallengeShape({
    ...payload,
    g: payload.g.map((game, index) => index === 1 ? { ...game, m: 'usstock' } : game),
}), false);
assert.equal(validateChallengeShape({
    ...payload,
    g: payload.g.map((game, index) => index === 2 ? { ...game, s: 'July 1' } : game),
}), false);

assert.throws(
    () => encodeChallenge({ ...payload, g: payload.g.slice(0, 2) }),
    /Invalid FlappyK friend challenge payload/
);

console.log('Friend challenge codec checks passed');
