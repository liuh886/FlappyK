(function exposeCloudRunSync(root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    if (root) root.FlappyKCloudRunSyncCore = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
    'use strict';

    const VALID_STATES = new Set(['local', 'queued', 'syncing', 'saved', 'retry']);

    function normalizeRuns(value, limit) {
        if (!Array.isArray(value)) return [];
        const bySignature = new Map();
        value.forEach((run) => {
            const signature = String(run?.local_signature || '');
            if (!signature) return;
            bySignature.set(signature, run);
        });
        return [...bySignature.values()].slice(-limit);
    }

    function create(options = {}) {
        const storage = options.storage;
        const storageKey = String(options.storageKey || 'flappyk_pending_cloud_runs_v1');
        const limit = Math.max(1, Number(options.limit) || 25);
        const upload = typeof options.upload === 'function'
            ? options.upload
            : async () => { throw new Error('Cloud upload is not configured'); };
        const onState = typeof options.onState === 'function' ? options.onState : () => {};
        const now = typeof options.now === 'function' ? options.now : () => new Date().toISOString();

        let inflight = null;
        let memoryRuns = [];
        let storageReadable = Boolean(storage?.getItem);
        let storageWritable = Boolean(storage?.setItem);
        let state = {
            status: 'local',
            queued: 0,
            saved: 0,
            failed: 0,
            lastAttemptAt: null,
            lastError: '',
        };

        function snapshot() {
            return Object.freeze({ ...state });
        }

        function emit(next) {
            const status = VALID_STATES.has(next.status) ? next.status : state.status;
            state = { ...state, ...next, status };
            onState(snapshot());
            return snapshot();
        }

        function read() {
            if (storageReadable) {
                try {
                    memoryRuns = normalizeRuns(JSON.parse(storage.getItem(storageKey) || '[]'), limit);
                } catch {
                    storageReadable = false;
                }
            }
            return normalizeRuns(memoryRuns, limit);
        }

        function write(runs) {
            memoryRuns = normalizeRuns(runs, limit);
            if (storageWritable) {
                try {
                    storage.setItem(storageKey, JSON.stringify(memoryRuns));
                } catch {
                    storageWritable = false;
                }
            }
            return [...memoryRuns];
        }

        function refreshState(preferredStatus = null) {
            const queued = read().length;
            const status = preferredStatus || (queued > 0 ? 'queued' : 'local');
            return emit({ status, queued });
        }

        function queue(run) {
            const signature = String(run?.local_signature || '');
            if (!signature) return snapshot();
            const pending = read().filter((item) => item.local_signature !== signature);
            pending.push(run);
            const saved = write(pending);
            return emit({
                status: 'queued',
                queued: saved.length,
                failed: 0,
                lastError: '',
            });
        }

        async function executeFlush(reason = 'automatic') {
            const pending = read();
            if (pending.length === 0) {
                return emit({
                    status: 'saved',
                    queued: 0,
                    saved: 0,
                    failed: 0,
                    lastAttemptAt: now(),
                    lastError: '',
                    reason,
                });
            }

            emit({
                status: 'syncing',
                queued: pending.length,
                saved: 0,
                failed: 0,
                lastAttemptAt: now(),
                lastError: '',
                reason,
            });

            const remaining = [];
            let savedCount = 0;
            let lastError = '';

            for (const run of pending) {
                try {
                    await upload(run);
                    savedCount += 1;
                } catch (error) {
                    remaining.push(run);
                    lastError = error?.message || String(error);
                }
            }

            write(remaining);
            return emit({
                status: remaining.length > 0 ? 'retry' : 'saved',
                queued: remaining.length,
                saved: savedCount,
                failed: remaining.length,
                lastAttemptAt: now(),
                lastError,
                reason,
            });
        }

        function flush(reason = 'automatic') {
            if (inflight) return inflight;
            inflight = executeFlush(reason).finally(() => {
                inflight = null;
            });
            return inflight;
        }

        refreshState();

        return Object.freeze({
            read,
            queue,
            flush,
            retry: () => flush('manual-retry'),
            refresh: () => refreshState(),
            snapshot,
        });
    }

    return { create, normalizeRuns };
});
