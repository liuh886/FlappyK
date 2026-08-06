(() => {
    'use strict';

    const profileApi = window.FlappyKPlayerProfile;
    if (!profileApi) return;

    let accountState = null;
    let syncing = false;

    function localProfile() {
        return profileApi.normalizeProfile(window.FlappyKLocalProfile?.getProfile?.());
    }

    function mergeProfiles(localValue, remoteValue) {
        const local = profileApi.normalizeProfile(localValue);
        const remote = profileApi.normalizeProfile(remoteValue);
        const merged = profileApi.emptyProfile();
        const bests = [local.bestExcess, remote.bestExcess].filter(Number.isFinite);
        merged.bestExcess = bests.length ? Math.max(...bests) : null;
        merged.runsCompleted = Math.max(local.runsCompleted, remote.runsCompleted);
        merged.marketsBeaten = Math.max(local.marketsBeaten, remote.marketsBeaten);
        ['crypto', 'ashare', 'usstock'].forEach((market) => {
            const values = [local.bestByMarket?.[market], remote.bestByMarket?.[market]].filter(Number.isFinite);
            if (values.length) merged.bestByMarket[market] = Math.max(...values);
        });
        return merged;
    }

    function saveLocal(profile) {
        try {
            localStorage.setItem(profileApi.STORAGE_KEY, JSON.stringify(profileApi.normalizeProfile(profile)));
            window.FlappyKLocalProfile?.refresh?.();
        } catch (error) {
            console.warn('FlappyK cloud profile could not update local storage.', error);
        }
    }

    async function syncProfile() {
        if (syncing || !accountState?.user || !window.HaoAccount) return;
        syncing = true;
        try {
            const remote = accountState.productAccount?.state?.profile;
            const merged = mergeProfiles(localProfile(), remote);
            saveLocal(merged);
            await window.HaoAccount.saveProductData({
                productState: {
                    ...(accountState.productAccount?.state || {}),
                    profile: merged,
                    cloud_history_version: 1,
                },
            });
            const client = await window.HaoAccount.getClient();
            const { error } = await client.from('profiles').update({
                best_excess: merged.bestExcess,
                runs_completed: merged.runsCompleted,
                markets_beaten: merged.marketsBeaten,
                last_seen_at: new Date().toISOString(),
            }).eq('id', accountState.user.id);
            if (error) throw error;
        } catch (error) {
            console.warn('FlappyK personal cloud profile sync failed.', error);
        } finally {
            syncing = false;
        }
    }

    function normalizedCompletedRun(detail) {
        const score = detail?.score;
        const signature = String(detail?.signature || '').trim();
        if (!signature || !score || !Array.isArray(score.games) || score.games.length !== 3) return null;

        const totalReturn = Number(score.totalReturn);
        const totalExcess = Number(score.totalExcess ?? score.excess);
        if (!Number.isFinite(totalReturn) || !Number.isFinite(totalExcess)) return null;

        return {
            signature,
            mode: detail.mode === 'daily' ? 'daily' : 'normal',
            totalReturn,
            totalExcess,
            games: score.games,
        };
    }

    async function recordCompletedRun(detail) {
        if (!accountState?.user || !window.HaoAccount) return;
        const run = normalizedCompletedRun(detail);
        if (!run) return;

        try {
            const client = await window.HaoAccount.getClient();
            const { error } = await client.from('game_runs').upsert({
                user_id: accountState.user.id,
                product_code: 'flappyk',
                local_signature: run.signature,
                mode: run.mode,
                total_return_pct: run.totalReturn,
                total_excess_pct: run.totalExcess,
                games: run.games,
                completed_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,local_signature',
                ignoreDuplicates: true,
            });
            if (error) throw error;
            window.setTimeout(() => void syncProfile(), 0);
        } catch (error) {
            console.warn('FlappyK personal run history could not be saved.', error);
        }
    }

    window.addEventListener('hao:account-changed', (event) => {
        accountState = event.detail || null;
        if (accountState?.user) void syncProfile();
    });

    window.addEventListener('flappyk:run-completed', (event) => {
        void recordCompletedRun(event.detail);
    });

    const current = window.HaoAccount?.getState?.();
    if (current) {
        accountState = current;
        if (current.user) void syncProfile();
    }
})();
