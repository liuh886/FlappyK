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
          type: 'square',
          frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
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

async function exposeGameChrome(page) {
  const startScreen = page.locator('#start-screen');
  if (await startScreen.evaluate((element) => element.classList.contains('active'))) {
    await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  }

  const rail = page.locator('#game-hud-rail');
  const pause = page.locator('#pause-btn');
  await expect(rail).toBeVisible();
  await expect(pause).toBeVisible();

  if (await pause.getAttribute('aria-pressed') === 'false') await pause.click();

  await page.evaluate(() => {
    window.FlappyKPremiumUIRefinement?.refineHudComposition?.();
    window.FlappyKPremiumUIRefinement?.refineDesktopControls?.();
    window.FlappyKMarketWeather?.syncWeatherStatusPlacement?.();
  });
}

function inside(inner, outer, tolerance = 1) {
  return inner.left >= outer.left - tolerance
    && inner.right <= outer.right + tolerance
    && inner.top >= outer.top - tolerance
    && inner.bottom <= outer.bottom + tolerance;
}

test('home opens as an inset market terminal with immediate play', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparePage(page);
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('data-ui-state', 'home');
  await expect(page.locator('.home-console-bezel')).toBeVisible();
  await expect(page.locator('.home-console-screen')).toBeVisible();
  await expect(page.locator('.home-console-series')).toHaveText('HIDDEN MARKET ARCADE');
  await expect(page.locator('.home-console-kicker')).toHaveText('3 WORLDS · 250 DAYS · BEAT THE MARKET');
  await expect(page.locator('.home-world')).toHaveCount(3);
  await expect(page.locator('.home-world-name')).toHaveText(['CRYPTO', 'A-SHARES', 'US STOCKS']);
  await expect(page.getByRole('button', { name: 'PLAY', exact: true })).toBeVisible();
  await expect(page.locator('#market-weather-layer')).toHaveAttribute('data-weather', 'clear');

  const hierarchy = await page.evaluate(() => {
    const box = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    const bezelStyle = getComputedStyle(document.querySelector('.home-console-bezel'));
    const play = box('#start-btn');
    const daily = box('#daily-run-btn');
    return {
      viewport: { left: 0, top: 0, right: innerWidth, bottom: innerHeight, width: innerWidth, height: innerHeight },
      container: box('#game-container'),
      bezel: box('.home-console-bezel'),
      screen: box('.home-console-screen'),
      bezelBorder: bezelStyle.borderTopWidth,
      bezelShadow: bezelStyle.boxShadow,
      bezelRadius: bezelStyle.borderRadius,
      playArea: play.width * play.height,
      dailyArea: daily.width * daily.height,
    };
  });

  expect(Math.abs(hierarchy.container.width - hierarchy.viewport.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(hierarchy.container.height - hierarchy.viewport.height)).toBeLessThanOrEqual(1);
  expect(inside(hierarchy.bezel, hierarchy.viewport, 1)).toBe(true);
  expect(inside(hierarchy.screen, hierarchy.bezel, 1)).toBe(true);
  expect(hierarchy.bezel.width).toBeLessThan(hierarchy.viewport.width);
  expect(hierarchy.bezel.height).toBeLessThan(hierarchy.viewport.height);
  expect(hierarchy.bezelBorder).not.toBe('0px');
  expect(hierarchy.bezelShadow).not.toBe('none');
  expect(hierarchy.bezelRadius).toBe('0px');
  expect(hierarchy.playArea).toBeGreaterThan(hierarchy.dailyArea);
});

test('arcade controls use semantic pixel glyphs and keyboard press feedback', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparePage(page);
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.FlappyKMarketWeather));

  const playButton = page.getByRole('button', { name: 'PLAY', exact: true });
  const playIcon = playButton.locator('.home-play-icon');
  await expect(playIcon).toHaveText('▶');
  await expect(playIcon).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#btn-buy .trade-emoji')).toHaveText('▲');
  await expect(page.locator('#btn-sell .trade-emoji')).toHaveText('▼');
  await expect(page.locator('#btn-buy .trade-emoji')).toHaveClass(/pixel-trade-glyph/);
  await expect(page.locator('#btn-sell .trade-emoji')).toHaveClass(/pixel-trade-glyph/);

  await page.evaluate(() => {
    const button = document.getElementById('start-btn');
    button.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  });
  await expect(playButton).toHaveClass(/is-arcade-pressed/);

  await page.evaluate(() => {
    const button = document.getElementById('start-btn');
    button.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
  });
  await expect(playButton).not.toHaveClass(/is-arcade-pressed/);
});

test('weather stages clear to rain and rain to clear through cloudy', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparePage(page);
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.FlappyKMarketWeather));
  await exposeGameChrome(page);

  const layer = page.locator('#market-weather-layer');
  const root = page.locator('html');

  await page.evaluate(() => {
    window.FlappyKMarketWeather.setWeatherState('clear', { immediate: true });
    window.FlappyKMarketWeather.setWeatherState('rain');
  });

  await expect(root).toHaveAttribute('data-market-weather', 'rain');
  await expect(layer).toHaveAttribute('data-weather-target', 'rain');
  await expect(layer).toHaveAttribute('data-weather-transition', 'clear-to-cloudy', { timeout: 800 });
  await expect(layer).toHaveAttribute('data-weather', 'cloudy', { timeout: 1300 });
  await expect(layer).toHaveAttribute('data-weather-transition', 'cloudy-to-rain', { timeout: 800 });
  await expect(layer).toHaveAttribute('data-weather', 'rain', { timeout: 1300 });

  await page.evaluate(() => window.FlappyKMarketWeather.setWeatherState('clear'));

  await expect(root).toHaveAttribute('data-market-weather', 'clear');
  await expect(layer).toHaveAttribute('data-weather-target', 'clear');
  await expect(layer).toHaveAttribute('data-weather-transition', 'rain-to-cloudy', { timeout: 800 });
  await expect(layer).toHaveAttribute('data-weather', 'cloudy', { timeout: 1300 });
  await expect(layer).toHaveAttribute('data-weather-transition', 'cloudy-to-clear', { timeout: 800 });
  await expect(layer).toHaveAttribute('data-weather', 'clear', { timeout: 1300 });
});

test('an interrupted weather transition settles at the latest requested state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparePage(page);
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.FlappyKMarketWeather));
  await exposeGameChrome(page);

  await page.evaluate(() => {
    window.FlappyKMarketWeather.setWeatherState('clear', { immediate: true });
    window.FlappyKMarketWeather.setWeatherState('rain');
    window.setTimeout(() => window.FlappyKMarketWeather.setWeatherState('clear'), 220);
  });

  await expect(page.locator('html')).toHaveAttribute('data-market-weather', 'clear');
  await expect(page.locator('#market-weather-layer')).toHaveAttribute('data-weather', 'clear', { timeout: 1800 });
  await expect.poll(async () => page.evaluate(() => window.FlappyKMarketWeather.requestedWeather)).toBe('clear');
  await expect.poll(async () => page.evaluate(() => window.FlappyKMarketWeather.visualWeather)).toBe('clear');
});

test('desktop HUD is one compact two-row terminal rail', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparePage(page);
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.FlappyKPremiumUIRefinement && window.FlappyKMarketWeather));
  await exposeGameChrome(page);

  const geometry = await page.evaluate(() => {
    const box = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    return {
      viewport: { left: 0, top: 0, right: innerWidth, bottom: innerHeight },
      rail: box('#game-hud-rail'),
      weather: box('#weather-status'),
      stats: box('.stats-box'),
      progress: box('#run-progress-panel'),
      controls: box('#game-top-controls'),
      hint: box('.controls-hint'),
      parents: {
        weather: document.getElementById('weather-status').parentElement?.id,
        stats: document.querySelector('.stats-box').parentElement?.id,
        progress: document.getElementById('run-progress-panel').parentElement?.id,
        controls: document.getElementById('game-top-controls').parentElement?.id,
      },
    };
  });

  for (const parent of Object.values(geometry.parents)) expect(parent).toBe('game-hud-rail');
  for (const child of [geometry.weather, geometry.stats, geometry.progress, geometry.controls]) {
    expect(inside(child, geometry.rail, 2)).toBe(true);
  }
  expect(Math.abs(geometry.stats.top - geometry.controls.top)).toBeLessThan(3);
  expect(Math.abs(geometry.weather.top - geometry.progress.top)).toBeLessThan(3);
  expect(geometry.weather.top).toBeGreaterThanOrEqual(geometry.stats.bottom - 2);
  expect(inside(geometry.hint, geometry.viewport, 1)).toBe(true);
  expect(geometry.hint.top).toBeGreaterThan(geometry.rail.bottom + 40);
});

test('mobile HUD uses two coordinated rows without colliding with thumb controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparePage(page);
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.FlappyKPremiumUIRefinement && window.FlappyKMarketWeather));
  await exposeGameChrome(page);

  const geometry = await page.evaluate(() => {
    const box = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    return {
      viewport: { left: 0, top: 0, right: innerWidth, bottom: innerHeight },
      rail: box('#game-hud-rail'),
      weather: box('#weather-status'),
      stats: box('.stats-box'),
      progress: box('#run-progress-panel'),
      controls: box('#game-top-controls'),
      mobile: box('#mobile-controls'),
    };
  });

  expect(inside(geometry.rail, geometry.viewport, 2)).toBe(true);
  expect(inside(geometry.mobile, geometry.viewport, 2)).toBe(true);
  expect(Math.abs(geometry.stats.top - geometry.controls.top)).toBeLessThan(3);
  expect(Math.abs(geometry.weather.top - geometry.progress.top)).toBeLessThan(3);
  expect(geometry.weather.top).toBeGreaterThanOrEqual(geometry.stats.bottom - 2);
  expect(geometry.rail.bottom).toBeLessThan(geometry.mobile.top);
});

test('weather boundary events are brief, crisp, readable, and non-blocking', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparePage(page);
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.FlappyKMarketWeather));
  await exposeGameChrome(page);
  await expect(page.locator('html')).toHaveAttribute('data-ui-state', 'paused');

  await page.evaluate(() => {
    window.FlappyKMarketWeather.setWeatherState('clear', { immediate: true, source: 'manual' });
    window.FlappyKMarketWeather.applyMetrics(
      { playerReturn: 0.02, marketReturn: 0.01, excess: 0.01 },
      { silent: true, immediate: true, source: 'manual' },
    );
  });

  const status = page.locator('#weather-status');
  await expect(status).not.toHaveClass(/is-event/);

  await page.evaluate(() => {
    window.FlappyKMarketWeather.applyMetrics(
      { playerReturn: -0.01, marketReturn: -0.02, excess: 0.01 },
      { source: 'manual' },
    );
  });

  await expect(status).toHaveText('RETURN BELOW ZERO');
  await expect(status).toHaveClass(/is-event/);
  await expect(page.locator('#market-weather-layer')).toHaveCSS('pointer-events', 'none');
  await expect(status).toHaveCSS('transform', 'none');
  await expect(status).not.toHaveClass(/is-event/, { timeout: 2000 });
});
