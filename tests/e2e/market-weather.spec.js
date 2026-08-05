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

test('home opens as a lightweight handheld arcade with immediate play', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparePage(page);
  await page.goto('/');

  await expect(page.locator('.home-console-bezel')).toBeVisible();
  await expect(page.locator('.home-console-screen')).toBeVisible();
  await expect(page.locator('.home-console-kicker')).toHaveText('HIDDEN MARKET · PRESS PLAY');
  await expect(page.getByRole('button', { name: 'PLAY', exact: true })).toBeVisible();
  await expect(page.locator('#market-weather-layer')).toHaveAttribute('data-weather', 'clear');

  const hierarchy = await page.evaluate(() => {
    const bezel = document.querySelector('.home-console-bezel').getBoundingClientRect();
    const screen = document.querySelector('.home-console-screen').getBoundingClientRect();
    const play = document.querySelector('#start-btn').getBoundingClientRect();
    const daily = document.querySelector('#daily-run-btn').getBoundingClientRect();
    return {
      bezelWidth: bezel.width,
      screenWidth: screen.width,
      playArea: play.width * play.height,
      dailyArea: daily.width * daily.height,
    };
  });

  expect(hierarchy.bezelWidth).toBeLessThanOrEqual(760);
  expect(hierarchy.screenWidth).toBeLessThan(hierarchy.bezelWidth);
  expect(hierarchy.playArea).toBeGreaterThan(hierarchy.dailyArea);
});

test('weather maps performance to clear, cloudy, and rain without changing gameplay', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparePage(page);
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.FlappyKMarketWeather));

  await page.evaluate(() => {
    document.querySelector('#start-screen').classList.remove('active');
    window.FlappyKMarketWeather.applyMetrics({ playerReturn: 0.04, marketReturn: 0.02, excess: 0.02 }, { silent: true });
  });
  await expect(page.locator('#market-weather-layer')).toHaveAttribute('data-weather', 'clear');
  await expect(page.locator('html')).toHaveAttribute('data-market-weather', 'clear');

  await page.evaluate(() => {
    window.FlappyKMarketWeather.applyMetrics({ playerReturn: 0.04, marketReturn: 0.07, excess: -0.03 }, { silent: true });
  });
  await expect(page.locator('#market-weather-layer')).toHaveAttribute('data-weather', 'cloudy');
  await expect(page.locator('html')).toHaveAttribute('data-market-weather', 'cloudy');

  await page.evaluate(() => {
    window.FlappyKMarketWeather.applyMetrics({ playerReturn: -0.01, marketReturn: -0.03, excess: 0.02 }, { silent: true });
  });
  await expect(page.locator('#market-weather-layer')).toHaveAttribute('data-weather', 'rain');
  await expect(page.locator('html')).toHaveAttribute('data-market-weather', 'rain');
});

test('weather boundary events are brief, readable, and non-blocking', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparePage(page);
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.FlappyKMarketWeather));

  await page.evaluate(() => {
    document.querySelector('#start-screen').classList.remove('active');
    window.FlappyKMarketWeather.applyMetrics({ playerReturn: 0.02, marketReturn: 0.01, excess: 0.01 }, { silent: true });
    window.FlappyKMarketWeather.applyMetrics({ playerReturn: -0.01, marketReturn: -0.02, excess: 0.01 });
  });

  const status = page.locator('#weather-status');
  await expect(status).toHaveText('RETURN BELOW ZERO');
  await expect(status).toHaveClass(/is-event/);
  await expect(page.locator('#market-weather-layer')).toHaveCSS('pointer-events', 'none');
  await expect(status).not.toHaveClass(/is-event/, { timeout: 2000 });
});
