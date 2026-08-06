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
          frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
          connect() {},
          start() {},
          stop() {},
        };
      }
      createGain() {
        return {
          gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
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

async function startGame(page) {
  await preparePage(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await expect(page.locator('#game-hud-rail')).toBeVisible();
  await expect.poll(() => page.locator('#game-canvas').getAttribute('width')).toBeTruthy();
}

test('desktop HUD uses one embedded pixel instrument language', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await startGame(page);

  const visual = await page.evaluate(() => {
    const css = (selector, pseudo) => getComputedStyle(document.querySelector(selector), pseudo);
    const rail = css('#game-hud-rail');
    const weather = css('#weather-status');
    const weatherLamp = css('#weather-status', '::before');
    const stats = css('.stats-box');
    const run = css('#run-progress-panel');
    const controls = css('#game-top-controls');
    const controlButton = css('#pause-btn');
    const dock = css('.controls-hint');
    const dockKey = css('.trade-key-hint .key');
    const labels = Array.from(document.querySelectorAll(
      '#game-hud-rail .hud-metric-label, #game-hud-rail .excess-meter-label',
    )).map((node) => {
      const style = getComputedStyle(node);
      return { family: style.fontFamily, size: style.fontSize, color: style.color };
    });
    const values = ['#total-display', '#return-display', '#live-excess-display', '#level-display', '#day-display']
      .map((selector) => {
        const style = css(selector);
        return { family: style.fontFamily, size: style.fontSize, weight: style.fontWeight };
      });
    return {
      rail: {
        background: rail.backgroundColor,
        border: rail.borderTopColor,
        borderWidth: rail.borderTopWidth,
        shadow: rail.boxShadow,
      },
      segmentBackgrounds: [weather.backgroundColor, stats.backgroundColor, run.backgroundColor, controls.backgroundColor],
      dividers: [weather.borderRightColor, stats.borderRightColor, run.borderRightColor],
      dividerWidths: [weather.borderRightWidth, stats.borderRightWidth, run.borderRightWidth],
      lamp: {
        width: weatherLamp.width,
        height: weatherLamp.height,
        display: weatherLamp.display,
        background: weatherLamp.backgroundColor,
      },
      labels,
      values,
      control: {
        radius: controlButton.borderRadius,
        background: controlButton.backgroundColor,
        shadow: controlButton.boxShadow,
      },
      dock: {
        background: dock.backgroundColor,
        border: dock.borderTopColor,
        borderWidth: dock.borderTopWidth,
        shadow: dock.boxShadow,
        keyBackground: dockKey.backgroundColor,
        keyRadius: dockKey.borderRadius,
      },
    };
  });

  expect(visual.rail.background).not.toBe('rgba(0, 0, 0, 0)');
  expect(visual.rail.borderWidth).toBe('2px');
  expect(visual.rail.shadow).not.toBe('none');
  expect(new Set(visual.segmentBackgrounds).size).toBe(1);
  expect(new Set(visual.dividers).size).toBe(1);
  expect(visual.dividerWidths.every((width) => width === '1px')).toBe(true);

  expect(visual.lamp.display).not.toBe('none');
  expect(visual.lamp.width).toBe('8px');
  expect(visual.lamp.height).toBe('8px');
  expect(visual.lamp.background).not.toBe('rgba(0, 0, 0, 0)');

  expect(new Set(visual.labels.map((item) => item.family)).size).toBe(1);
  expect(new Set(visual.labels.map((item) => item.size)).size).toBe(1);
  expect(new Set(visual.labels.map((item) => item.color)).size).toBe(1);
  expect(new Set(visual.values.map((item) => item.family)).size).toBe(1);
  expect(new Set(visual.values.map((item) => item.size)).size).toBe(1);
  expect(new Set(visual.values.map((item) => item.weight)).size).toBe(1);

  expect(visual.control.radius).toBe('0px');
  expect(visual.control.background).not.toBe('rgba(0, 0, 0, 0)');
  expect(visual.control.shadow).not.toBe('none');
  expect(visual.dock.background).toBe(visual.rail.background);
  expect(visual.dock.border).toBe(visual.rail.border);
  expect(visual.dock.borderWidth).toBe(visual.rail.borderWidth);
  expect(visual.dock.shadow).not.toBe('none');
  expect(visual.dock.keyBackground).toBe(visual.control.background);
  expect(visual.dock.keyRadius).toBe('0px');
});

test('mobile HUD keeps the same language without clipping or control collisions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startGame(page);

  const mobile = await page.evaluate(() => {
    const rail = document.querySelector('#game-hud-rail').getBoundingClientRect();
    const controls = document.querySelector('#mobile-controls').getBoundingClientRect();
    const railStyle = getComputedStyle(document.querySelector('#game-hud-rail'));
    const mobileStyle = getComputedStyle(document.querySelector('#mobile-controls'));
    const action = getComputedStyle(document.querySelector('#btn-buy'));
    const small = getComputedStyle(document.querySelector('#btn-speed-down'));
    const metricNodes = Array.from(document.querySelectorAll('.hud-total, .hud-return, #excess-meter'));
    return {
      rail: { left: rail.left, right: rail.right, bottom: rail.bottom, height: rail.height },
      controlsTop: controls.top,
      metricsFit: metricNodes.every((node) => node.scrollWidth <= node.clientWidth + 1),
      railBackground: railStyle.backgroundColor,
      mobileBackground: mobileStyle.backgroundColor,
      actionRadius: action.borderRadius,
      actionShadow: action.boxShadow,
      smallRadius: small.borderRadius,
    };
  });

  expect(mobile.rail.left).toBeGreaterThanOrEqual(5);
  expect(mobile.rail.right).toBeLessThanOrEqual(385);
  expect(mobile.rail.height).toBeLessThanOrEqual(90);
  expect(mobile.rail.bottom).toBeLessThan(mobile.controlsTop);
  expect(mobile.metricsFit).toBe(true);
  expect(mobile.mobileBackground).toBe(mobile.railBackground);
  expect(mobile.actionRadius).toBe('0px');
  expect(mobile.smallRadius).toBe('0px');
  expect(mobile.actionShadow).not.toBe('none');
});