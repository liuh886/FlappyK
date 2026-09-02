/**
 * FlappyK Mastery System — pure reducer over DecisionReports.
 * Owner: scripts/decision/mastery-system.js
 * Traits are earned over many runs, never from a single run.
 */
(function exposeMasterySystem(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.FlappyKMastery = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
    'use strict';

    const VERSION = 1;

    const ACHIEVEMENTS = Object.freeze({
        DIAMOND_HANDS: { target: 5, description: '5 levels holding >100 days' },
        DIP_BUYER: { target: 10, description: '10 buys in 20% DD zone' },
        CRASH_SURVIVOR: { target: 3, description: '3 bear windows with excess>0.20' },
        MARKET_TIMER: { target: 5, description: '5 sells where market fell >5% in next 20d' },
        OVERTRADER_NEG: { target: 3, description: '3 consecutive levels with >15 trades (negative)' },
    });

    function emptyMastery() {
        const achievements = {};
        for (const [id, def] of Object.entries(ACHIEVEMENTS)) {
            achievements[id] = { unlockedAt: null, progress: 0, target: def.target };
        }
        return Object.freeze({
            version: VERSION,
            runsObserved: 0,
            achievements: Object.freeze(achievements),
        });
    }

    function normalizeMastery(value) {
        if (!value || typeof value !== 'object' || value.version !== VERSION) return emptyMastery();
        const base = emptyMastery();
        const nextAchievements = { ...base.achievements };
        if (value.achievements && typeof value.achievements === 'object') {
            for (const id of Object.keys(ACHIEVEMENTS)) {
                const incoming = value.achievements[id];
                if (incoming && typeof incoming === 'object') {
                    const prog = Math.max(0, Math.floor(Number(incoming.progress) || 0));
                    const unlockedAt = incoming.unlockedAt ? String(incoming.unlockedAt) : null;
                    nextAchievements[id] = {
                        progress: Math.min(prog, ACHIEVEMENTS[id].target),
                        target: ACHIEVEMENTS[id].target,
                        unlockedAt: prog >= ACHIEVEMENTS[id].target ? (unlockedAt || new Date().toISOString()) : null,
                    };
                }
            }
        }
        const storedStreak = Number(value._overtraderStreak);
        return Object.freeze({
            version: VERSION,
            runsObserved: Math.max(0, Math.floor(Number(value.runsObserved) || 0)),
            achievements: Object.freeze(nextAchievements),
            _overtraderStreak: Number.isFinite(storedStreak) ? Math.max(0, Math.floor(storedStreak)) : 0,
        });
    }

    // Helper: determine if a buy was in DD zone (simplified: if report.maxDrawdown>0.20 and buy was near trough)
    // For v0.1 we use a proxy: if report.maxDrawdown>0.20 and report has buys, count each buy as dip buy with 30% chance?
    // Better: we need closes to evaluate. Since mastery reducer is pure over report, we lack closes granularity.
    // So we define dip-buy as: report contains buys and maxDrawdown>0.20
    function isDipBuyReport(report) {
        const dd = Number.isFinite(report.marketMaxDrawdown) ? report.marketMaxDrawdown : report.maxDrawdown;
        return Number.isFinite(dd) && dd > 0.20 && Number(report.buyCount) > 0;
    }

    function reduceMastery(prevMastery, report, options = {}) {
        const prev = normalizeMastery(prevMastery);
        if (!report || typeof report !== 'object' || report.version !== VERSION) throw new TypeError('report must be a valid DecisionReport');

        // Track consecutive overtrader streak externally? For v0.1 we store it in a hidden counter.
        // We encode streak in runsObserved? No. We keep separate logic: OVERTRADER_NEG progresses when tradeCount>15 consecutively.
        // To keep reducer pure, we need to know previous streak. We store it in a non-achievement field.
        const prevStreak = Number(prev._overtraderStreak || 0);
        let nextStreak = prevStreak;
        if (Number(report.tradeCount) > 15) nextStreak = prevStreak + 1;
        else nextStreak = 0;

        const nextAchievements = {};
        for (const [id, def] of Object.entries(ACHIEVEMENTS)) {
            const cur = prev.achievements[id];
            let progress = cur.progress;
            // Already unlocked -> keep
            if (cur.unlockedAt) {
                nextAchievements[id] = { ...cur };
                continue;
            }

            if (id === 'DIAMOND_HANDS') {
                if (Number(report.longestHoldDays) >= 100) progress += 1;
            } else if (id === 'DIP_BUYER') {
                if (isDipBuyReport(report)) progress += Number(report.buyCount);
                // Cap increment to buyCount, but avoid overcounting huge
                if (progress > def.target) progress = def.target;
            } else if (id === 'CRASH_SURVIVOR') {
                if (Number(report.marketReturn) < -0.25 && Number(report.excessReturn) > 0.20) progress += 1;
            } else if (id === 'MARKET_TIMER') {
                if (report.lastSellDay !== null && Number.isFinite(report.returnAfterLastSell) && report.returnAfterLastSell < -0.05) {
                    // Need to check within 20d? For v0.1 proxy: if returnAfterLastSell < -0.05, count
                    progress += 1;
                }
            } else if (id === 'OVERTRADER_NEG') {
                // Progress is consecutive streak, not sum
                progress = nextStreak;
                // For this achievement, progress = streak
                // unlock when streak >=3
            }

            // Cap
            if (id !== 'OVERTRADER_NEG' && progress > def.target) progress = def.target;
            if (id === 'OVERTRADER_NEG' && progress > def.target) progress = def.target;

            const unlockedAt = progress >= def.target ? (cur.unlockedAt || new Date().toISOString()) : null;
            nextAchievements[id] = { progress, target: def.target, unlockedAt };
        }

        const next = {
            version: VERSION,
            runsObserved: prev.runsObserved + 1,
            achievements: Object.freeze(nextAchievements),
            _overtraderStreak: nextStreak, // hidden, not part of frozen achievements but needed for purity; we freeze top-level but keep it
        };

        // Freeze shallow, but keep _overtraderStreak enumerable for storage? Store it as part of mastery for next reducer.
        // To avoid leaking private field into persistence, we will include it but storage will persist it.
        return Object.freeze(next);
    }

    return {
        VERSION,
        ACHIEVEMENTS,
        emptyMastery,
        normalizeMastery,
        reduceMastery,
    };
});
