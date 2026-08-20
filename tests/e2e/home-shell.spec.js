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

function inside(inner, outer, tolerance = 1) {
  return inner.left >= outer.left - tolerance
    && inner.right <= outer.right + tolerance
    && inner.top >= outer.top - tolerance
    && inner.bottom <= outer.bottom + tolerance;
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`${viewport.name} home keeps the Market Arcade surface and PLAY enters fullscreen gameplay`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await preparePage(page);
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('data-ui-state', 'home');
    await expect(page.locator('.home-console-bezel')).toBeVisible();
    await expect(page.getByRole('button', { name: 'PLAY', exact: true })).toBeVisible();

    const home = await page.evaluate(() => {
      const rect = (selector) => {
        const value = document.querySelector(selector).getBoundingClientRect();
        return {
          left: value.left,
          top: value.top,
          right: value.right,
          bottom: value.bottom,
          width: value.width,
          height: value.height,
        };
      };
      const style = (selector) => getComputedStyle(document.querySelector(selector));
      return {
        viewport: { left: 0, top: 0, right: innerWidth, bottom: innerHeight, width: innerWidth, height: innerHeight },
        container: rect('#game-container'),
        start: rect('#start-screen'),
        bezel: rect('.home-console-bezel'),
        screen: rect('.home-console-screen'),
        play: rect('#start-btn'),
        documentWidth: document.scrollingElement.scrollWidth,
        documentHeight: document.scrollingElement.scrollHeight,
        startScrollHeight: document.getElementById('start-screen').scrollHeight,
        startClientHeight: document.getElementById('start-screen').clientHeight,
        containerBorder: style('#game-container').borderTopWidth,
        bezelBorder: style('.home-console-bezel').borderTopWidth,
        bezelShadow: style('.home-console-bezel').boxShadow,
        bezelRadius: style('.home-console-bezel').borderRadius,
        playRadius: style('#start-btn').borderRadius,
        playShadow: style('#start-btn').boxShadow,
        playBackground: style('#start-btn').backgroundColor,
        playFont: parseFloat(style('#start-btn').fontSize),
      };
    });

    expect(Math.abs(home.container.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(home.container.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(home.container.width - home.viewport.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(home.container.height - home.viewport.height)).toBeLessThanOrEqual(1);
    expect(Math.abs(home.start.width - home.viewport.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(home.start.height - home.viewport.height)).toBeLessThanOrEqual(1);
    expect(home.bezel.left).toBeGreaterThanOrEqual(home.viewport.left - 1);
    expect(home.bezel.right).toBeLessThanOrEqual(home.viewport.right + 1);
    expect(home.screen.left).toBeGreaterThanOrEqual(home.bezel.left - 1);
    expect(home.screen.right).toBeLessThanOrEqual(home.bezel.right + 1);
    expect(inside(home.play, home.viewport, 1)).toBe(true);
    expect(home.documentWidth).toBeLessThanOrEqual(home.viewport.width + 1);
    expect(home.documentHeight).toBeLessThanOrEqual(home.viewport.height + 1);
    if (viewport.name === 'desktop') {
      expect(inside(home.bezel, home.viewport, 1)).toBe(true);
      expect(inside(home.screen, home.bezel, 1)).toBe(true);
    } else {
      expect(home.startScrollHeight).toBeGreaterThanOrEqual(home.startClientHeight);
    }
    expect(home.containerBorder).toBe('0px');
    expect(home.bezelBorder).not.toBe('0px');
    expect(home.bezelShadow).not.toBe('none');
    expect(home.bezelRadius).toBe('0px');
    expect(home.playRadius).toBe('0px');
    expect(home.playShadow).not.toBe('none');
    expect(home.playBackground).not.toBe('rgba(0, 0, 0, 0)');
    expect(home.playFont).toBeGreaterThanOrEqual(viewport.name === 'mobile' ? 20 : 20);

    await page.getByRole('button', { name: 'PLAY', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-ui-state', 'playing');
    await expect(page.locator('#game-hud-rail')).toBeVisible();
    await expect.poll(() => page.locator('#game-canvas').getAttribute('width')).toBe(String(viewport.width));
    await expect.poll(() => page.locator('#game-canvas').getAttribute('height')).toBe(String(viewport.height));

    const gameplay = await page.evaluate(() => {
      const container = document.getElementById('game-container').getBoundingClientRect();
      return {
        left: container.left,
        top: container.top,
        width: container.width,
        height: container.height,
        border: getComputedStyle(document.getElementById('game-container')).borderTopWidth,
      };
    });

    expect(Math.abs(gameplay.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(gameplay.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(gameplay.width - viewport.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(gameplay.height - viewport.height)).toBeLessThanOrEqual(1);
    expect(gameplay.border).toBe('0px');
  });
}
