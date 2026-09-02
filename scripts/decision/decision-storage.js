/**
 * FlappyK Decision Storage — local-only, versioned, fail-open, capped.
 * Owner: scripts/decision/decision-storage.js
 * Must never be used as trusted leaderboard evidence, must never block settlement.
 */
(function exposeDecisionStorage(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.FlappyKDecisionStorage = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
    'use strict';

    const VERSION = 1;
    const STORAGE_KEYS = Object.freeze({
        REPORTS: 'flappyk_decision_reports_v1',
        MASTERY: 'flappyk_mastery_v1',
    });
    const MAX_REPORTS = 50;

    function safeGetStorage() {
        try {
            if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
        } catch (e) {}
        return null;
    }

    function loadReports() {
        const storage = safeGetStorage();
        if (!storage) return [];
        try {
            const raw = storage.getItem(STORAGE_KEYS.REPORTS);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            // Filter to valid version and valid reports
            return parsed.filter((r) => r && r.version === VERSION).slice(-MAX_REPORTS);
        } catch (e) {
            return [];
        }
    }

    function saveReport(report) {
        if (!report || typeof report !== 'object' || report.version !== VERSION) throw new TypeError('report must be a valid DecisionReport with version 1');
        const storage = safeGetStorage();
        if (!storage) return false;
        try {
            const existing = loadReports();
            existing.push(report);
            let toStore = existing.slice(-MAX_REPORTS);
            let serialized = JSON.stringify(toStore);
            try {
                storage.setItem(STORAGE_KEYS.REPORTS, serialized);
                return true;
            } catch (quotaError) {
                // Quota exceeded — drop oldest and retry once
                if (quotaError && (quotaError.name === 'QuotaExceededError' || quotaError.code === 22)) {
                    toStore = toStore.slice(-Math.floor(MAX_REPORTS / 2));
                    serialized = JSON.stringify(toStore);
                    storage.setItem(STORAGE_KEYS.REPORTS, serialized);
                    return true;
                }
                throw quotaError;
            }
        } catch (e) {
            // Fail open: never block gameplay
            try { console.warn('FlappyK decision report could not be saved.', e); } catch (_) {}
            return false;
        }
    }

    function clearReports() {
        const storage = safeGetStorage();
        if (!storage) return false;
        try {
            storage.removeItem(STORAGE_KEYS.REPORTS);
            return true;
        } catch (e) {
            return false;
        }
    }

    // Mastery storage — minimal wrapper
    function loadMastery(fallback) {
        const storage = safeGetStorage();
        if (!storage) return fallback || null;
        try {
            const raw = storage.getItem(STORAGE_KEYS.MASTERY);
            if (!raw) return fallback || null;
            const parsed = JSON.parse(raw);
            if (!parsed || parsed.version !== VERSION) return fallback || null;
            return parsed;
        } catch (e) {
            return fallback || null;
        }
    }

    function saveMastery(state) {
        if (!state || typeof state !== 'object' || state.version !== VERSION) throw new TypeError('mastery state must have version 1');
        const storage = safeGetStorage();
        if (!storage) return false;
        try {
            storage.setItem(STORAGE_KEYS.MASTERY, JSON.stringify(state));
            return true;
        } catch (e) {
            try { console.warn('FlappyK mastery could not be saved.', e); } catch (_) {}
            return false;
        }
    }

    return {
        VERSION,
        STORAGE_KEYS,
        MAX_REPORTS,
        loadReports,
        saveReport,
        clearReports,
        loadMastery,
        saveMastery,
    };
});
