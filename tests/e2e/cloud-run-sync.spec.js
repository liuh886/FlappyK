const { test, expect } = require('@playwright/test');

function completedRun(signature = 'browser-run') {
  return {
    local_signature: signature,
    mode: 'normal',
    total_return_pct: 21.4,
    total_excess_pct: 8.6,
    games: [{ market: 'crypto' }, { market: 'ashare' }, { market: 'usstock' }],
    completed_at: '2026-08-03T10:00:00.000Z',
  };
}

async function prepareSignedInPage(page, options = {}) {
  const pending = options.pending || [];
  const cloudRuns = options.cloudRuns || [];
  const failUploads = Boolean(options.failUploads);

  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await page.route('https://raw.githubusercontent.com/**', (route) => route.abort());
  await page.route('https://html2canvas.hertzen.com/**', (route) => route.abort());
  await page.route('https://cdn.jsdelivr.net/**', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `
      function resultFor(table, builder) {
        const state = globalThis.__fakeSupabaseState;
        if (table === 'entitlements') return { data: [], error: null };
        if (table === 'profiles') {
          return { data: state.profile, error: null };
        }
        if (table === 'game_runs') {
          return { data: [...state.runs], error: null };
        }
        return { data: [], error: null };
      }

      function createBuilder(table) {
        const builder = {
          filters: [],
          select() { return this; },
          eq(key, value) { this.filters.push([key, value]); return this; },
          order() { return this; },
          limit() { return this; },
          maybeSingle() { return Promise.resolve(resultFor(table, this)); },
          upsert(payload) {
            const state = globalThis.__fakeSupabaseState;
            if (state.failUploads && table === 'game_runs') {
              return Promise.resolve({ error: new Error('simulated offline upload') });
            }
            if (table === 'game_runs') {
              const exists = state.runs.some((run) => (
                run.local_signature === payload.local_signature
                && run.user_id === payload.user_id
              ));
              if (!exists) state.runs.push({ ...payload });
            }
            if (table === 'profiles') state.profile = { ...state.profile, ...payload };
            return Promise.resolve({ error: null });
          },
          then(resolve, reject) {
            return Promise.resolve(resultFor(table, this)).then(resolve, reject);
          },
        };
        return builder;
      }

      export function createClient() {
        return {
          auth: {
            getSession: async () => ({
              data: {
                session: {
                  access_token: 'test-token',
                  user: {
                    id: 'user-1',
                    email: 'player@example.com',
                    app_metadata: { provider: 'email' },
                    user_metadata: {},
                  },
                },
              },
              error: null,
            }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
            signInWithOAuth: async () => ({ error: null }),
            signInWithOtp: async () => ({ error: null }),
            signOut: async () => ({ error: null }),
          },
          from(table) { return createBuilder(table); },
        };
      }
    `,
  }));

  await page.addInitScript(({ pendingRuns, existingRuns, shouldFail }) => {
    window.localStorage.setItem('flappyk_language_v1', 'en');
    window.localStorage.setItem('flappyk_onboarding_seen_v1', '1');
    if (pendingRuns.length) {
      window.localStorage.setItem('flappyk_pending_cloud_runs_v1', JSON.stringify(pendingRuns));
    }
    globalThis.__fakeSupabaseState = {
      failUploads: shouldFail,
      runs: existingRuns.map((run) => ({ ...run, user_id: 'user-1', product_code: 'flappyk' })),
      profile: {
        best_excess: existingRuns.length ? Math.max(...existingRuns.map((run) => run.total_excess_pct)) : null,
        runs_completed: existingRuns.length,
        markets_beaten: existingRuns.length * 3,
        updated_at: '2026-08-03T10:00:00.000Z',
      },
    };
  }, { pendingRuns: pending, existingRuns: cloudRuns, shouldFail: failUploads });
}

async function openAccount(page) {
  await expect.poll(() => page.evaluate(() => Boolean(window.FlappyKMembership?.getState?.().user))).toBe(true);
  await page.locator('.membership-launcher').click();
  await expect(page.locator('.membership-backdrop')).toBeVisible();
}

test('offline-completed run uploads once after sign-in and becomes visible cloud history', async ({ page }) => {
  await prepareSignedInPage(page, { pending: [completedRun('offline-run')] });
  await page.goto('/');
  await openAccount(page);

  const syncState = page.locator('[data-membership-sync-state]');
  await expect(syncState).toHaveText('SAVED TO CLOUD');
  await expect(page.locator('[data-membership-cloud-detail]')).toContainText('1 RUN');
  await expect(page.locator('[data-membership-cloud-detail]')).toContainText('+8.60%');

  expect(await page.evaluate(() => JSON.parse(
    localStorage.getItem('flappyk_pending_cloud_runs_v1') || '[]'
  ))).toEqual([]);
  expect(await page.evaluate(() => globalThis.__fakeSupabaseState.runs.length)).toBe(1);

  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.evaluate(() => window.FlappyKMembership.retryPendingRuns());
  expect(await page.evaluate(() => globalThis.__fakeSupabaseState.runs.length)).toBe(1);
});

test('failed upload remains local, shows retry, and recovers without blocking play', async ({ page }) => {
  await prepareSignedInPage(page, {
    pending: [completedRun('retry-run')],
    failUploads: true,
  });
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'PLAY', exact: true })).toBeVisible();
  await openAccount(page);
  await expect(page.locator('[data-membership-sync-state]')).toHaveText('RETRY NEEDED');
  await expect(page.locator('[data-membership-sync-retry]')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(
    localStorage.getItem('flappyk_pending_cloud_runs_v1') || '[]'
  ).length)).toBe(1);

  await page.evaluate(() => { globalThis.__fakeSupabaseState.failUploads = false; });
  await page.locator('[data-membership-sync-retry]').click();
  await expect(page.locator('[data-membership-sync-state]')).toHaveText('SAVED TO CLOUD');
  expect(await page.evaluate(() => JSON.parse(
    localStorage.getItem('flappyk_pending_cloud_runs_v1') || '[]'
  ))).toEqual([]);
  expect(await page.evaluate(() => globalThis.__fakeSupabaseState.runs.length)).toBe(1);
});

test('clean browser restores completed-run history from the cloud', async ({ page }) => {
  await prepareSignedInPage(page, { cloudRuns: [completedRun('cloud-only-run')] });
  await page.goto('/');
  await openAccount(page);

  expect(await page.evaluate(() => localStorage.getItem('flappyk_pending_cloud_runs_v1'))).toBeNull();
  await expect(page.locator('[data-membership-cloud-detail]')).toContainText('1 RUN');
  await expect(page.locator('[data-membership-cloud-detail]')).toContainText('+8.60%');
});
