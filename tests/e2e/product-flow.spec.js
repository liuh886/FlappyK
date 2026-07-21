const { test, expect } = require('@playwright/test');

async function preparePage(page) {
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await page.route('https://raw.githubusercontent.com/**', (route) => route.abort());
  await page.route('https://html2canvas.hertzen.com/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: 'window.html2canvas = async () => document.createElement("canvas");',
  }));

  await page.addInitScript(() => {
    class SilentAudioContext {
      constructor() {
        this.currentTime = 0;
        this.state = 'running';
        this.destination = {};
      }

      createOscillator() {
        return {
          type: 'square',
          frequency: { value: 0 },
          connect() {},
          start() {},
          stop() {},
        };
      }

      createGain() {
        return {
          gain: {
            setValueAtTime() {},
            exponentialRampToValueAtTime() {},
          },
          connect() {},
        };
      }

      resume() {
        this.state = 'running';
        return Promise.resolve();
      }
    }

    window.AudioContext = SilentAudioContext;
    window.webkitAudioContext = SilentAudioContext;
  });
}

async function markOnboardingSeen(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('flappyk_onboarding_seen_v1', '1');
  });
}

test('first launch explains the rule, starts the game, and pause freezes progression', async ({ page }) => {
  await preparePage(page);
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await expect(page.getByRole('button', { name: 'PLAY', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'DAILY RUN', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'LEADERBOARD', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await expect(page.locator('#onboarding-screen')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'BEAT THE MARKET' })).toBeVisible();
  await expect(page.locator('#onboarding-screen')).toContainText('POSITIVE EXCESS PASSES');

  await page.getByRole('button', { name: 'GOT IT · START' }).click();
  await expect(page.locator('#onboarding-screen')).toBeHidden();
  await expect(page.locator('#start-screen')).not.toHaveClass(/active/);
  await expect(page.locator('#target-return-display')).toHaveText('BEAT THE MARKET');
  await expect.poll(() => page.evaluate(() => window.FlappyKOnboarding.hasSeen())).toBe(true);

  await page.locator('#pause-btn').click();
  await expect(page.locator('#pause-btn')).toContainText('RESUME');
  const pausedDay = Number(await page.locator('#day-display').textContent());
  await page.waitForTimeout(750);
  await expect(page.locator('#day-display')).toHaveText(String(pausedDay));

  await page.locator('#pause-btn').click();
  await expect(page.locator('#pause-btn')).toContainText('PAUSE');
  await expect.poll(async () => Number(await page.locator('#day-display').textContent())).toBeGreaterThan(pausedDay);
});

test('Daily Run is deterministic and produces a restorable friend challenge link', async ({ page, context }) => {
  await preparePage(page);
  await markOnboardingSeen(page);
  await page.goto('/');

  await page.getByRole('button', { name: /DAILY RUN|REPLAY DAILY/ }).click();
  await expect.poll(() => page.evaluate(() => window.FlappyKDailyRun.isActive())).toBe(true);
  await expect.poll(() => page.evaluate(() => window.FlappyKDailyRun.getDescriptors().length)).toBe(3);
  await expect(page.locator('#target-return-display')).toHaveText('DAILY · BEAT THE MARKET');
  await page.locator('#pause-btn').click();

  const descriptors = await page.evaluate(() => window.FlappyKDailyRun.getDescriptors());
  expect(descriptors.map((descriptor) => descriptor.m)).toEqual(['crypto', 'ashare', 'usstock']);
  descriptors.forEach((descriptor) => {
    expect(descriptor.a).toBeTruthy();
    expect(descriptor.s).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  const challengeUrl = await page.evaluate(() =>
    window.FlappyKFriendChallenge.buildChallengeUrl({ excess: 12.34 })
  );
  expect(challengeUrl).toContain('?challenge=');

  const challengePage = await context.newPage();
  await preparePage(challengePage);
  await challengePage.goto(challengeUrl);

  await expect(challengePage.getByRole('button', { name: 'PLAY CHALLENGE' })).toBeVisible();
  await expect(challengePage.locator('#friend-challenge-invite')).toContainText('SAME 3 HIDDEN MARKETS');
  await expect(challengePage.locator('#daily-run-btn')).toBeHidden();
  await expect(challengePage.locator('#daily-run-summary')).toBeHidden();

  await challengePage.getByRole('button', { name: 'PLAY CHALLENGE' }).click();
  await expect.poll(() => challengePage.evaluate(() => window.FlappyKFriendChallenge.isActive())).toBe(true);
  await expect.poll(() => challengePage.evaluate(() => window.FlappyKFriendChallenge.getDescriptors().length)).toBe(3);
  await expect(challengePage.locator('#target-return-display')).toHaveText('BEAT THE MARKET');
  await challengePage.locator('#pause-btn').click();

  const restored = await challengePage.evaluate(() => window.FlappyKFriendChallenge.getDescriptors());
  expect(restored).toEqual(descriptors);
});
