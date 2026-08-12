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

test('desktop HUD uses modular pixel instruments with Excess as the primary score', async ({ page }) => {
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
    const metric = (selector) => {
      const style = css(selector);
      return { family: style.fontFamily, size: style.fontSize, color: style.color, weight: style.fontWeight };
    };
    const segments = [weather, stats, run, controls];
    return {
      rail: {
        background: rail.backgroundColor,
        borderWidth: rail.borderTopWidth,
        shadow: rail.boxShadow,
      },
      segments: segments.map((style) => ({
        background: style.backgroundColor,
        border: style.borderTopColor,
        borderWidth: style.borderTopWidth,
        shadow: style.boxShadow,
      })),
      lamp: {
        width: weatherLamp.width,
        height: weatherLamp.height,
        display: weatherLamp.display,
        background: weatherLamp.backgroundColor,
      },
      labels: {
        total: metric('.hud-total .hud-metric-label'),
        returns: metric('.hud-return .hud-metric-label'),
        excess: metric('.excess-meter-label > span'),
        run: metric('.hud-game .hud-metric-label'),
        day: metric('.hud-day .hud-metric-label'),
      },
      values: {
        total: metric('#total-display'),
        returns: metric('#return-display'),
        excess: metric('#live-excess-display'),
        run: metric('#level-display'),
        day: metric('#day-display'),
      },
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

  expect(visual.rail.background).toBe('rgba(0, 0, 0, 0)');
  expect(visual.rail.borderWidth).toBe('0px');
  expect(visual.rail.shadow).toBe('none');
  expect(new Set(visual.segments.map((segment) => segment.background)).size).toBe(1);
  expect(visual.segments[0].background).not.toBe('rgba(0, 0, 0, 0)');
  expect(new Set(visual.segments.map((segment) => segment.border)).size).toBe(1);
  expect(visual.segments.every((segment) => segment.borderWidth === '2px')).toBe(true);
  expect(visual.segments.every((segment) => segment.shadow !== 'none')).toBe(true);

  expect(visual.lamp.display).not.toBe('none');
  expect(visual.lamp.width).toBe('10px');
  expect(visual.lamp.height).toBe('10px');
  expect(visual.lamp.background).not.toBe('rgba(0, 0, 0, 0)');

  for (const label of Object.values(visual.labels)) {
    expect(label.family).toContain('Pixelify Sans');
    expect(parseFloat(label.size)).toBeGreaterThanOrEqual(9);
  }

  for (const value of Object.values(visual.values)) {
    expect(value.family).toContain('Pixelify Sans');
  }
  expect(visual.values.total.size).toBe('15px');
  expect(visual.values.returns.size).toBe('15px');
  expect(visual.values.run.size).toBe('15px');
  expect(visual.values.day.size).toBe('15px');
  expect(visual.values.excess.size).toBe('26px');
  expect(parseFloat(visual.values.excess.size)).toBeGreaterThan(parseFloat(visual.values.total.size));

  expect(visual.control.radius).toBe('0px');
  expect(visual.control.background).not.toBe('rgba(0, 0, 0, 0)');
  expect(visual.control.shadow).not.toBe('none');
  expect(visual.dock.background).toBe(visual.segments[0].background);
  expect(visual.dock.border).toBe(visual.segments[0].border);
  expect(visual.dock.borderWidth).toBe(visual.segments[0].borderWidth);
  expect(visual.dock.shadow).not.toBe('none');
  expect(visual.dock.keyBackground).toBe(visual.control.background);
  expect(visual.dock.keyRadius).toBe('0px');
});

test('mobile HUD keeps the readable score-first language without clipping or control collisions', async ({ page }) => {
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
    const secondary = getComputedStyle(document.querySelector('#total-display'));
    const excess = getComputedStyle(document.querySelector('#live-excess-display'));
    const label = getComputedStyle(document.querySelector('.stats-box .hud-metric-label'));
    const alpha = (value) => {
      const match = String(value).match(/rgba?\([^,]+,[^,]+,[^,]+(?:,\s*([\d.]+))?\)/);
      return match?.[1] === undefined ? 1 : Number(match[1]);
    };
    return {
      rail: { left: rail.left, right: rail.right, bottom: rail.bottom, height: rail.height },
      controlsTop: controls.top,
      metricsFit: metricNodes.every((node) => node.scrollWidth <= node.clientWidth + 1),
      railAlpha: alpha(railStyle.backgroundColor),
      mobileAlpha: alpha(mobileStyle.backgroundColor),
      actionRadius: action.borderRadius,
      actionShadow: action.boxShadow,
      smallRadius: small.borderRadius,
      secondarySize: secondary.fontSize,
      excessSize: excess.fontSize,
      labelSize: label.fontSize,
    };
  });

  expect(mobile.rail.left).toBeGreaterThanOrEqual(5);
  expect(mobile.rail.right).toBeLessThanOrEqual(385);
  expect(mobile.rail.height).toBeGreaterThanOrEqual(96);
  expect(mobile.rail.height).toBeLessThanOrEqual(120);
  expect(mobile.rail.bottom).toBeLessThan(mobile.controlsTop);
  expect(mobile.metricsFit).toBe(true);
  expect(mobile.railAlpha).toBeLessThan(0.5);
  expect(mobile.mobileAlpha).toBeGreaterThan(mobile.railAlpha);
  expect(mobile.actionRadius).toBe('0px');
  expect(mobile.smallRadius).toBe('0px');
  expect(mobile.actionShadow).not.toBe('none');
  expect(mobile.secondarySize).toBe('11px');
  expect(mobile.excessSize).toBe('18px');
  expect(parseFloat(mobile.labelSize)).toBeGreaterThanOrEqual(9);
  expect(parseFloat(mobile.excessSize)).toBeGreaterThan(parseFloat(mobile.secondarySize));
});
