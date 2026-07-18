'use strict';

const LEADERBOARD_LIMIT = 10;
const MAX_ABSOLUTE_SCORE = 1_000_000;

function finiteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function isValidSubmittedScore(excess, totalReturn) {
    return Number.isFinite(excess)
        && Number.isFinite(totalReturn)
        && Math.abs(excess) <= MAX_ABSOLUTE_SCORE
        && totalReturn >= -100
        && totalReturn <= MAX_ABSOLUTE_SCORE;
}

function compareEntries(left, right) {
    const excessDifference = finiteNumber(right.excess) - finiteNumber(left.excess);
    if (Math.abs(excessDifference) > 1e-9) return excessDifference;

    const totalDifference = finiteNumber(right.totalReturn) - finiteNumber(left.totalReturn);
    if (Math.abs(totalDifference) > 1e-9) return totalDifference;

    return String(left.submittedAt || '').localeCompare(String(right.submittedAt || ''));
}

function normalizeEntries(entries) {
    if (!Array.isArray(entries)) return [];

    return entries
        .filter((entry) => entry && typeof entry.player === 'string')
        .map((entry) => ({
            ...entry,
            player: entry.player.trim(),
            excess: finiteNumber(entry.excess),
            totalReturn: finiteNumber(entry.totalReturn),
        }))
        .filter((entry) => entry.player.length > 0)
        .sort(compareEntries)
        .slice(0, LEADERBOARD_LIMIT)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function updateTop10(entries, candidate) {
    const normalized = normalizeEntries(entries);
    const playerKey = String(candidate.player || '').trim().toLowerCase();
    const existing = normalized.find((entry) => entry.player.toLowerCase() === playerKey);

    if (existing && compareEntries(candidate, existing) >= 0) {
        return {
            accepted: false,
            reason: 'not_personal_best',
            entries: normalized,
            cutoff: normalized.at(-1)?.excess ?? null,
        };
    }

    const withoutPlayer = normalized.filter((entry) => entry.player.toLowerCase() !== playerKey);
    const ranked = [...withoutPlayer, candidate]
        .sort(compareEntries)
        .slice(0, LEADERBOARD_LIMIT)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

    const acceptedEntry = ranked.find((entry) => entry.issueNumber === candidate.issueNumber);

    return {
        accepted: Boolean(acceptedEntry),
        reason: acceptedEntry ? 'top_10' : 'below_cutoff',
        rank: acceptedEntry?.rank ?? null,
        entries: ranked,
        cutoff: ranked.at(-1)?.excess ?? null,
    };
}

module.exports = {
    LEADERBOARD_LIMIT,
    MAX_ABSOLUTE_SCORE,
    compareEntries,
    isValidSubmittedScore,
    normalizeEntries,
    updateTop10,
};
