(() => {
    'use strict';

    const config = window.FlappyKMembershipConfig || {};
    const entitlementCode = config.entitlementCode || 'flappyk.pro';
    const pendingRunsKey = 'flappyk_pending_cloud_runs_v1';
    const configured = Boolean(
        config.enabled
        && config.supabaseUrl
        && config.supabasePublishableKey
    );

    const state = {
        configured,
        loading: false,
        client: null,
        user: null,
        entitlements: new Set(),
        lastError: '',
    };

    let ui = null;

    function getCopy() {
        const isChinese = document.documentElement.dataset.flappykLanguage === 'zh'
            || document.documentElement.lang.toLowerCase().startsWith('zh');
        return isChinese
            ? {
                launcherGuest: '账户',
                launcherFree: 'FREE',
                launcherPro: 'PRO',
                kicker: '可选账户',
                title: 'FLAPPYK 账户',
                guestCopy: '无需登录即可继续游戏。登录后可同步成绩，并在会员上线后恢复 Pro 权益。',
                google: '使用 GOOGLE 登录',
                emailPlaceholder: '邮箱地址',
                emailSubmit: '发送登录链接',
                signedInCopy: '本地游戏记录仍保留在浏览器；新完成的整局成绩会同步到你的账户。',
                free: 'FREE PLAYER',
                pro: 'FLAPPYK PRO',
                upgrade: '升级到 PRO',
                manage: '管理订阅',
                signOut: '退出登录',
                close: '关闭账户窗口',
                busy: '正在处理…',
                emailSent: '登录链接已发送，请检查邮箱。',
                signedIn: '登录成功，正在同步本地记录。',
                signedOut: '已退出登录。游客游戏不受影响。',
                unavailable: '账户服务暂时不可用，游客游戏仍可正常使用。',
                invalidEmail: '请输入有效邮箱地址。',
            }
            : {
                launcherGuest: 'ACCOUNT',
                launcherFree: 'FREE',
                launcherPro: 'PRO',
                kicker: 'OPTIONAL ACCOUNT',
                title: 'FLAPPYK ACCOUNT',
                guestCopy: 'Keep playing without an account. Sign in to sync completed runs and restore Pro access when subscriptions go live.',
                google: 'CONTINUE WITH GOOGLE',
                emailPlaceholder: 'Email address',
                emailSubmit: 'EMAIL SIGN-IN LINK',
                signedInCopy: 'Local records remain in this browser. Newly completed runs are also synced to your account.',
                free: 'FREE PLAYER',
                pro: 'FLAPPYK PRO',
                upgrade: 'UPGRADE TO PRO',
                manage: 'MANAGE SUBSCRIPTION',
                signOut: 'SIGN OUT',
                close: 'Close account dialog',
                busy: 'Working…',
                emailSent: 'Sign-in link sent. Check your email.',
                signedIn: 'Signed in. Syncing local records.',
                signedOut: 'Signed out. Guest play is unchanged.',
                unavailable: 'Account service is unavailable. Guest play still works.',
                invalidEmail: 'Enter a valid email address.',
            };
    }

    function snapshot() {
        return Object.freeze({
            configured: state.configured,
            loading: state.loading,
            user: state.user,
            entitlements: [...state.entitlements],
            isPro: state.entitlements.has(entitlementCode),
            lastError: state.lastError,
        });
    }

    function can(code) {
        return state.entitlements.has(String(code || ''));
    }

    function track(eventName, parameters = {}) {
        window.FlappyKAnalytics?.track?.(eventName, {
            account_state: state.user ? 'signed_in' : 'guest',
            membership_tier: can(entitlementCode) ? 'pro' : 'free',
            ...parameters,
        });
    }

    function setStatus(message = '', kind = '') {
        if (!ui) return;
        ui.status.textContent = message;
        ui.status.dataset.kind = kind;
    }

    function setLoading(value) {
        state.loading = Boolean(value);
        render();
    }

    function render() {
        if (!ui) return;
        const copy = getCopy();
        const isSignedIn = Boolean(state.user);
        const isPro = can(entitlementCode);

        ui.launcher.textContent = isPro
            ? copy.launcherPro
            : isSignedIn ? copy.launcherFree : copy.launcherGuest;
        ui.launcher.dataset.tier = isPro ? 'pro' : 'free';
        ui.kicker.textContent = copy.kicker;
        ui.title.textContent = copy.title;
        ui.close.setAttribute('aria-label', copy.close);
        ui.guest.hidden = isSignedIn;
        ui.account.hidden = !isSignedIn;
        ui.guestCopy.textContent = copy.guestCopy;
        ui.google.textContent = state.loading ? copy.busy : copy.google;
        ui.email.placeholder = copy.emailPlaceholder;
        ui.emailSubmit.textContent = state.loading ? copy.busy : copy.emailSubmit;
        ui.accountCopy.textContent = copy.signedInCopy;
        ui.tier.textContent = isPro ? copy.pro : copy.free;
        ui.tier.dataset.tier = isPro ? 'pro' : 'free';
        ui.accountMeta.textContent = state.user?.email || state.user?.id || '';
        ui.upgrade.textContent = state.loading ? copy.busy : copy.upgrade;
        ui.manage.textContent = state.loading ? copy.busy : copy.manage;
        ui.signOut.textContent = state.loading ? copy.busy : copy.signOut;
        ui.upgrade.hidden = isPro || !config.checkoutFunctionUrl;
        ui.manage.hidden = !isPro || !config.portalFunctionUrl;
        [ui.google, ui.email, ui.emailSubmit, ui.upgrade, ui.manage, ui.signOut]
            .forEach((element) => { element.disabled = state.loading; });
    }

    function closeDialog() {
        if (!ui) return;
        ui.backdrop.hidden = true;
        document.body.classList.remove('membership-open');
        ui.launcher.focus();
    }

    function openDialog() {
        if (!ui) return;
        render();
        ui.backdrop.hidden = false;
        document.body.classList.add('membership-open');
        setStatus('');
        track('account_opened');
        window.setTimeout(() => (state.user ? ui.signOut : ui.google).focus(), 0);
    }

    function createUi() {
        const launcher = document.createElement('button');
        launcher.type = 'button';
        launcher.className = 'membership-launcher';
        launcher.dataset.tier = 'free';

        const backdrop = document.createElement('div');
        backdrop.className = 'membership-backdrop';
        backdrop.hidden = true;
        backdrop.innerHTML = `
            <section class="membership-dialog" role="dialog" aria-modal="true" aria-labelledby="membership-title">
                <header class="membership-dialog-header">
                    <div>
                        <p class="membership-kicker" data-membership-kicker></p>
                        <h2 id="membership-title" data-membership-title></h2>
                    </div>
                    <button type="button" class="membership-close" data-membership-close>×</button>
                </header>
                <div data-membership-guest>
                    <p class="membership-copy" data-membership-guest-copy></p>
                    <div class="membership-actions">
                        <button type="button" class="membership-primary" data-membership-google></button>
                        <form class="membership-email-form" data-membership-email-form>
                            <input type="email" autocomplete="email" required data-membership-email>
                            <button type="submit" data-membership-email-submit></button>
                        </form>
                    </div>
                </div>
                <div data-membership-account hidden>
                    <div class="membership-account-card">
                        <span class="membership-tier" data-membership-tier></span>
                        <p class="membership-account-meta" data-membership-account-meta></p>
                    </div>
                    <p class="membership-copy" data-membership-account-copy></p>
                    <div class="membership-actions">
                        <button type="button" class="membership-primary" data-membership-upgrade></button>
                        <button type="button" data-membership-manage></button>
                        <button type="button" data-membership-sign-out></button>
                    </div>
                </div>
                <p class="membership-status" role="status" aria-live="polite" data-membership-status></p>
            </section>`;

        document.body.append(launcher, backdrop);

        ui = {
            launcher,
            backdrop,
            kicker: backdrop.querySelector('[data-membership-kicker]'),
            title: backdrop.querySelector('[data-membership-title]'),
            close: backdrop.querySelector('[data-membership-close]'),
            guest: backdrop.querySelector('[data-membership-guest]'),
            guestCopy: backdrop.querySelector('[data-membership-guest-copy]'),
            google: backdrop.querySelector('[data-membership-google]'),
            emailForm: backdrop.querySelector('[data-membership-email-form]'),
            email: backdrop.querySelector('[data-membership-email]'),
            emailSubmit: backdrop.querySelector('[data-membership-email-submit]'),
            account: backdrop.querySelector('[data-membership-account]'),
            tier: backdrop.querySelector('[data-membership-tier]'),
            accountMeta: backdrop.querySelector('[data-membership-account-meta]'),
            accountCopy: backdrop.querySelector('[data-membership-account-copy]'),
            upgrade: backdrop.querySelector('[data-membership-upgrade]'),
            manage: backdrop.querySelector('[data-membership-manage]'),
            signOut: backdrop.querySelector('[data-membership-sign-out]'),
            status: backdrop.querySelector('[data-membership-status]'),
        };

        launcher.addEventListener('click', openDialog);
        ui.close.addEventListener('click', closeDialog);
        backdrop.addEventListener('click', (event) => {
            if (event.target === backdrop) closeDialog();
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !backdrop.hidden) closeDialog();
        });
        ui.google.addEventListener('click', () => void signInWithGoogle());
        ui.emailForm.addEventListener('submit', (event) => {
            event.preventDefault();
            void signInWithEmail(ui.email.value);
        });
        ui.signOut.addEventListener('click', () => void signOut());
        ui.upgrade.addEventListener('click', () => void startCheckout());
        ui.manage.addEventListener('click', () => void openPortal());
        render();
    }

    async function getClient() {
        if (state.client) return state.client;
        const module = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
        state.client = module.createClient(
            config.supabaseUrl,
            config.supabasePublishableKey,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true,
                    flowType: 'pkce',
                },
            }
        );
        return state.client;
    }

    function readPendingRuns() {
        try {
            const value = JSON.parse(window.localStorage.getItem(pendingRunsKey) || '[]');
            return Array.isArray(value) ? value.slice(-25) : [];
        } catch {
            return [];
        }
    }

    function writePendingRuns(runs) {
        try {
            window.localStorage.setItem(pendingRunsKey, JSON.stringify(runs.slice(-25)));
        } catch (error) {
            console.warn('FlappyK cloud queue could not be saved.', error);
        }
    }

    function normalizeCompletedRun(detail) {
        const signature = String(detail?.signature || '');
        const score = detail?.score;
        if (!signature
            || !Number.isFinite(Number(score?.excess))
            || !Number.isFinite(Number(score?.totalReturn))
            || !Array.isArray(score?.games)
            || score.games.length !== 3) return null;

        return {
            local_signature: signature.slice(0, 500),
            mode: String(detail?.mode || 'normal').slice(0, 32),
            total_return_pct: Number(Number(score.totalReturn).toFixed(6)),
            total_excess_pct: Number(Number(score.excess).toFixed(6)),
            games: score.games,
            completed_at: new Date().toISOString(),
        };
    }

    function queueCompletedRun(detail) {
        const run = normalizeCompletedRun(detail);
        if (!run) return;
        const current = readPendingRuns().filter((item) => item.local_signature !== run.local_signature);
        current.push(run);
        writePendingRuns(current);
        if (state.user) void flushPendingRuns();
    }

    async function syncLocalProfile() {
        if (!state.user || !state.client) return;
        const profile = window.FlappyKLocalProfile?.getProfile?.();
        if (!profile) return;

        const payload = {
            id: state.user.id,
            display_name: state.user.user_metadata?.full_name
                || state.user.user_metadata?.name
                || null,
            best_excess: Number.isFinite(Number(profile.bestExcess))
                ? Number(profile.bestExcess)
                : null,
            runs_completed: Math.max(0, Number(profile.runsCompleted) || 0),
            markets_beaten: Math.max(0, Number(profile.marketsBeaten) || 0),
            updated_at: new Date().toISOString(),
        };
        const { error } = await state.client.from('profiles').upsert(payload, { onConflict: 'id' });
        if (error) throw error;
    }

    async function flushPendingRuns() {
        if (!state.user || !state.client) return;
        const pending = readPendingRuns();
        if (pending.length === 0) return;

        const remaining = [];
        for (const run of pending) {
            const { error } = await state.client.from('game_runs').upsert({
                ...run,
                user_id: state.user.id,
                product_code: 'flappyk',
            }, {
                onConflict: 'user_id,local_signature',
                ignoreDuplicates: true,
            });
            if (error) remaining.push(run);
        }
        writePendingRuns(remaining);
    }

    async function refreshEntitlements() {
        state.entitlements = new Set();
        if (!state.user || !state.client) {
            render();
            return;
        }

        const { data, error } = await state.client
            .from('entitlements')
            .select('entitlement_code,active,valid_until')
            .eq('user_id', state.user.id);
        if (error) throw error;

        const now = Date.now();
        (data || []).forEach((row) => {
            const validUntil = row.valid_until ? new Date(row.valid_until).getTime() : null;
            if (row.active && (!validUntil || validUntil > now)) {
                state.entitlements.add(row.entitlement_code);
            }
        });
        render();
    }

    async function handleSession(session) {
        const previousUserId = state.user?.id || null;
        state.user = session?.user || null;
        state.lastError = '';
        if (!state.user) {
            state.entitlements = new Set();
            render();
            return;
        }

        try {
            await Promise.all([
                refreshEntitlements(),
                syncLocalProfile(),
                flushPendingRuns(),
            ]);
            if (previousUserId !== state.user.id) {
                setStatus(getCopy().signedIn, 'success');
                track('sign_in_completed', { sign_in_provider: state.user.app_metadata?.provider || 'unknown' });
            }
        } catch (error) {
            state.lastError = error?.message || String(error);
            console.warn('FlappyK account sync failed.', error);
            setStatus(getCopy().unavailable, 'error');
        }
        render();
    }

    async function signInWithGoogle() {
        setLoading(true);
        setStatus('');
        track('sign_in_started', { sign_in_provider: 'google' });
        try {
            const client = await getClient();
            const { error } = await client.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: config.redirectUrl || window.location.href },
            });
            if (error) throw error;
        } catch (error) {
            state.lastError = error?.message || String(error);
            setStatus(getCopy().unavailable, 'error');
            setLoading(false);
        }
    }

    async function signInWithEmail(value) {
        const email = String(value || '').trim();
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            setStatus(getCopy().invalidEmail, 'error');
            return;
        }

        setLoading(true);
        setStatus('');
        track('sign_in_started', { sign_in_provider: 'email' });
        try {
            const client = await getClient();
            const { error } = await client.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: config.redirectUrl || window.location.href,
                    shouldCreateUser: true,
                },
            });
            if (error) throw error;
            setStatus(getCopy().emailSent, 'success');
        } catch (error) {
            state.lastError = error?.message || String(error);
            setStatus(getCopy().unavailable, 'error');
        } finally {
            setLoading(false);
        }
    }

    async function signOut() {
        setLoading(true);
        try {
            const client = await getClient();
            const { error } = await client.auth.signOut();
            if (error) throw error;
            state.user = null;
            state.entitlements = new Set();
            setStatus(getCopy().signedOut, 'success');
            track('sign_out_completed');
        } catch (error) {
            state.lastError = error?.message || String(error);
            setStatus(getCopy().unavailable, 'error');
        } finally {
            setLoading(false);
        }
    }

    async function callMembershipFunction(url) {
        if (!url || !state.user) return;
        setLoading(true);
        try {
            const client = await getClient();
            const { data: sessionData } = await client.auth.getSession();
            const token = sessionData.session?.access_token;
            if (!token) throw new Error('Authentication session is unavailable');

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    product_code: entitlementCode,
                    return_url: config.redirectUrl || window.location.href,
                }),
            });
            if (!response.ok) throw new Error(`Membership request failed (${response.status})`);
            const payload = await response.json();
            if (!payload?.url) throw new Error('Membership URL was not returned');
            window.location.assign(payload.url);
        } catch (error) {
            state.lastError = error?.message || String(error);
            setStatus(getCopy().unavailable, 'error');
            setLoading(false);
        }
    }

    async function startCheckout() {
        track('upgrade_clicked', { entitlement_code: entitlementCode });
        await callMembershipFunction(config.checkoutFunctionUrl);
    }

    async function openPortal() {
        track('subscription_manage_clicked', { entitlement_code: entitlementCode });
        await callMembershipFunction(config.portalFunctionUrl);
    }

    async function initialise() {
        createUi();
        setLoading(true);
        try {
            const client = await getClient();
            const { data, error } = await client.auth.getSession();
            if (error) throw error;
            await handleSession(data.session);
            client.auth.onAuthStateChange((_event, session) => {
                window.setTimeout(() => void handleSession(session), 0);
            });
        } catch (error) {
            state.lastError = error?.message || String(error);
            console.warn('FlappyK membership could not initialise.', error);
            setStatus(getCopy().unavailable, 'error');
        } finally {
            setLoading(false);
        }
    }

    window.FlappyKMembership = {
        isConfigured: () => state.configured,
        getState: snapshot,
        can,
        open: openDialog,
        refresh: async () => {
            if (!configured) return snapshot();
            await refreshEntitlements();
            return snapshot();
        },
        queueCompletedRun,
    };

    window.addEventListener('flappyk:run-completed', (event) => {
        queueCompletedRun(event.detail);
    });

    if (configured) void initialise();
})();
