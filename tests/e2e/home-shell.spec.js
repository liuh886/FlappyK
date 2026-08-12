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

test('desktop home owns the viewport and PLAY keeps the game fullscreen', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparePage(page);
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('data-ui-state', 'home');
  await expect(page.locator('.home-console-bezel')).toBeVisible();

  const home = await page.evaluate(() => {
    const rect = (selector) => document.querySelector(selector).getBoundingClientRect();
    const style = (selector) => getComputedStyle(document.querySelector(selector));
    const container = rect('#game-container');
    const start = rect('#start-screen');
    const bezel = rect('.home-console-bezel');
    const screen = rect('.home-console-screen');
    const containerStyle = style('#game-container');
    const bezelStyle = style('.home-console-bezel');
    const screenStyle = style('.home-console-screen');
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scrollHeight: document.scrollingElement.scrollHeight,
      container: { left: container.left, top: container.top, width: container.width, height: container.height },
      start: { left: start.left, top: start.top, width: start.width, height: start.height },
      bezel: { left: bezel.left, top: bezel.top, width: bezel.width, height: bezel.height },
      screen: { width: screen.width },
      containerBorder: containerStyle.borderTopWidth,
      containerShadow: containerStyle.boxShadow,
      bezelBorder: bezelStyle.borderTopWidth,
      bezelOutline: bezelStyle.outlineStyle,
      bezelShadow: bezelStyle.boxShadow,
      bezelClip: bezelStyle.clipPath,
      screenBorder: screenStyle.borderTopWidth,
      screenOutline: screenStyle.outlineStyle,
      screenShadow: screenStyle.boxShadow,
    };
  });

  expect(Math.abs(home.container.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(home.container.top)).toBeLessThanOrEqual(1);
  expect(Math.abs(home.container.width - home.viewport.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(home.container.height - home.viewport.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(home.start.width - home.viewport.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(home.start.height - home.viewport.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(home.bezel.width - home.viewport.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(home.bezel.height - home.viewport.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(home.screen.width - home.viewport.width)).toBeLessThanOrEqual(1);
  expect(home.scrollHeight).toBeLessThanOrEqual(home.viewport.height + 1);
  expect(home.containerBorder).toBe('0px');
  expect(home.containerShadow).toBe('none');
  expect(home.bezelBorder).toBe('0px');
  expect(home.bezelOutline).toBe('none');
  expect(home.bezelShadow).toBe('none');
  expect(home.bezelClip).toBe('none');
  expect(home.screenBorder).toBe('0px');
  expect(home.screenOutline).toBe('none');
  expect(home.screenShadow).toBe('none');

  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-ui-state', 'playing');
  await expect.poll(() => page.locator('#game-canvas').getAttribute('width')).toBe(String(home.viewport.width));
  await expect.poll(() => page.locator('#game-canvas').getAttribute('height')).toBe(String(home.viewport.height));

  const gameplay = await page.evaluate(() => {
    const container = document.getElementById('game-container').getBoundingClientRect();
    const style = getComputedStyle(document.getElementById('game-container'));
    return {
      left: container.left,
      top: container.top,
      width: container.width,
      height: container.height,
      border: style.borderTopWidth,
      shadow: style.boxShadow,
    };
  });

  expect(Math.abs(gameplay.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(gameplay.top)).toBeLessThanOrEqual(1);
  expect(Math.abs(gameplay.width - home.viewport.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(gameplay.height - home.viewport.height)).toBeLessThanOrEqual(1);
  expect(gameplay.border).toBe('0px');
  expect(gameplay.shadow).toBe('none');
});

test('mobile home remains one full-screen scene without document scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparePage(page);
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('data-ui-state', 'home');
  await expect(page.getByRole('button', { name: 'PLAY', exact: true })).toBeVisible();

  const mobile = await page.evaluate(() => {
    const container = document.getElementById('game-container').getBoundingClientRect();
    const bezel = document.querySelector('.home-console-bezel').getBoundingClientRect();
    const bezelStyle = getComputedStyle(document.querySelector('.home-console-bezel'));
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollHeight: document.scrollingElement.scrollHeight,
      container: { left: container.left, top: container.top, width: container.width, height: container.height },
      bezel: { width: bezel.width, height: bezel.height },
      bezelBorder: bezelStyle.borderTopWidth,
      bezelShadow: bezelStyle.boxShadow,
    };
  });

  expect(Math.abs(mobile.container.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(mobile.container.top)).toBeLessThanOrEqual(1);
  expect(Math.abs(mobile.container.width - mobile.innerWidth)).toBeLessThanOrEqual(1);
  expect(Math.abs(mobile.container.height - mobile.innerHeight)).toBeLessThanOrEqual(1);
  expect(Math.abs(mobile.bezel.width - mobile.innerWidth)).toBeLessThanOrEqual(1);
  expect(Math.abs(mobile.bezel.height - mobile.innerHeight)).toBeLessThanOrEqual(1);
  expect(mobile.scrollHeight).toBeLessThanOrEqual(mobile.innerHeight + 1);
  expect(mobile.bezelBorder).toBe('0px');
  expect(mobile.bezelShadow).toBe('none');
});