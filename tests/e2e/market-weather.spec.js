const { test, expect } = require('@playwright/test');

async function preparePage(page, { language } = {}) {
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await page.route('https://raw.githubusercontent.com/**', (route) => route.abort());
  await page.route('https://html2canvas.hertzen.com/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: 'window.html2canvas = async () => document.createElement("canvas");',
  }));
  await page.addInitScript(({ presetLanguage }) => {
    window.localStorage.setItem('flappyk_onboarding_seen_v1', '1');
    if (presetLanguage) window.localStorage.setItem('flappyk_language_v1', presetLanguage);
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
  }, { presetLanguage: language || null });
}

async function exposeGameChrome(page) {
  const startScreen = page.locator('#start-screen');
  if (await startScreen.evaluate((element) => element.classList.contains('active'))) {
    await page.locator('#start-btn').click();
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

function inside(inner, outer, tolerance = 2) {
  return inner.left >= outer.left - tolerance
    && inner.right <= outer.right + tolerance
    && inner.top >= outer.top - tolerance
    && inner.bottom <= outer.bottom + tolerance;
}

test('home opens as one readable Market Arcade surface with immediate play', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparePage(page);
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('data-ui-state', 'home');
  await expect(page.locator('.home-console-bezel')).toBeVisible();
  await expect(page.locator('.home-console-screen')).toBeVisible();
  await expect(page.locator('.home-world-name')).toHaveText(['CRYPTO', 'A-SHARES', 'US STOCKS']);
  await expect(page.locator('#start-btn')).toBeVisible();
  await expect(page.locator('#market-weather-layer')).toHaveAttribute('data-weather', 'clear');

  const surface = await page.evaluate(() => {
    const rect = document.querySelector('.home-console-bezel').getBoundingClientRect();
    const style = getComputedStyle(document.querySelector('.home-console-bezel'));
    const titleStyle = getComputedStyle(document.getElementById('game-title'));
    const playStyle = getComputedStyle(document.getElementById('start-btn'));
    const introStyle = getComputedStyle(document.querySelector('.home-console-intro-copy'));
    return {
      rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
      viewport: { left: 0, top: 0, right: innerWidth, bottom: innerHeight },
      radius: style.borderRadius,
      shadow: style.boxShadow,
      titleSize: parseFloat(titleStyle.fontSize),
      introSize: parseFloat(introStyle.fontSize),
      playSize: parseFloat(playStyle.fontSize),
      playHeight: document.getElementById('start-btn').getBoundingClientRect().height,
    };
  });

  expect(inside(surface.rect, surface.viewport)).toBe(true);
  expect(surface.radius).toBe('0px');
  expect(surface.shadow).not.toBe('none');
  expect(surface.titleSize).toBeGreaterThanOrEqual(48);
  expect(surface.introSize).toBeGreaterThanOrEqual(17);
  expect(surface.playSize).toBeGreaterThanOrEqual(20);
  expect(surface.playHeight).toBeGreaterThanOrEqual(68);
});

test('arcade controls use semantic DOM labels and keyboard press feedback', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparePage(page);
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.FlappyKMarketWeather));

  const playButton = page.locator('#start-btn');
  const playIcon = playButton.locator('.home-play-icon');
  await expect(playIcon).toHaveText('▶');
  await expect(playIcon).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#btn-buy')).toContainText('BUY');
  await expect(page.locator('#btn-sell')).toContainText('SELL');
  await expect(page.locator('.trade-emoji, .pixel-trade-glyph')).toHaveCount(0);

  await page.evaluate(() => {
    document.getElementById('start-btn').dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  });
  await expect(playButton).toHaveClass(/is-arcade-pressed/);
  await page.evaluate(() => {
    document.getElementById('start-btn').dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
  });
  await expect(playButton).not.toHaveClass(/is-arcade-pressed/);
});

test('weather stages clear to rain and back through cloudy', async ({ page }) => {
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
  await expect(layer).toHaveAttribute('data-weather', 'cloudy', { timeout: 1400 });
  await expect(layer).toHaveAttribute('data-weather', 'rain', { timeout: 1600 });

  await page.evaluate(() => window.FlappyKMarketWeather.setWeatherState('clear'));
  await expect(root).toHaveAttribute('data-market-weather', 'clear');
  await expect(layer).toHaveAttribute('data-weather', 'cloudy', { timeout: 1400 });
  await expect(layer).toHaveAttribute('data-weather', 'clear', { timeout: 1600 });
});

test('desktop HUD remains one rail while key game state is readable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparePage(page);
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.FlappyKPremiumUIRefinement && window.FlappyKMarketWeather));
  await exposeGameChrome(page);

  const geometry = await page.evaluate(() => {
    const box = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    };
    const rail = document.getElementById('game-hud-rail');
    const total = document.querySelector('.hud-total > span:last-child');
    const label = document.querySelector('.hud-metric-label');
    return {
      rail: box('#game-hud-rail'),
      weather: box('#weather-status'),
      stats: box('.stats-box'),
      progress: box('#run-progress-panel'),
      controls: box('#game-top-controls'),
      parents: [
        document.getElementById('weather-status').parentElement?.id,
        document.querySelector('.stats-box').parentElement?.id,
        document.getElementById('run-progress-panel').parentElement?.id,
        document.getElementById('game-top-controls').parentElement?.id,
      ],
      weatherInsidePanel: Boolean(
        document.getElementById('weather-status')?.closest('#run-progress-panel'),
      ),
      shadow: getComputedStyle(rail).boxShadow,
      totalSize: parseFloat(getComputedStyle(total).fontSize),
      labelSize: parseFloat(getComputedStyle(label).fontSize),
    };
  });

  // The weather readout nests inside the run-progress strip, still one rail.
  expect(geometry.parents[0]).toBe('run-progress-panel');
  expect(geometry.weatherInsidePanel).toBe(true);
  geometry.parents.slice(1).forEach((parent) => expect(parent).toBe('game-hud-rail'));
  [geometry.weather, geometry.stats, geometry.progress, geometry.controls]
    .forEach((child) => expect(inside(child, geometry.rail)).toBe(true));
  expect(geometry.shadow).not.toBe('none');
  expect(geometry.totalSize).toBeGreaterThanOrEqual(18);
  expect(geometry.labelSize).toBeGreaterThanOrEqual(11);
});

test('mobile gameplay keeps navigation tappable and speed inside the command dock', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparePage(page);
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.FlappyKMarketWeather));
  await exposeGameChrome(page);

  const layout = await page.evaluate(() => {
    const box = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    const weather = document.getElementById('weather-status');
    const total = document.querySelector('.hud-total > span:last-child');
    return {
      viewport: { left: 0, top: 0, right: innerWidth, bottom: innerHeight },
      dock: box('#mobile-controls'),
      buy: box('#btn-buy'),
      sell: box('#btn-sell'),
      speed: box('#mobile-controls .mobile-speed-control'),
      back: box('#game-back-btn'),
      pause: box('#pause-btn'),
      weatherDisplay: getComputedStyle(weather).display,
      totalSize: parseFloat(getComputedStyle(total).fontSize),
    };
  });

  expect(layout.weatherDisplay).toBe('none');
  [layout.dock, layout.buy, layout.sell, layout.speed, layout.back, layout.pause]
    .forEach((item) => expect(inside(item, layout.viewport)).toBe(true));
  [layout.buy, layout.sell, layout.speed]
    .forEach((item) => expect(inside(item, layout.dock)).toBe(true));
  expect(layout.back.width).toBeGreaterThanOrEqual(44);
  expect(layout.back.height).toBeGreaterThanOrEqual(44);
  expect(layout.pause.width).toBeGreaterThanOrEqual(44);
  expect(layout.pause.height).toBeGreaterThanOrEqual(44);
  expect(layout.totalSize).toBeGreaterThanOrEqual(16);
  expect(layout.speed.top).toBeGreaterThanOrEqual(layout.dock.top);
});

test('Chinese mode preserves the same market-state hierarchy', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparePage(page, { language: 'zh' });
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.FlappyKMarketWeather));

  await expect(page.locator('html')).toHaveAttribute('data-flappyk-language', 'zh');
  await expect(page.locator('#start-btn')).toContainText('开始游戏');
  await expect(page.locator('#weather-status')).toContainText('晴空');
});
