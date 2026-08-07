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

async function exposeGameChrome(page) {
  const startScreen = page.locator('#start-screen');
  if (await startScreen.evaluate((element) => element.classList.contains('active'))) {
    await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  }

  const rail = page.locator('#game-hud-rail');
  const pause = page.locator('#pause-btn');
  await expect(rail).toBeVisible();
  await expect(pause).toBeVisible();

  if (await pause.getAttribute('aria-pressed') === 'false') {
    await pause.click();
  }

  await page.evaluate(() => {
    window.FlappyKPremiumUIRefinement?.refineHudComposition?.();
    window.FlappyKPremiumUIRefinement?.refineDesktopControls?.();
    window.FlappyKMarketWeather?.syncWeatherStatusPlacement?.();
  });
}

test('home opens as a full-viewport market scene with immediate play', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparePage(page);
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('data-ui-state', 'home');
  await expect(page.locator('.home-console-bezel')).toBeVisible();
  await expect(page.locator('.home-console-screen')).toBeVisible();
  await expect(page.locator('.home-market-kicker')).toHaveText('LIVE DEMO · USE ↑ / ↓');
  await expect(page.getByRole('button', { name: 'PLAY', exact: true })).toBeVisible();
  await expect(page.locator('#market-weather-layer')).toHaveAttribute('data-weather', 'clear');

  const hierarchy = await page.evaluate(() => {
    const container = document.getElementById('game-container').getBoundingClientRect();
    const bezel = document.querySelector('.home-console-bezel').getBoundingClientRect();
    const screen = document.querySelector('.home-console-screen').getBoundingClientRect();
    const play = document.querySelector('#start-btn').getBoundingClientRect();
    const daily = document.querySelector('#daily-run-btn').getBoundingClientRect();
    const bezelStyle = getComputedStyle(document.querySelector('.home-console-bezel'));
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      containerWidth: container.width,
      containerHeight: container.height,
      bezelWidth: bezel.width,
      bezelHeight: bezel.height,
      screenWidth: screen.width,
      bezelBorder: bezelStyle.borderTopWidth,
      bezelShadow: bezelStyle.boxShadow,
      playArea: play.width * play.height,
      dailyArea: daily.width * daily.height,
    };
  });

  expect(Math.abs(hierarchy.containerWidth - hierarchy.viewportWidth)).toBeLessThanOrEqual(1);
  expect(Math.abs(hierarchy.containerHeight - hierarchy.viewportHeight)).toBeLessThanOrEqual(1);
  expect(Math.abs(hierarchy.bezelWidth - hierarchy.viewportWidth)).toBeLessThanOrEqual(1);
  expect(Math.abs(hierarchy.bezelHeight - hierarchy.viewportHeight)).toBeLessThanOrEqual(1);
  expect(Math.abs(hierarchy.screenWidth - hierarchy.viewportWidth)).toBeLessThanOrEqual(1);
  expect(hierarchy.bezelBorder).toBe('0px');
  expect(hierarchy.bezelShadow).toBe('none');
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

  await page.evaluate(() => {
    window.FlappyKMarketWeather.setWeatherState('clear');
  });

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

test('desktop HUD is one coordinated top rail with a matching input dock', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparePage(page);
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.FlappyKPremiumUIRefinement && window.FlappyKMarketWeather));
  await exposeGameChrome(page);

  const rail = page.locator('#game-hud-rail');
  await expect(rail).toBeVisible();

  const geometry = await page.evaluate(() => {
    const rail = document.getElementById('game-hud-rail').getBoundingClientRect();
    const weather = document.getElementById('weather-status').getBoundingClientRect();
    const stats = document.querySelector('.stats-box').getBoundingClientRect();
    const progress = document.getElementById('run-progress-panel').getBoundingClientRect();
    const controls = document.getElementById('game-top-controls').getBoundingClientRect();
    const hint = document.querySelector('.controls-hint').getBoundingClientRect();
    return {
      rail,
      weather,
      stats,
      progress,
      controls,
      hint,
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
    expect(child.top).toBeGreaterThanOrEqual(geometry.rail.top - 1);
    expect(child.bottom).toBeLessThanOrEqual(geometry.rail.bottom + 1);
  }
  expect(geometry.weather.right).toBeLessThanOrEqual(geometry.stats.left + 1);
  expect(geometry.stats.right).toBeLessThanOrEqual(geometry.progress.left + 1);
  expect(geometry.progress.right).toBeLessThanOrEqual(geometry.controls.left + 1);
  expect(Math.abs((geometry.hint.left + geometry.hint.width / 2) - (geometry.rail.left + geometry.rail.width / 2))).toBeLessThan(3);
});

test('mobile HUD uses two coordinated rows without colliding with thumb controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparePage(page);
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.FlappyKPremiumUIRefinement && window.FlappyKMarketWeather));
  await exposeGameChrome(page);

  const geometry = await page.evaluate(() => {
    const rail = document.getElementById('game-hud-rail').getBoundingClientRect();
    const weather = document.getElementById('weather-status').getBoundingClientRect();
    const stats = document.querySelector('.stats-box').getBoundingClientRect();
    const progress = document.getElementById('run-progress-panel').getBoundingClientRect();
    const controls = document.getElementById('game-top-controls').getBoundingClientRect();
    const mobile = document.getElementById('mobile-controls').getBoundingClientRect();
    return { rail, weather, stats, progress, controls, mobile };
  });

  expect(geometry.rail.left).toBeGreaterThanOrEqual(5);
  expect(geometry.rail.right).toBeLessThanOrEqual(385);
  expect(Math.abs(geometry.stats.top - geometry.controls.top)).toBeLessThan(2);
  expect(Math.abs(geometry.weather.top - geometry.progress.top)).toBeLessThan(2);
  expect(geometry.weather.top).toBeGreaterThanOrEqual(geometry.stats.bottom - 1);
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