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

test('desktop game keeps a compact modern pixel HUD around the dominant chart', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparePage(page);
  await page.goto('/');

  const homeTypography = await page.evaluate(() => {
    const title = getComputedStyle(document.querySelector('#game-title'));
    const play = getComputedStyle(document.querySelector('#start-btn'));
    const daily = getComputedStyle(document.querySelector('.daily-mode-copy span'));
    return {
      titleFont: title.fontFamily,
      titleSize: title.fontSize,
      playFont: play.fontFamily,
      playSize: play.fontSize,
      playRadius: play.borderRadius,
      playShadow: play.boxShadow,
      dailySize: daily.fontSize,
    };
  });

  expect(homeTypography.titleFont).toContain('Press Start 2P');
  expect(parseFloat(homeTypography.titleSize)).toBeGreaterThanOrEqual(40);
  expect(homeTypography.playFont).toContain('Pixelify Sans');
  expect(homeTypography.playSize).toBe('22px');
  expect(homeTypography.dailySize).toBe('16px');
  expect(homeTypography.playRadius).toBe('0px');
  expect(homeTypography.playShadow).not.toBe('none');

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
  await expect(page.locator('.hud-total .hud-metric-label')).toHaveText('TOTAL');
  await expect(page.locator('.hud-return .hud-metric-label')).toHaveText('RETURN');
  await expect(page.locator('.hud-game .hud-metric-label')).toHaveText('RUN');
  await expect(page.locator('.hud-day .hud-metric-label')).toHaveText('DAY');

  await expect(page.locator('#game-top-controls > .desktop-speed-control')).toHaveCount(1);
  await expect(page.locator('.controls-hint .desktop-speed-control')).toHaveCount(0);

  const layout = await page.evaluate(() => {
    const box = (selector) => document.querySelector(selector).getBoundingClientRect();
    const style = (selector) => getComputedStyle(document.querySelector(selector));
    const container = box('#game-container');
    const statsBox = box('.stats-box');
    const run = box('#run-progress-panel');
    const trade = box('.controls-hint');
    const top = box('#game-top-controls');
    const total = style('#total-display');
    const returns = style('#return-display');
    const stats = style('.stats-box');
    const speed = style('#desktop-speed-readout');
    const tradeHint = style('.trade-key-hint');
    const runValue = style('#level-display');
    const excessValue = style('#live-excess-display');
    return {
      container: { x: container.x, y: container.y, width: container.width, height: container.height, bottom: container.bottom },
      stats: { x: statsBox.x, y: statsBox.y, width: statsBox.width, height: statsBox.height },
      run: { x: run.x, y: run.y, width: run.width, height: run.height, bottom: run.bottom },
      trade: { x: trade.x, y: trade.y },
      top: { x: top.x, y: top.y },
      totalFont: total.fontFamily,
      returnFont: returns.fontFamily,
      totalSize: total.fontSize,
      returnSize: returns.fontSize,
      speedSize: speed.fontSize,
      tradeSize: tradeHint.fontSize,
      runSize: runValue.fontSize,
      excessSize: excessValue.fontSize,
      statsRadius: stats.borderRadius,
      statsBorder: stats.borderTopWidth,
      statsBackdrop: stats.backdropFilter,
      statsShadow: stats.boxShadow,
      statsClip: stats.clipPath,
    };
  });

  expect(layout.container.width).toBeGreaterThanOrEqual(894);
  expect(layout.container.width).toBeLessThanOrEqual(898);
  expect(layout.run.x - layout.container.x).toBeLessThan(22);
  expect(layout.container.bottom - layout.run.bottom).toBeLessThan(22);
  expect(layout.trade.x - layout.container.x).toBeLessThan(44);
  expect(layout.trade.y).toBeGreaterThan(layout.container.y + layout.container.height * 0.78);
  expect(layout.top.x).toBeGreaterThan(layout.container.x + layout.container.width * 0.62);
  expect(layout.top.y - layout.container.y).toBeLessThan(28);

  expect(layout.stats.width).toBeLessThanOrEqual(318);
  expect(layout.stats.height).toBeLessThanOrEqual(48);
  expect(layout.run.width).toBeLessThanOrEqual(180);
  expect(layout.run.height).toBeLessThanOrEqual(42);
  const hudObstructionShare = (
    (layout.stats.width * layout.stats.height) + (layout.run.width * layout.run.height)
  ) / (layout.container.width * layout.container.height);
  expect(hudObstructionShare).toBeLessThan(0.04);

  expect(layout.totalFont).toContain('Pixelify Sans');
  expect(layout.returnFont).toContain('Pixelify Sans');
  expect(layout.totalSize).toBe('13px');
  expect(layout.returnSize).toBe('13px');
  expect(layout.excessSize).toBe('13px');
  expect(layout.speedSize).toBe('15px');
  expect(layout.tradeSize).toBe('13px');
  expect(layout.runSize).toBe('12px');

  expect(layout.statsRadius).toBe('0px');
  expect(layout.statsBorder).toBe('1px');
  expect(layout.statsBackdrop).toBe('none');
  expect(layout.statsShadow).not.toBe('none');
  expect(layout.statsClip).toBe('none');
});

test('mobile uses an even lighter HUD above virtual controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparePage(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'PLAY', exact: true }).click();

  await expect(page.locator('#mobile-controls')).toBeVisible();
  await expect(page.locator('#run-progress-panel')).toBeVisible();
  await expect(page.locator('#game-top-controls .desktop-speed-control')).toBeHidden();

  const positions = await page.evaluate(() => {
    const stats = document.querySelector('.stats-box').getBoundingClientRect();
    const run = document.querySelector('#run-progress-panel').getBoundingClientRect();
    const controls = document.querySelector('#mobile-controls').getBoundingClientRect();
    const buy = getComputedStyle(document.querySelector('#btn-buy'));
    const speed = getComputedStyle(document.querySelector('#mobile-speed-readout'));
    const hud = getComputedStyle(document.querySelector('#total-display'));
    const runValue = getComputedStyle(document.querySelector('#level-display'));
    return {
      statsWidth: stats.width,
      statsHeight: stats.height,
      runWidth: run.width,
      runHeight: run.height,
      runBottom: run.bottom,
      controlsTop: controls.top,
      buySize: buy.fontSize,
      buyRadius: buy.borderRadius,
      buyShadow: buy.boxShadow,
      speedSize: speed.fontSize,
      hudSize: hud.fontSize,
      runSize: runValue.fontSize,
    };
  });

  expect(positions.runBottom).toBeLessThanOrEqual(positions.controlsTop + 8);
  expect(positions.statsWidth).toBeLessThanOrEqual(320);
  expect(positions.statsHeight).toBeLessThanOrEqual(44);
  expect(positions.runWidth).toBeLessThanOrEqual(146);
  expect(positions.runHeight).toBeLessThanOrEqual(38);
  expect(parseFloat(positions.buySize)).toBeGreaterThanOrEqual(14);
  expect(positions.buyRadius).toBe('0px');
  expect(positions.buyShadow).not.toBe('none');
  expect(positions.speedSize).toBe('14px');
  expect(positions.hudSize).toBe('11px');
  expect(positions.runSize).toBe('11px');
});
