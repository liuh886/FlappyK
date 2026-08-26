const { test, expect } = require('@playwright/test');
const { mockSharedAccount } = require('./account-fixture');

test.use({ hasTouch: true });

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

test('phone gameplay reserves the command dock and one tap creates one trade', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparePage(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'PLAY', exact: true }).tap();
  await expect(page.locator('#mobile-controls')).toBeVisible();

  const geometry = await page.evaluate(() => {
    const canvas = document.getElementById('game-canvas').getBoundingClientRect();
    const dock = document.getElementById('mobile-controls').getBoundingClientRect();
    const sound = document.getElementById('sound-toggle-btn');
    const skin = document.getElementById('game-skin-toggle-btn');
    return {
      canvasBottom: canvas.bottom,
      dockTop: dock.top,
      soundDisplay: sound ? getComputedStyle(sound).display : 'missing',
      skinDisplay: skin ? getComputedStyle(skin).display : 'missing',
    };
  });

  expect(geometry.canvasBottom).toBeLessThanOrEqual(geometry.dockTop + 2);
  expect(geometry.soundDisplay).not.toBe('none');
  expect(geometry.soundDisplay).not.toBe('missing');
  expect(geometry.skinDisplay).toBe('none');

  const before = await page.evaluate(() => {
    const state = window.FlappyKGame.getState();
    window.FlappyKGame.changeSpeed(1 - state.speedMultiplier);
    return window.FlappyKGame.getState();
  });
  await page.locator('#btn-buy').tap();
  const afterBuy = await page.evaluate(() => window.FlappyKGame.getState());
  expect(afterBuy.cash).toBeCloseTo(before.cash - 1001, 6);
  expect(afterBuy.shares).toBeGreaterThan(before.shares);

  await page.locator('#btn-sell').tap();
  const afterSell = await page.evaluate(() => window.FlappyKGame.getState());
  expect(afterSell.cash).toBeCloseTo(before.cash - 2, 6);
  expect(afterSell.shares).toBeCloseTo(before.shares, 6);
});
