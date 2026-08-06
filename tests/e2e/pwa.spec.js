const { test, expect } = require('@playwright/test');

async function preparePage(page) {
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await page.route('https://raw.githubusercontent.com/**', (route) => route.abort());
  await page.route('https://html2canvas.hertzen.com/**', (route) => route.abort());
  await page.route('https://cdn.jsdelivr.net/**', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `
      export function createClient() {
        return {
          auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
            signInWithOAuth: async () => ({ error: null }),
            signInWithOtp: async () => ({ error: null }),
            signOut: async () => ({ error: null })
          },
          from() {
            return {
              select() {
                return {
                  eq: async () => ({ data: [], error: null })
                };
              },
              upsert: async () => ({ error: null })
            };
          }
        };
      }
    `,
  }));
  await page.addInitScript(() => {
    window.localStorage.setItem('flappyk_language_v1', 'en');
    window.localStorage.setItem('flappyk_onboarding_seen_v1', '1');

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

async function showCompletedRunScreen(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.screen.active').forEach((screen) => screen.classList.remove('active'));
    document.getElementById('champagne-screen').classList.add('active');
  });
}

test('PWA registers, controls the page, and reloads offline', async ({ page, context }) => {
  await preparePage(page);
  await page.goto('/');

  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', 'manifest.webmanifest');
  const registration = await page.evaluate(async () => {
    const ready = await navigator.serviceWorker.ready;
    return { scope: ready.scope, active: Boolean(ready.active) };
  });
  expect(registration.active).toBe(true);
  expect(registration.scope).toContain('127.0.0.1:8000/');

  await page.reload();
  await expect.poll(
    () => page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    { timeout: 20_000 }
  ).toBe(true);

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'PLAY', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (
    typeof stockData !== 'undefined'
      ? Object.keys(stockData.crypto || {}).length
      : 0
  ))).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await expect(page.locator('#start-screen')).not.toHaveClass(/active/);
  await expect(page.locator('#target-return-display')).toHaveText('BEAT THE MARKET');
  await expect.poll(() => page.evaluate(() => (
    typeof currentData !== 'undefined' && Array.isArray(currentData)
      ? currentData.length
      : 0
  ))).toBe(250);
  await expect.poll(() => page.evaluate(() => (
    typeof isPlaying !== 'undefined' ? isPlaying : false
  ))).toBe(true);

  await context.setOffline(false);
});

test('install prompt exposes a home-screen install action', async ({ page }) => {
  await preparePage(page);
  await page.goto('/');

  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.defineProperty(event, 'prompt', {
      value: () => Promise.resolve(),
    });
    Object.defineProperty(event, 'userChoice', {
      value: Promise.resolve({ outcome: 'dismissed', platform: 'web' }),
    });
    window.dispatchEvent(event);
  });

  const installButton = page.locator('#pwa-install-btn');
  await expect(installButton).toBeVisible();
  await expect(installButton).toHaveText('INSTALL APP');
  await expect(installButton).toHaveAttribute('aria-label', 'Install the FlappyK app');
  await installButton.click();
  await expect(installButton).toHaveAttribute('data-ready', 'true');
});

test('account stays right-most inside the handheld and completed runs prompt sign-in', async ({ page }) => {
  await preparePage(page);
  await page.goto('/');

  await expect.poll(() => page.evaluate(() => Boolean(window.FlappyKMembershipExperience))).toBe(true);
  expect(await page.evaluate(() => window.FlappyKMembership.isConfigured())).toBe(true);

  const utilityBar = page.locator('#home-utility-bar');
  const accountButton = utilityBar.locator('.membership-launcher');
  const languageButton = utilityBar.locator('#language-toggle-btn');
  await expect(utilityBar).toBeVisible();
  await expect(utilityBar).toHaveAttribute('data-arcade-placement', 'console');
  await expect(accountButton.locator('.membership-launcher-label')).toHaveText('ACCOUNT');
  await expect(accountButton.locator('.membership-launcher-tier')).toBeHidden();
  await expect(languageButton).toHaveText('中文');

  const positions = await page.evaluate(() => {
    const container = document.getElementById('game-container').getBoundingClientRect();
    const bezel = document.querySelector('.home-console-bezel').getBoundingClientRect();
    const utilityElement = document.getElementById('home-utility-bar');
    const utility = utilityElement.getBoundingClientRect();
    const account = document.querySelector('.membership-launcher').getBoundingClientRect();
    const language = document.getElementById('language-toggle-btn').getBoundingClientRect();
    return {
      parentClass: utilityElement.parentElement?.className,
      placement: utilityElement.dataset.arcadePlacement,
      childOrder: Array.from(utilityElement.children).map((element) => (
        element.id || element.className
      )),
      accountLeft: account.left,
      accountRight: account.right,
      languageLeft: language.left,
      topDelta: Math.abs(account.top - language.top),
      insideContainer: utility.left >= container.left && utility.right <= container.right && utility.top >= container.top,
      insideBezel: utility.left >= bezel.left && utility.right <= bezel.right && utility.top >= bezel.top,
    };
  });
  expect(positions.parentClass).toContain('home-console-topline');
  expect(positions.placement).toBe('console');
  expect(positions.childOrder).toEqual(['language-toggle-btn', 'membership-launcher']);
  expect(positions.languageLeft).toBeLessThan(positions.accountLeft);
  expect(positions.accountRight).toBeGreaterThan(positions.languageLeft);
  expect(positions.topDelta).toBeLessThan(2);
  expect(positions.insideContainer).toBe(true);
  expect(positions.insideBezel).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('flappyk_pending_cloud_runs_v1'))).toBeNull();

  await showCompletedRunScreen(page);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('flappyk:run-completed', {
      detail: {
        signature: 'e2e-completed-run',
        mode: 'normal',
        score: {
          excess: 8.6,
          totalReturn: 21.4,
          games: [{}, {}, {}],
        },
      },
    }));
  });

  const resultPrompt = page.locator('#membership-result-prompt');
  await expect(resultPrompt).toBeVisible();
  await expect(resultPrompt).toHaveAttribute('data-state', 'guest');
  await expect(resultPrompt.getByRole('heading')).toHaveText('Sign in to keep this result');
  await expect(resultPrompt.getByRole('button')).toHaveText('SIGN IN & SAVE RESULT');
  expect(await page.evaluate(() => JSON.parse(
    localStorage.getItem('flappyk_pending_cloud_runs_v1') || '[]'
  ).length)).toBe(1);

  await resultPrompt.getByRole('button').click();
  await expect(page.locator('.membership-backdrop')).toBeVisible();
});

test('Chinese desktop UI uses one compact, consistent typeface without a repeated goal row', async ({ page }) => {
  await preparePage(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('flappyk_language_v1', 'zh');
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect.poll(() => page.evaluate(() => Boolean(window.FlappyKMembershipExperience))).toBe(true);

  const typography = await page.evaluate(() => {
    const stats = getComputedStyle(document.querySelector('.stats-box'));
    const intro = getComputedStyle(document.querySelector('#start-screen > p'));
    const playButton = getComputedStyle(document.getElementById('start-btn'));
    const accountButton = getComputedStyle(document.querySelector('.membership-launcher'));
    const goalRow = document.getElementById('target-return-display').parentElement;
    return {
      statsSize: stats.fontSize,
      statsFamily: stats.fontFamily,
      introSize: intro.fontSize,
      introLineHeight: intro.lineHeight,
      introFamily: intro.fontFamily,
      buttonFamily: playButton.fontFamily,
      accountFamily: accountButton.fontFamily,
      goalRowDisplay: getComputedStyle(goalRow).display,
    };
  });

  expect(Number.parseFloat(typography.statsSize)).toBeGreaterThanOrEqual(12);
  expect(typography.introSize).toBe('17px');
  expect(Number.parseFloat(typography.introLineHeight)).toBeGreaterThanOrEqual(28);
  expect(typography.statsFamily).toContain('ZCOOL QingKe HuangYou');
  expect(typography.introFamily).toBe(typography.statsFamily);
  expect(typography.buttonFamily).toBe(typography.statsFamily);
  expect(typography.accountFamily).toBe(typography.statsFamily);
  expect(typography.goalRowDisplay).toBe('none');

  await showCompletedRunScreen(page);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('flappyk:run-completed', {
      detail: {
        signature: 'e2e-zh-run',
        mode: 'normal',
        score: {
          excess: 5.2,
          totalReturn: 18.1,
          games: [{}, {}, {}],
        },
      },
    }));
  });
  await expect(page.locator('#membership-result-prompt')).toBeVisible();
  await expect(page.locator('.membership-result-action')).toHaveText('登录并保存成绩');
});

test('mobile account controls and dialog remain inside the viewport', async ({ page }) => {
  await preparePage(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('flappyk_language_v1', 'zh');
  });
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.locator('#home-utility-bar')).toBeVisible();
  await expect(page.locator('#home-utility-bar')).toHaveAttribute('data-arcade-placement', 'console');
  await expect(page.locator('.membership-launcher-label')).toHaveText('账户');
  await expect(page.locator('.membership-launcher-tier')).toBeHidden();

  const utilityBounds = await page.evaluate(() => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const container = document.getElementById('game-container').getBoundingClientRect();
    const bezel = document.querySelector('.home-console-bezel').getBoundingClientRect();
    const utilityElement = document.getElementById('home-utility-bar');
    const utility = utilityElement.getBoundingClientRect();
    const account = document.querySelector('.membership-launcher').getBoundingClientRect();
    const language = document.getElementById('language-toggle-btn').getBoundingClientRect();
    return {
      parentClass: utilityElement.parentElement?.className,
      placement: utilityElement.dataset.arcadePlacement,
      accountRightMost: account.right > language.right,
      insideContainer: utility.left >= container.left && utility.right <= container.right,
      insideBezel: utility.left >= bezel.left && utility.right <= bezel.right,
      insideViewport: utility.left >= 0 && utility.right <= viewport.width && utility.top >= 0,
    };
  });
  expect(utilityBounds.parentClass).toContain('home-console-topline');
  expect(utilityBounds.placement).toBe('console');
  expect(utilityBounds.accountRightMost).toBe(true);
  expect(utilityBounds.insideContainer).toBe(true);
  expect(utilityBounds.insideBezel).toBe(true);
  expect(utilityBounds.insideViewport).toBe(true);

  await page.locator('.membership-launcher').click();
  await expect(page.locator('.membership-dialog')).toBeVisible();

  const dialogBounds = await page.evaluate(() => {
    const dialog = document.querySelector('.membership-dialog').getBoundingClientRect();
    return {
      left: dialog.left,
      top: dialog.top,
      rightGap: window.innerWidth - dialog.right,
      bottomGap: window.innerHeight - dialog.bottom,
      width: dialog.width,
      viewportWidth: window.innerWidth,
    };
  });
  expect(dialogBounds.left).toBeGreaterThanOrEqual(0);
  expect(dialogBounds.top).toBeGreaterThanOrEqual(0);
  expect(dialogBounds.rightGap).toBeGreaterThanOrEqual(0);
  expect(dialogBounds.bottomGap).toBeGreaterThanOrEqual(0);
  expect(dialogBounds.width).toBeLessThanOrEqual(dialogBounds.viewportWidth);
});
