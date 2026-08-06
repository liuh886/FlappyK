const { test, expect } = require('@playwright/test');
const { mockSharedAccount } = require('./account-fixture');

async function prepareCore(page) {
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await page.route('https://raw.githubusercontent.com/**', (route) => route.abort());
  await page.route('https://html2canvas.hertzen.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    window.localStorage.setItem('flappyk_language_v1', 'en');
    window.localStorage.setItem('flappyk_onboarding_seen_v1', '1');
  });
}

test('account asset failure never blocks guest play', async ({ page }) => {
  await prepareCore(page);
  await mockSharedAccount(page, { failAccountAssets: true });
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'PLAY', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await expect(page.locator('#start-screen')).not.toHaveClass(/active/);
});

test('signed-in account merges remote personal bests without reducing local history', async ({ page }) => {
  await prepareCore(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('flappyk_player_profile_v1', JSON.stringify({
      bestExcess: 4.2,
      runsCompleted: 1,
      marketsBeaten: 3,
      bestByMarket: { crypto: 4.2 },
    }));
  });
  await mockSharedAccount(page, {
    signedIn: true,
    remoteProfile: {
      bestExcess: 8.6,
      runsCompleted: 3,
      marketsBeaten: 9,
      bestByMarket: { crypto: 6.1, ashare: 8.6 },
    },
  });
  await page.goto('/');

  await expect.poll(() => page.evaluate(() => globalThis.__fakeAccountState?.productSaves.length || 0)).toBeGreaterThan(0);
  const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('flappyk_player_profile_v1')));
  expect(profile.bestExcess).toBe(8.6);
  expect(profile.runsCompleted).toBe(3);
  expect(profile.marketsBeaten).toBe(9);
  expect(profile.bestByMarket.crypto).toBe(6.1);
  expect(profile.bestByMarket.ashare).toBe(8.6);
  await expect(page.locator('#personal-profile-summary')).toContainText('8.60%');
});

test('completed personal run is written once by user and signature', async ({ page }) => {
  await prepareCore(page);
  await mockSharedAccount(page, { signedIn: true });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => Boolean(window.HaoAccount?.getState?.().user))).toBe(true);

  const completed = {
    signature: 'verified-local-signature',
    mode: 'normal',
    score: {
      excess: 8.6,
      totalReturn: 21.4,
      games: [{ market: 'crypto' }, { market: 'ashare' }, { market: 'usstock' }],
    },
  };
  await page.evaluate((detail) => {
    window.dispatchEvent(new CustomEvent('flappyk:run-completed', { detail }));
    window.dispatchEvent(new CustomEvent('flappyk:run-completed', { detail }));
  }, completed);

  await expect.poll(() => page.evaluate(() => globalThis.__fakeAccountState?.runs.length || 0)).toBe(1);
  const run = await page.evaluate(() => globalThis.__fakeAccountState.runs[0]);
  expect(run.user_id).toBe('user-1');
  expect(run.product_code).toBe('flappyk');
  expect(run.local_signature).toBe('verified-local-signature');
  expect(run.total_excess_pct).toBe(8.6);
  expect(run.games).toHaveLength(3);
});
