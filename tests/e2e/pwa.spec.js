const { test, expect } = require('@playwright/test');
const { mockSharedAccount } = require('./account-fixture');

async function preparePage(page, accountOptions = {}) {
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await page.route('https://raw.githubusercontent.com/**', (route) => route.abort());
  await page.route('https://html2canvas.hertzen.com/**', (route) => route.abort());
  await mockSharedAccount(page, accountOptions);
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
          frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
          connect() {}, start() {}, stop() {},
        };
      }
      createGain() {
        return {
          gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
          connect() {},
        };
      }
      resume() { this.state = 'running'; return Promise.resolve(); }
    }
    window.AudioContext = SilentAudioContext;
    window.webkitAudioContext = SilentAudioContext;
  });
}

test('PWA runtime-caches a market chunk after first use and replays it offline', async ({ page, context }) => {
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
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 20_000 }).toBe(true);
  expect(await page.evaluate(() => Object.keys(stockData.crypto || {}).length)).toBe(0);

  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await expect.poll(() => page.evaluate(() => Object.keys(stockData.crypto || {}).length)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => Array.isArray(currentData) ? currentData.length : 0)).toBe(250);

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await expect.poll(() => page.evaluate(() => Array.isArray(currentData) ? currentData.length : 0)).toBe(250);
  await context.setOffline(false);
});

test('install prompt exposes a home-screen install action', async ({ page }) => {
  await preparePage(page);
  await page.goto('/');

  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.defineProperty(event, 'prompt', { value: () => Promise.resolve() });
    Object.defineProperty(event, 'userChoice', {
      value: Promise.resolve({ outcome: 'dismissed', platform: 'web' }),
    });
    window.dispatchEvent(event);
  });

  const installButton = page.locator('#pwa-install-btn');
  await expect(installButton).toBeVisible();
  await expect(installButton).toHaveText('INSTALL APP');
  await installButton.click();
  await expect(installButton).toHaveAttribute('data-ready', 'true');
});

test('language and player account share a dedicated home toolbar', async ({ page }) => {
  await preparePage(page);
  await page.goto('/');

  const toolbar = page.locator('#home-utility-bar');
  const account = toolbar.locator('.hao-account-trigger');
  const language = toolbar.locator('#language-toggle-btn');
  await expect(toolbar).toBeVisible();
  await expect(toolbar).toHaveAttribute('data-arcade-placement', 'console');
  await expect(language).toHaveText('中文');
  await expect(account).toBeVisible();
  await expect(account.locator('.hao-account-trigger-label')).toHaveText('ACCOUNT');

  const placement = await page.evaluate(() => {
    const toolbar = document.getElementById('home-utility-bar');
    const account = document.querySelector('.hao-account-trigger');
    const language = document.getElementById('language-toggle-btn');
    const container = document.getElementById('game-container').getBoundingClientRect();
    const rect = toolbar.getBoundingClientRect();
    return {
      childOrder: Array.from(toolbar.children).map((element) => element.id || element.className),
      accountRightMost: account.getBoundingClientRect().right > language.getBoundingClientRect().right,
      insideContainer: rect.left >= container.left && rect.right <= container.right && rect.top >= container.top,
    };
  });
  expect(placement.childOrder).toEqual(['language-toggle-slot', 'home-account-slot']);
  expect(placement.accountRightMost).toBe(true);
  expect(placement.insideContainer).toBe(true);

  await account.click();
  await expect(page.locator('.hao-account-dialog')).toBeVisible();
});

test('Chinese desktop game typography stays consistent around the account toolbar', async ({ page }) => {
  await preparePage(page);
  await page.addInitScript(() => window.localStorage.setItem('flappyk_language_v1', 'zh'));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.locator('.hao-account-trigger')).toBeVisible();
  const typography = await page.evaluate(() => {
    const style = (selector) => getComputedStyle(document.querySelector(selector));
    const goalRow = document.getElementById('target-return-display').parentElement;
    return {
      statsSize: style('.stats-box').fontSize,
      statsFamily: style('.stats-box').fontFamily,
      introSize: style('#start-screen > p').fontSize,
      introLineHeight: style('#start-screen > p').lineHeight,
      introFamily: style('#start-screen > p').fontFamily,
      buttonFamily: style('#start-btn').fontFamily,
      languageFamily: style('#language-toggle-btn').fontFamily,
      accountFamily: style('.hao-account-trigger').fontFamily,
      goalRowDisplay: getComputedStyle(goalRow).display,
    };
  });

  expect(Number.parseFloat(typography.statsSize)).toBeGreaterThanOrEqual(12);
  expect(typography.introSize).toBe('17px');
  expect(Number.parseFloat(typography.introLineHeight)).toBeGreaterThanOrEqual(28);
  for (const family of [typography.statsFamily, typography.introFamily, typography.buttonFamily, typography.languageFamily, typography.accountFamily]) {
    expect(family).toContain('ZCOOL QingKe HuangYou');
  }
  expect(typography.goalRowDisplay).toBe('none');
});

test('mobile account toolbar and drawer remain inside the viewport', async ({ page }) => {
  await preparePage(page);
  await page.addInitScript(() => window.localStorage.setItem('flappyk_language_v1', 'zh'));
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');

  const toolbar = page.locator('#home-utility-bar');
  const account = toolbar.locator('.hao-account-trigger');
  await expect(toolbar).toBeVisible();
  await expect(account).toBeVisible();
  const toolbarBounds = await page.evaluate(() => {
    const rect = document.getElementById('home-utility-bar').getBoundingClientRect();
    return { left: rect.left, top: rect.top, right: rect.right, width: window.innerWidth };
  });
  expect(toolbarBounds.left).toBeGreaterThanOrEqual(0);
  expect(toolbarBounds.top).toBeGreaterThanOrEqual(0);
  expect(toolbarBounds.right).toBeLessThanOrEqual(toolbarBounds.width);

  await account.click();
  await expect(page.locator('.hao-account-dialog')).toBeVisible();
  const dialogBounds = await page.evaluate(() => {
    const rect = document.querySelector('.hao-account-dialog').getBoundingClientRect();
    return {
      left: rect.left, top: rect.top,
      rightGap: window.innerWidth - rect.right,
      bottomGap: window.innerHeight - rect.bottom,
      width: rect.width, viewportWidth: window.innerWidth,
    };
  });
  expect(dialogBounds.left).toBeGreaterThanOrEqual(0);
  expect(dialogBounds.top).toBeGreaterThanOrEqual(0);
  expect(dialogBounds.rightGap).toBeGreaterThanOrEqual(0);
  expect(dialogBounds.bottomGap).toBeGreaterThanOrEqual(0);
  expect(dialogBounds.width).toBeLessThanOrEqual(dialogBounds.viewportWidth);
});


test('canvas backing store follows devicePixelRatio while gameplay coordinates stay in CSS pixels', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await preparePage(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await expect.poll(() => page.evaluate(() => Array.isArray(currentData) ? currentData.length : 0)).toBe(250);
  const size = await page.evaluate(() => {
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    return {
      dpr: window.devicePixelRatio,
      cssWidth: Math.round(rect.width),
      cssHeight: Math.round(rect.height),
      backingWidth: canvas.width,
      backingHeight: canvas.height,
    };
  });
  expect(size.dpr).toBe(2);
  expect(size.backingWidth).toBe(Math.round(size.cssWidth * size.dpr));
  expect(size.backingHeight).toBe(Math.round(size.cssHeight * size.dpr));
  await context.close();
});
