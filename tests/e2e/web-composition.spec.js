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

test('desktop game uses the enlarged frame and rebalanced HUD composition', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparePage(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'PLAY', exact: true }).click();

  await expect(page.locator('#game-top-controls')).toBeVisible();
  await expect(page.locator('#run-progress-panel')).toBeVisible();
  await expect(page.locator('.controls-hint')).toBeVisible();

  await expect.poll(() => page.locator('#game-canvas').getAttribute('width')).toBe('896');
  await expect.poll(() => page.locator('#game-canvas').getAttribute('height')).toBe('672');

  await expect(page.locator('.stats-box > .hud-main')).toHaveCount(1);
  await expect(page.locator('.stats-box > #excess-meter')).toHaveCount(1);
  await expect(page.locator('.stats-box > .hud-header')).toHaveCount(0);
  await expect(page.locator('.stats-box > .day-progress')).toHaveCount(0);
  await expect(page.locator('#run-progress-panel > .hud-header')).toHaveCount(1);
  await expect(page.locator('#run-progress-panel > .day-progress')).toHaveCount(1);

  await expect(page.locator('#game-top-controls > .desktop-speed-control')).toHaveCount(1);
  await expect(page.locator('.controls-hint .desktop-speed-control')).toHaveCount(0);

  const layout = await page.evaluate(() => {
    const box = (selector) => document.querySelector(selector).getBoundingClientRect();
    const container = box('#game-container');
    const run = box('#run-progress-panel');
    const trade = box('.controls-hint');
    const top = box('#game-top-controls');
    const total = getComputedStyle(document.querySelector('.hud-total'));
    const returns = getComputedStyle(document.querySelector('.hud-return'));
    return {
      container: { x: container.x, y: container.y, width: container.width, height: container.height, bottom: container.bottom },
      run: { x: run.x, y: run.y, bottom: run.bottom },
      trade: { x: trade.x, y: trade.y },
      top: { x: top.x, y: top.y },
      totalFont: total.fontFamily,
      returnFont: returns.fontFamily,
      totalSize: total.fontSize,
      returnSize: returns.fontSize,
    };
  });

  expect(layout.container.width).toBeGreaterThanOrEqual(894);
  expect(layout.container.width).toBeLessThanOrEqual(898);
  expect(layout.run.x - layout.container.x).toBeLessThan(24);
  expect(layout.container.bottom - layout.run.bottom).toBeLessThan(24);
  expect(layout.trade.x - layout.container.x).toBeLessThan(40);
  expect(layout.trade.y).toBeGreaterThan(layout.container.y + layout.container.height * 0.7);
  expect(layout.top.x).toBeGreaterThan(layout.container.x + layout.container.width * 0.65);
  expect(layout.top.y - layout.container.y).toBeLessThan(24);
  expect(layout.totalFont).toBe(layout.returnFont);
  expect(layout.totalFont).toContain('Press Start 2P');
  expect(layout.totalSize).toBe(layout.returnSize);
});

test('mobile run progress stays above the virtual control zone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparePage(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'PLAY', exact: true }).click();

  await expect(page.locator('#mobile-controls')).toBeVisible();
  await expect(page.locator('#run-progress-panel')).toBeVisible();
  await expect(page.locator('#game-top-controls .desktop-speed-control')).toBeHidden();

  const positions = await page.evaluate(() => {
    const run = document.querySelector('#run-progress-panel').getBoundingClientRect();
    const controls = document.querySelector('#mobile-controls').getBoundingClientRect();
    return { runBottom: run.bottom, controlsTop: controls.top };
  });
  expect(positions.runBottom).toBeLessThanOrEqual(positions.controlsTop + 8);
});
