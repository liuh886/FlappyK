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
    window.localStorage.setItem('flappyk_language_v1', 'en');
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      value: 5,
    });
    class SilentAudioContext {
      constructor() {
        this.currentTime = 0;
        this.state = 'running';
        this.destination = {};
      }
      createOscillator() {
        return {
          type: 'square',
          frequency: { value: 0 },
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

test('virtual controls stay inside a wide touch viewport', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await preparePage(page);
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('data-layout', 'compact');
  await expect(page.locator('html')).toHaveAttribute('data-input', 'touch');
  await expect(page.locator('html')).toHaveAttribute('data-virtual-controls', 'true');
  await page.getByRole('button', { name: 'PLAY', exact: true }).click();

  const controls = page.locator('#mobile-controls');
  await expect(controls).toBeVisible();
  await expect(controls).not.toHaveAttribute('hidden', '');
  await expect(page.locator('#btn-buy')).toBeVisible();
  await expect(page.locator('#btn-sell')).toBeVisible();
  await expect(page.locator('#btn-speed-down')).toBeVisible();
  await expect(page.locator('#btn-speed-up')).toBeVisible();
  await expect(page.locator('#mobile-speed-readout')).toHaveText('15×');

  const layout = await controls.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      position: style.position,
      display: style.display,
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
      order: Array.from(element.children).map((child) => child.id || child.className),
    };
  });

  expect(layout.position).toBe('fixed');
  expect(layout.display).toBe('grid');
  expect(layout.height).toBeGreaterThan(60);
  expect(layout.top).toBeGreaterThan(0);
  expect(layout.bottom).toBeLessThanOrEqual(layout.innerHeight + 1);
  expect(layout.innerWidth).toBe(820);
  expect(layout.order).toEqual(['btn-buy', 'mobile-speed-control', 'btn-sell']);

  await expect.poll(() => page.evaluate(() => window.FlappyKPacing.shouldShowVirtualControls())).toBe(true);
});
