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

test('desktop keeps the chart dominant with a compact two-row terminal instrument rail', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparePage(page);
  await page.goto('/');

  const homeTypography = await page.evaluate(() => {
    const title = getComputedStyle(document.querySelector('#game-title'));
    const play = getComputedStyle(document.querySelector('#start-btn'));
    return {
      titleFont: title.fontFamily,
      titleSize: parseFloat(title.fontSize),
      playRadius: play.borderRadius,
      playShadow: play.boxShadow,
    };
  });

  expect(homeTypography.titleFont).toContain('Press Start 2P');
  expect(homeTypography.titleSize).toBeGreaterThanOrEqual(32);
  expect(homeTypography.playRadius).toBe('0px');
  expect(homeTypography.playShadow).not.toBe('none');

  await page.getByRole('button', { name: 'PLAY', exact: true }).click();

  for (const selector of ['#game-hud-rail', '#game-top-controls', '#run-progress-panel', '.stats-box', '#weather-status', '.controls-hint']) {
    await expect(page.locator(selector)).toBeVisible();
  }
  await expect(page.locator('#game-top-controls > .desktop-speed-control')).toHaveCount(1);
  await expect(page.locator('.controls-hint .desktop-speed-control')).toHaveCount(0);
  await expect.poll(() => page.locator('#game-canvas').getAttribute('width')).toBe('1440');
  await expect.poll(() => page.locator('#game-canvas').getAttribute('height')).toBe('900');

  const layout = await page.evaluate(() => {
    const box = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    const rail = box('#game-hud-rail');
    const children = ['.stats-box', '#game-top-controls', '#weather-status', '#run-progress-panel'].map(box);
    const hint = box('.controls-hint');
    const viewport = { left: 0, top: 0, right: innerWidth, bottom: innerHeight, width: innerWidth, height: innerHeight };
    const metricNodes = Array.from(document.querySelectorAll('.hud-total, .hud-return, #excess-meter'));
    const style = (selector) => getComputedStyle(document.querySelector(selector));
    return {
      viewport,
      rail,
      children,
      hint,
      metricsFit: metricNodes.every((node) => node.scrollWidth <= node.clientWidth + 1),
      statsRadius: style('.stats-box').borderRadius,
      statsBackdrop: style('.stats-box').backdropFilter,
      statsShadow: style('.stats-box').boxShadow,
      controlRadius: style('#pause-btn').borderRadius,
      hintRadius: style('.controls-hint').borderRadius,
      labelSize: parseFloat(style('.hud-metric-label').fontSize),
      totalSize: parseFloat(style('#total-display').fontSize),
    };
  });

  expect(inside(layout.rail, layout.viewport, 1)).toBe(true);
  expect(layout.rail.top).toBeLessThan(32);
  expect(layout.rail.height).toBeLessThan(layout.viewport.height * 0.24);
  for (const child of layout.children) expect(inside(child, layout.rail, 2)).toBe(true);
  expect(inside(layout.hint, layout.viewport, 1)).toBe(true);
  expect(layout.hint.top).toBeGreaterThan(layout.viewport.height * 0.72);
  expect(layout.metricsFit).toBe(true);
  expect(layout.statsRadius).toBe('0px');
  expect(layout.statsBackdrop).toBe('none');
  expect(layout.statsShadow).not.toBe('none');
  expect(layout.controlRadius).toBe('0px');
  expect(layout.hintRadius).toBe('0px');
  expect(layout.labelSize).toBeGreaterThanOrEqual(8);
  expect(layout.totalSize).toBeGreaterThan(layout.labelSize);
});

test('mobile keeps HUD above the command dock and all actions inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparePage(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'PLAY', exact: true }).click();

  await expect(page.locator('#game-hud-rail')).toBeVisible();
  await expect(page.locator('#mobile-controls')).toBeVisible();
  await expect(page.locator('#game-top-controls .desktop-speed-control')).toBeHidden();

  const layout = await page.evaluate(() => {
    const box = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    const style = (selector) => getComputedStyle(document.querySelector(selector));
    const viewport = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
    const metricNodes = Array.from(document.querySelectorAll('.hud-total, .hud-return, #excess-meter'));
    return {
      viewport,
      rail: box('#game-hud-rail'),
      dock: box('#mobile-controls'),
      buy: box('#btn-buy'),
      sell: box('#btn-sell'),
      speed: box('.mobile-speed-control'),
      metricsFit: metricNodes.every((node) => node.scrollWidth <= node.clientWidth + 1),
      buyRadius: style('#btn-buy').borderRadius,
      sellRadius: style('#btn-sell').borderRadius,
      labelSize: parseFloat(style('.stats-box .hud-metric-label').fontSize),
    };
  });

  expect(inside(layout.rail, layout.viewport, 2)).toBe(true);
  expect(inside(layout.dock, layout.viewport, 2)).toBe(true);
  expect(inside(layout.buy, layout.viewport, 2)).toBe(true);
  expect(inside(layout.sell, layout.viewport, 2)).toBe(true);
  expect(inside(layout.speed, layout.viewport, 2)).toBe(true);
  expect(layout.rail.bottom).toBeLessThan(layout.dock.top);
  expect(layout.buy.width).toBeGreaterThanOrEqual(60);
  expect(layout.sell.width).toBeGreaterThanOrEqual(60);
  expect(layout.buyRadius).toBe('0px');
  expect(layout.sellRadius).toBe('0px');
  expect(layout.metricsFit).toBe(true);
  expect(layout.labelSize).toBeGreaterThanOrEqual(8);
});
