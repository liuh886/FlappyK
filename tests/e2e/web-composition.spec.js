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

test('desktop game uses a readable score-first HUD over the fullscreen chart', async ({ page }) => {
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

  await expect(page.locator('#game-hud-rail')).toBeVisible();
  await expect(page.locator('#game-top-controls')).toBeVisible();
  await expect(page.locator('#run-progress-panel')).toBeVisible();
  await expect(page.locator('.controls-hint')).toBeVisible();

  await expect.poll(() => page.locator('#game-canvas').getAttribute('width')).toBe('1440');
  await expect.poll(() => page.locator('#game-canvas').getAttribute('height')).toBe('900');

  await expect(page.locator('.stats-box > .hud-main')).toHaveCount(1);
  await expect(page.locator('.stats-box > #excess-meter')).toHaveCount(1);
  await expect(page.locator('#run-progress-panel > .hud-header')).toHaveCount(1);
  await expect(page.locator('#run-progress-panel > .day-progress')).toHaveCount(1);
  await expect(page.locator('.hud-total .hud-metric-label')).toHaveText('TOTAL');
  await expect(page.locator('.hud-return .hud-metric-label')).toHaveText('RETURN');
  await expect(page.locator('.hud-game .hud-metric-label')).toHaveText('RUN');
  await expect(page.locator('.hud-day .hud-metric-label')).toHaveText('DAY');
  await expect(page.locator('.excess-meter-label span')).toHaveText('EXCESS');

  await expect(page.locator('#game-top-controls > .desktop-speed-control')).toHaveCount(1);
  await expect(page.locator('.controls-hint .desktop-speed-control')).toHaveCount(0);

  const layout = await page.evaluate(() => {
    const box = (selector) => document.querySelector(selector).getBoundingClientRect();
    const style = (selector) => getComputedStyle(document.querySelector(selector));
    const container = box('#game-container');
    const rail = box('#game-hud-rail');
    const weather = box('#weather-status');
    const statsBox = box('.stats-box');
    const run = box('#run-progress-panel');
    const trade = box('.controls-hint');
    const top = box('#game-top-controls');
    const railStyle = style('#game-hud-rail');
    const stats = style('.stats-box');
    const metricNodes = Array.from(document.querySelectorAll('.hud-total, .hud-return, #excess-meter'));
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      container: { x: container.x, y: container.y, width: container.width, height: container.height },
      rail: { x: rail.x, y: rail.y, width: rail.width, height: rail.height, right: rail.right, bottom: rail.bottom },
      weather: { x: weather.x, y: weather.y, width: weather.width, height: weather.height, right: weather.right, bottom: weather.bottom },
      stats: { x: statsBox.x, y: statsBox.y, width: statsBox.width, height: statsBox.height, right: statsBox.right, bottom: statsBox.bottom },
      run: { x: run.x, y: run.y, width: run.width, height: run.height, right: run.right, bottom: run.bottom },
      trade: { x: trade.x, y: trade.y, width: trade.width, height: trade.height },
      top: { x: top.x, y: top.y, width: top.width, height: top.height, right: top.right, bottom: top.bottom },
      metricsFit: metricNodes.every((node) => node.scrollWidth <= node.clientWidth + 1),
      statsColumns: stats.gridTemplateColumns.split(' ').length,
      hudMainDisplay: style('.stats-box > .hud-main').display,
      totalFont: style('#total-display').fontFamily,
      totalSize: style('#total-display').fontSize,
      returnSize: style('#return-display').fontSize,
      excessSize: style('#live-excess-display').fontSize,
      metricLabelSize: style('.stats-box .hud-metric-label').fontSize,
      weatherSize: style('#weather-status').fontSize,
      speedSize: style('#desktop-speed-readout').fontSize,
      tradeSize: style('.trade-key-hint').fontSize,
      runSize: style('#level-display').fontSize,
      railRadius: railStyle.borderRadius,
      railBorder: railStyle.borderTopWidth,
      railShadow: railStyle.boxShadow,
      railClip: railStyle.clipPath,
      statsBorder: stats.borderTopWidth,
      statsBackdrop: stats.backdropFilter,
      statsShadow: stats.boxShadow,
    };
  });

  expect(Math.abs(layout.container.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(layout.container.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(layout.container.width - layout.viewport.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(layout.container.height - layout.viewport.height)).toBeLessThanOrEqual(1);
  expect(layout.rail.x - layout.container.x).toBeGreaterThanOrEqual(10);
  expect(layout.rail.x - layout.container.x).toBeLessThan(22);
  expect(layout.rail.y - layout.container.y).toBeGreaterThanOrEqual(10);
  expect(layout.rail.y - layout.container.y).toBeLessThan(24);
  expect(layout.rail.width).toBeGreaterThan(layout.container.width - 36);
  expect(layout.rail.height).toBeGreaterThanOrEqual(80);
  expect(layout.rail.height).toBeLessThanOrEqual(90);

  for (const child of [layout.weather, layout.stats, layout.run, layout.top]) {
    expect(child.y).toBeGreaterThanOrEqual(layout.rail.y - 1);
    expect(child.bottom).toBeLessThanOrEqual(layout.rail.bottom + 1);
  }
  expect(layout.stats.x - layout.weather.right).toBeGreaterThanOrEqual(5);
  expect(layout.run.x - layout.stats.right).toBeGreaterThanOrEqual(5);
  expect(layout.top.x - layout.run.right).toBeGreaterThanOrEqual(5);
  expect(layout.top.right).toBeLessThanOrEqual(layout.rail.right + 1);

  expect(layout.weather.width).toBeGreaterThanOrEqual(170);
  expect(layout.weather.width).toBeLessThanOrEqual(225);
  expect(layout.stats.width).toBeGreaterThanOrEqual(460);
  expect(layout.stats.width).toBeLessThanOrEqual(625);
  expect(layout.run.width).toBeGreaterThanOrEqual(210);
  expect(layout.run.width).toBeLessThanOrEqual(285);
  expect(layout.statsColumns).toBe(3);
  expect(layout.hudMainDisplay).toBe('contents');
  expect(layout.metricsFit).toBe(true);

  const railCenter = layout.rail.x + layout.rail.width / 2;
  const tradeCenter = layout.trade.x + layout.trade.width / 2;
  expect(Math.abs(tradeCenter - railCenter)).toBeLessThan(3);
  expect(layout.trade.y).toBeGreaterThan(layout.container.y + layout.container.height * 0.78);

  const hudObstructionShare = (
    (layout.rail.width * layout.rail.height) + (layout.trade.width * layout.trade.height)
  ) / (layout.container.width * layout.container.height);
  expect(hudObstructionShare).toBeLessThan(0.15);

  expect(layout.totalFont).toContain('Pixelify Sans');
  expect(layout.totalSize).toBe('15px');
  expect(layout.returnSize).toBe('15px');
  expect(layout.excessSize).toBe('26px');
  expect(layout.metricLabelSize).toBe('9px');
  expect(layout.weatherSize).toBe('12px');
  expect(parseFloat(layout.excessSize)).toBeGreaterThan(parseFloat(layout.totalSize));
  expect(layout.speedSize).toBe('16px');
  expect(layout.tradeSize).toBe('15px');
  expect(layout.runSize).toBe('15px');

  expect(layout.railRadius).toBe('0px');
  expect(layout.railBorder).toBe('0px');
  expect(layout.railShadow).toBe('none');
  expect(layout.railClip).toBe('none');
  expect(layout.statsBorder).toBe('2px');
  expect(layout.statsBackdrop).toBe('none');
  expect(layout.statsShadow).not.toBe('none');
});

test('mobile keeps the same hierarchy with readable labels above virtual controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparePage(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'PLAY', exact: true }).click();

  await expect(page.locator('#game-hud-rail')).toBeVisible();
  await expect(page.locator('#mobile-controls')).toBeVisible();
  await expect(page.locator('#run-progress-panel')).toBeVisible();
  await expect(page.locator('#game-top-controls .desktop-speed-control')).toBeHidden();

  const positions = await page.evaluate(() => {
    const rail = document.querySelector('#game-hud-rail').getBoundingClientRect();
    const stats = document.querySelector('.stats-box').getBoundingClientRect();
    const run = document.querySelector('#run-progress-panel').getBoundingClientRect();
    const top = document.querySelector('#game-top-controls').getBoundingClientRect();
    const weather = document.querySelector('#weather-status').getBoundingClientRect();
    const controls = document.querySelector('#mobile-controls').getBoundingClientRect();
    const statsStyle = getComputedStyle(document.querySelector('.stats-box'));
    const metricNodes = Array.from(document.querySelectorAll('.hud-total, .hud-return, #excess-meter'));
    return {
      railLeft: rail.left,
      railRight: rail.right,
      railHeight: rail.height,
      railBottom: rail.bottom,
      statsWidth: stats.width,
      statsHeight: stats.height,
      statsTop: stats.top,
      statsBottom: stats.bottom,
      runWidth: run.width,
      runHeight: run.height,
      runTop: run.top,
      runBottom: run.bottom,
      topX: top.x,
      topTop: top.top,
      topRight: top.right,
      weatherTop: weather.top,
      controlsTop: controls.top,
      metricsFit: metricNodes.every((node) => node.scrollWidth <= node.clientWidth + 1),
      statsColumns: statsStyle.gridTemplateColumns.split(' ').length,
      buySize: getComputedStyle(document.querySelector('#btn-buy')).fontSize,
      buyRadius: getComputedStyle(document.querySelector('#btn-buy')).borderRadius,
      buyShadow: getComputedStyle(document.querySelector('#btn-buy')).boxShadow,
      speedSize: getComputedStyle(document.querySelector('#mobile-speed-readout')).fontSize,
      hudSize: getComputedStyle(document.querySelector('#total-display')).fontSize,
      excessSize: getComputedStyle(document.querySelector('#live-excess-display')).fontSize,
      labelSize: getComputedStyle(document.querySelector('.stats-box .hud-metric-label')).fontSize,
      runSize: getComputedStyle(document.querySelector('#level-display')).fontSize,
    };
  });

  expect(positions.railLeft).toBeGreaterThanOrEqual(5);
  expect(positions.railRight).toBeLessThanOrEqual(385);
  expect(positions.railHeight).toBeGreaterThanOrEqual(96);
  expect(positions.railHeight).toBeLessThanOrEqual(120);
  expect(positions.railBottom).toBeLessThan(positions.controlsTop);
  expect(Math.abs(positions.statsTop - positions.topTop)).toBeLessThan(2);
  expect(Math.abs(positions.weatherTop - positions.runTop)).toBeLessThan(2);
  expect(positions.weatherTop - positions.statsBottom).toBeGreaterThanOrEqual(4);
  expect(positions.topX).toBeGreaterThan(positions.railLeft + 215);
  expect(positions.topRight).toBeLessThanOrEqual(positions.railRight + 1);

  expect(positions.statsWidth).toBeGreaterThanOrEqual(225);
  expect(positions.statsWidth).toBeLessThanOrEqual(270);
  expect(positions.statsHeight).toBeGreaterThanOrEqual(56);
  expect(positions.statsHeight).toBeLessThanOrEqual(70);
  expect(positions.runWidth).toBeGreaterThanOrEqual(98);
  expect(positions.runWidth).toBeLessThanOrEqual(106);
  expect(positions.runHeight).toBeGreaterThanOrEqual(40);
  expect(positions.runHeight).toBeLessThanOrEqual(52);
  expect(positions.statsColumns).toBe(3);
  expect(positions.metricsFit).toBe(true);

  expect(parseFloat(positions.buySize)).toBeGreaterThanOrEqual(14);
  expect(positions.buyRadius).toBe('0px');
  expect(positions.buyShadow).not.toBe('none');
  expect(positions.speedSize).toBe('14px');
  expect(positions.hudSize).toBe('11px');
  expect(positions.excessSize).toBe('18px');
  expect(parseFloat(positions.labelSize)).toBeGreaterThanOrEqual(9);
  expect(parseFloat(positions.excessSize)).toBeGreaterThan(parseFloat(positions.hudSize));
  expect(positions.runSize).toBe('12px');
});
