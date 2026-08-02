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
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

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

test('account tools are coordinated and completed runs prompt sign-in', async ({ page }) => {
  await preparePage(page);
  await page.goto('/');

  await expect.poll(() => page.evaluate(() => Boolean(window.FlappyKMembershipExperience))).toBe(true);
  expect(await page.evaluate(() => window.FlappyKMembership.isConfigured())).toBe(true);

  const utilityBar = page.locator('#home-utility-bar');
  const accountButton = utilityBar.locator('.membership-launcher');
  const languageButton = utilityBar.locator('#language-toggle-btn');
  await expect(utilityBar).toBeVisible();
  await expect(accountButton).toHaveText('ACCOUNT');
  await expect(languageButton).toHaveText('中文');

  const positions = await page.evaluate(() => {
    const account = document.querySelector('.membership-launcher').getBoundingClientRect();
    const language = document.getElementById('language-toggle-btn').getBoundingClientRect();
    return {
      accountLeft: account.left,
      languageLeft: language.left,
      topDelta: Math.abs(account.top - language.top),
    };
  });
  expect(positions.accountLeft).toBeLessThan(positions.languageLeft);
  expect(positions.topDelta).toBeLessThan(2);
  expect(await page.evaluate(() => localStorage.getItem('flappyk_pending_cloud_runs_v1'))).toBeNull();

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

test('Chinese desktop UI uses readable body type and larger information text', async ({ page }) => {
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
    return {
      statsSize: stats.fontSize,
      statsFamily: stats.fontFamily,
      introSize: intro.fontSize,
      introLineHeight: intro.lineHeight,
      buttonFamily: playButton.fontFamily,
    };
  });

  expect(typography.statsSize).toBe('14px');
  expect(typography.introSize).toBe('16px');
  expect(Number.parseFloat(typography.introLineHeight)).toBeGreaterThan(24);
  expect(typography.statsFamily).not.toContain('ZCOOL QingKe HuangYou');
  expect(typography.buttonFamily).toContain('ZCOOL QingKe HuangYou');

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