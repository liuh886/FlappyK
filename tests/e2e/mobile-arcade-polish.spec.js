const { test, expect } = require('@playwright/test');
const { mockSharedAccount } = require('./account-fixture');

async function preparePage(page) {
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await page.route('https://raw.githubusercontent.com/**', (route) => route.abort());
  await page.route('https://html2canvas.hertzen.com/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: 'window.html2canvas = async () => document.createElement("canvas");',
  }));
  await mockSharedAccount(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('flappyk_onboarding_seen_v1', '1');
    class SilentAudioContext {
      constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
      createOscillator() {
        return {
          type: 'square', frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
          connect() {}, start() {}, stop() {},
        };
      }
      createGain() {
        return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
      }
      resume() { this.state = 'running'; return Promise.resolve(); }
    }
    window.AudioContext = SilentAudioContext;
    window.webkitAudioContext = SilentAudioContext;
  });
}

function inside(inner, outer, tolerance = 1) {
  return inner.left >= outer.left - tolerance
    && inner.right <= outer.right + tolerance
    && inner.top >= outer.top - tolerance
    && inner.bottom <= outer.bottom + tolerance;
}

test('360px short phone keeps the console, account toolbar, and primary actions usable', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await preparePage(page);
  await page.goto('/');
  await expect(page.locator('.hao-account-trigger')).toBeVisible();

  const home = await page.evaluate(() => {
    const box = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    return {
      viewport: { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight },
      bezel: box('.home-console-bezel'),
      utility: box('#home-utility-bar'),
      language: box('#language-toggle-btn'),
      account: box('.hao-account-trigger'),
      play: box('#start-btn'),
      daily: box('#daily-run-btn'),
      scrollWidth: document.scrollingElement.scrollWidth,
      innerWidth: window.innerWidth,
    };
  });

  expect(inside(home.bezel, home.viewport, 2)).toBe(true);
  expect(inside(home.utility, home.bezel, 4)).toBe(true);
  expect(home.language.height).toBeGreaterThanOrEqual(40);
  expect(home.account.height).toBeGreaterThanOrEqual(40);
  expect(home.play.height).toBeGreaterThanOrEqual(48);
  expect(home.daily.height).toBeGreaterThanOrEqual(44);
  expect(home.scrollWidth).toBeLessThanOrEqual(home.innerWidth + 1);

  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await expect(page.locator('#mobile-controls')).toBeVisible();
  await expect(page.locator('#home-utility-bar')).toBeHidden();

  await page.evaluate(() => {
    window.FlappyKMarketWeather.applyMetrics(
      { playerReturn: 0.02, marketReturn: 0.01, excess: 0.01 },
      { silent: true },
    );
    window.FlappyKMarketWeather.applyMetrics(
      { playerReturn: -0.01, marketReturn: -0.02, excess: 0.01 },
    );
  });

  const game = await page.evaluate(() => {
    const box = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    return {
      viewport: { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight },
      weather: box('#weather-status'),
      topControls: box('#game-top-controls'),
      mobileControls: box('#mobile-controls'),
    };
  });

  expect(inside(game.weather, game.viewport, 2)).toBe(true);
  expect(game.weather.top).toBeGreaterThanOrEqual(game.topControls.bottom - 2);
  expect(inside(game.mobileControls, game.viewport, 2)).toBe(true);
});

test('landscape phone keeps immediate play and the account toolbar visible without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await preparePage(page);
  await page.goto('/');
  await expect(page.locator('.hao-account-trigger')).toBeVisible();
  await expect(page.getByRole('button', { name: 'PLAY', exact: true })).toBeVisible();

  const layout = await page.evaluate(() => {
    const bezel = document.querySelector('.home-console-bezel').getBoundingClientRect();
    const play = document.querySelector('#start-btn').getBoundingClientRect();
    const toolbar = document.querySelector('#home-utility-bar').getBoundingClientRect();
    return {
      bezel: { left: bezel.left, right: bezel.right, top: bezel.top, bottom: bezel.bottom },
      play: { left: play.left, right: play.right, top: play.top, bottom: play.bottom, height: play.height },
      toolbar: { left: toolbar.left, right: toolbar.right, top: toolbar.top, bottom: toolbar.bottom },
      scrollWidth: document.scrollingElement.scrollWidth,
      scrollHeight: document.scrollingElement.scrollHeight,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    };
  });

  expect(layout.bezel.left).toBeGreaterThanOrEqual(-1);
  expect(layout.bezel.right).toBeLessThanOrEqual(layout.innerWidth + 1);
  expect(layout.bezel.top).toBeGreaterThanOrEqual(-1);
  expect(layout.bezel.bottom).toBeLessThanOrEqual(layout.innerHeight + 1);
  expect(layout.toolbar.left).toBeGreaterThanOrEqual(layout.bezel.left - 1);
  expect(layout.toolbar.right).toBeLessThanOrEqual(layout.bezel.right + 1);
  expect(layout.play.top).toBeGreaterThanOrEqual(layout.bezel.top);
  expect(layout.play.bottom).toBeLessThanOrEqual(layout.bezel.bottom);
  expect(layout.play.height).toBeGreaterThanOrEqual(44);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1);
  expect(layout.scrollHeight).toBeLessThanOrEqual(layout.innerHeight + 1);
});
