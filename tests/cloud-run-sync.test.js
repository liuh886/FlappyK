const assert = require('node:assert/strict');
const { create, normalizeRuns } = require('../scripts/cloud-run-sync-core.js');

function memoryStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        dump(key) { return JSON.parse(values.get(key) || '[]'); },
    };
}

function run(signature) {
    return {
        local_signature: signature,
        mode: 'normal',
        total_return_pct: 5,
        total_excess_pct: 2,
        games: [{}, {}, {}],
        completed_at: '2026-08-03T00:00:00.000Z',
    };
}

(async () => {
    assert.deepEqual(
        normalizeRuns([run('a'), run('a'), run('b')], 25).map((item) => item.local_signature),
        ['a', 'b'],
    );

    const states = [];
    const storage = memoryStorage();
    const uploaded = [];
    const queue = create({
        storage,
        upload: async (item) => uploaded.push(item.local_signature),
        onState: (state) => states.push(state.status),
        now: () => '2026-08-03T10:00:00.000Z',
    });

    assert.equal(queue.snapshot().status, 'local');
    queue.queue(run('a'));
    queue.queue(run('a'));
    assert.equal(queue.snapshot().status, 'queued');
    assert.equal(queue.snapshot().queued, 1);
    assert.equal(storage.dump('flappyk_pending_cloud_runs_v1').length, 1);

    const saved = await queue.flush('sign-in');
    assert.equal(saved.status, 'saved');
    assert.equal(saved.saved, 1);
    assert.equal(saved.queued, 0);
    assert.deepEqual(uploaded, ['a']);
    assert.ok(states.includes('syncing'));
    assert.ok(states.includes('saved'));

    let attempts = 0;
    const retryStorage = memoryStorage();
    const retryQueue = create({
        storage: retryStorage,
        upload: async () => {
            attempts += 1;
            if (attempts === 1) throw new Error('offline');
        },
    });
    retryQueue.queue(run('retry-me'));
    const failed = await retryQueue.flush('automatic');
    assert.equal(failed.status, 'retry');
    assert.equal(failed.failed, 1);
    assert.equal(failed.queued, 1);
    assert.equal(retryStorage.dump('flappyk_pending_cloud_runs_v1').length, 1);

    const recovered = await retryQueue.retry();
    assert.equal(recovered.status, 'saved');
    assert.equal(recovered.queued, 0);
    assert.equal(attempts, 2);

    let releaseUpload;
    let concurrentUploads = 0;
    const concurrentQueue = create({
        storage: memoryStorage(),
        upload: () => {
            concurrentUploads += 1;
            return new Promise((resolve) => { releaseUpload = resolve; });
        },
    });
    concurrentQueue.queue(run('once'));
    const firstFlush = concurrentQueue.flush('login');
    const secondFlush = concurrentQueue.flush('online');
    assert.equal(firstFlush, secondFlush);
    releaseUpload();
    await Promise.all([firstFlush, secondFlush]);
    assert.equal(concurrentUploads, 1);

    const unavailableStorage = {
        getItem() { throw new Error('blocked'); },
        setItem() { throw new Error('blocked'); },
    };
    const nonBlocking = create({ storage: unavailableStorage, upload: async () => {} });
    assert.doesNotThrow(() => nonBlocking.queue(run('local-only')));
    assert.equal(nonBlocking.snapshot().status, 'queued');

    console.log('Cloud-run local, queued, syncing, saved, retry, dedupe, and concurrency checks passed');
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
