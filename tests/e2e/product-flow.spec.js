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
          frequency: {
            value: 0,
            setValueAtTime() {},
            exponentialRampToValueAtTime() {},
          },
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

test('first launch teaches by doing, exposes Excess, and pause freezes progression', async ({ page }) => {
  await preparePage(page);
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await expect(page.getByRole('button', { name: 'PLAY', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'DAILY RUN', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /LEADERBOARD|RANKINGS/, exact: true })).toBeVisible();
  await expect(page.locator('#game-top-controls')).toBeHidden();
  await expect(page.locator('#pause-btn')).toBeHidden();

  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await expect(page.locator('#start-screen')).not.toHaveClass(/active/);
  await expect(page.locator('#onboarding-screen')).toBeHidden();
  await expect(page.locator('.game-coachmark')).toBeVisible();
  await expect(page.locator('.game-coachmark')).toHaveAttribute('data-step', 'buy');
  await expect(page.locator('.game-coachmark')).toContainText('STEP 1 · BUY');
  await expect(page.locator('#excess-meter')).toBeVisible();
  await expect(page.locator('#live-excess-display')).toHaveText(/^[+-]\d+\.\d{2}%$/);
  await expect(page.locator('html')).toHaveAttribute('data-ui-state', 'onboarding');
  await expect(page.locator('#target-return-display')).toHaveText('BEAT THE MARKET');
  await expect(page.locator('#game-top-controls')).toBeVisible();

  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#game-feedback-toast')).toContainText('BOUGHT $1K');
  await expect(page.locator('.game-coachmark')).toHaveAttribute('data-step', 'observe');
  await expect.poll(async () => page.locator('.game-coachmark').getAttribute('data-step')).toBe('sell');

  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#game-feedback-toast')).toContainText('SOLD $1K');
  await expect(page.locator('.game-coachmark')).toHaveAttribute('data-step', 'goal');
  await page.getByRole('button', { name: 'SKIP GUIDE' }).click();
  await expect(page.locator('.game-coachmark')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.FlappyKOnboarding.hasSeen())).toBe(true);
  await expect(page.locator('#desktop-speed-readout')).toHaveText('15×');
  await expect(page.locator('html')).toHaveAttribute('data-ui-state', 'playing');

  await page.locator('#pause-btn').click();
  await expect(page.locator('#pause-btn')).toHaveText('▶');
  await expect(page.locator('#pause-btn')).toHaveAttribute('aria-label', 'Resume game');
  await expect(page.locator('#pause-btn')).toHaveAttribute('aria-pressed', 'true');
  const pausedDay = Number(await page.locator('#day-display').textContent());
  await page.waitForTimeout(750);
  await expect(page.locator('#day-display')).toHaveText(String(pausedDay));
  await expect(page.locator('html')).toHaveAttribute('data-ui-state', 'paused');

  await page.locator('#pause-btn').click();
  await expect(page.locator('#pause-btn')).toHaveText('Ⅱ');
  await expect(page.locator('#pause-btn')).toHaveAttribute('aria-label', 'Pause game');
  await expect(page.locator('#pause-btn')).toHaveAttribute('aria-pressed', 'false');
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
  const localChallengeUrl = `/${new URL(challengeUrl).search}`;

  const challengePage = await context.newPage();
  await preparePage(challengePage);
  await challengePage.goto(localChallengeUrl);

  await expect(challengePage.getByRole('button', { name: 'PLAY CHALLENGE' })).toBeVisible();
  await expect(challengePage.locator('#friend-challenge-invite')).toContainText('SAME 3 HIDDEN MARKETS');
  await expect(challengePage.locator('#daily-run-btn')).toBeHidden();
  await expect(challengePage.locator('#daily-run-summary')).toBeHidden();
  await expect(challengePage.locator('#pause-btn')).toBeHidden();

  await challengePage.getByRole('button', { name: 'PLAY CHALLENGE' }).click();
  await expect.poll(() => challengePage.evaluate(() => window.FlappyKFriendChallenge.isActive())).toBe(true);
  await expect.poll(() => challengePage.evaluate(() => window.FlappyKFriendChallenge.getDescriptors().length)).toBe(3);
  await expect(challengePage.locator('#target-return-display')).toHaveText('BEAT THE MARKET');
  await expect(challengePage.locator('#pause-btn')).toBeVisible();
  await challengePage.locator('#pause-btn').click();

  const restored = await challengePage.evaluate(() => window.FlappyKFriendChallenge.getDescriptors());
  expect(restored).toEqual(descriptors);
});

test('mobile gameplay keeps virtual keys and rail-integrated navigation visible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparePage(page);
  await markOnboardingSeen(page);
  await page.goto('/');

  await expect(page.locator('#game-top-controls')).toBeHidden();
  await expect(page.locator('#pause-btn')).toBeHidden();
  await expect(page.locator('#game-back-btn')).toBeHidden();
  await expect(page.locator('#mobile-controls')).toBeHidden();

  const initialShell = await page.evaluate(() => {
    const container = document.getElementById('game-container').getBoundingClientRect();
    return {
      bodyPosition: getComputedStyle(document.body).position,
      scrollHeight: document.scrollingElement.scrollHeight,
      innerHeight: window.innerHeight,
      containerTop: container.top,
      containerHeight: container.height,
    };
  });
  expect(initialShell.bodyPosition).toBe('fixed');
  expect(initialShell.scrollHeight).toBeLessThanOrEqual(initialShell.innerHeight + 1);
  expect(Math.abs(initialShell.containerTop)).toBeLessThanOrEqual(1);
  expect(Math.abs(initialShell.containerHeight - initialShell.innerHeight)).toBeLessThanOrEqual(1);

  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await expect(page.locator('#game-hud-rail')).toBeVisible();
  await expect(page.locator('#game-top-controls')).toBeVisible();
  await expect(page.locator('#pause-btn')).toBeVisible();
  await expect(page.locator('#game-back-btn')).toBeVisible();
  await expect(page.locator('#mobile-controls')).toBeVisible();
  await expect(page.locator('#mobile-controls')).not.toHaveAttribute('hidden', '');
  await expect(page.locator('#btn-buy')).toBeVisible();
  await expect(page.locator('#btn-sell')).toBeVisible();
  await expect(page.locator('#btn-speed-down')).toBeVisible();
  await expect(page.locator('#btn-speed-up')).toBeVisible();
  await expect(page.locator('#mobile-speed-readout')).toHaveText('15×');
  await expect(page.locator('.dpad-pause')).toHaveCount(0);
  await expect(page.locator('#pause-btn')).toHaveText('Ⅱ');

  const controlsDisplay = await page.locator('#mobile-controls').evaluate((element) => getComputedStyle(element).display);
  expect(controlsDisplay).toBe('grid');

  const mobileOrder = await page.locator('#mobile-controls').evaluate((element) => Array.from(element.children).map((child) => child.id || child.className));
  expect(mobileOrder).toEqual(['btn-buy', 'mobile-speed-control', 'btn-sell']);

  const railBox = await page.locator('#game-hud-rail').boundingBox();
  const topControlsBox = await page.locator('#game-top-controls').boundingBox();
  expect(railBox).not.toBeNull();
  expect(topControlsBox).not.toBeNull();
  expect(await page.locator('#game-top-controls').evaluate((element) => element.parentElement?.id)).toBe('game-hud-rail');
  const railRight = railBox.x + railBox.width;
  const railBottom = railBox.y + railBox.height;
  const topControlsRight = topControlsBox.x + topControlsBox.width;
  const topControlsBottom = topControlsBox.y + topControlsBox.height;
  expect(topControlsBox.x).toBeGreaterThan(railBox.x + railBox.width * 0.62);
  expect(topControlsRight).toBeLessThanOrEqual(railRight + 1);
  expect(topControlsBox.y).toBeGreaterThanOrEqual(railBox.y - 1);
  expect(topControlsBottom).toBeLessThanOrEqual(railBottom + 1);

  const pauseBox = await page.locator('#pause-btn').boundingBox();
  expect(pauseBox).not.toBeNull();
  expect(pauseBox.width).toBeGreaterThanOrEqual(34);
  expect(pauseBox.height).toBeGreaterThanOrEqual(34);
  expect(pauseBox.width).toBeLessThanOrEqual(44);
  expect(pauseBox.height).toBeLessThanOrEqual(44);
  expect(Math.abs(pauseBox.width - pauseBox.height)).toBeLessThanOrEqual(3);

  await page.mouse.wheel(0, 800);
  await page.waitForTimeout(100);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  page.once('dialog', (dialog) => dialog.accept());
  await Promise.all([
    page.waitForNavigation(),
    page.locator('#game-back-btn').click(),
  ]);

  await expect(page.locator('#start-screen')).toHaveClass(/active/);
  await expect(page.locator('#game-top-controls')).toBeHidden();
  await expect(page.locator('#mobile-controls')).toBeHidden();
});
