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
}

async function installSilentAudio(page) {
  await page.addInitScript(() => {
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

test('language toggle switches, persists, and translates dynamic home UI', async ({ page }) => {
  await preparePage(page);
  await page.addInitScript(() => {
    if (!window.localStorage.getItem('flappyk_language_v1')) {
      window.localStorage.setItem('flappyk_language_v1', 'en');
    }
    window.localStorage.setItem('flappyk_onboarding_seen_v1', '1');
  });
  await page.goto('/');

  const languageToggle = page.locator('#language-toggle-btn');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(languageToggle).toBeVisible();
  await expect(languageToggle).toHaveText('中文');
  await expect(languageToggle).toHaveAttribute('aria-label', '切换至中文');
  await expect(page.getByRole('button', { name: 'PLAY', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'DAILY RUN', exact: true })).toBeVisible();

  await Promise.all([
    page.waitForNavigation(),
    languageToggle.click(),
  ]);

  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.locator('#language-toggle-btn')).toHaveText('EN');
  await expect(page.locator('#language-toggle-btn')).toHaveAttribute('aria-label', 'Switch to English');
  await expect(page.getByRole('button', { name: '开始游戏', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /每日挑战|重玩今日挑战/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '排行榜', exact: true })).toBeVisible();
  await expect(page.locator('#daily-run-summary')).toContainText('每日挑战');
  await expect(page.locator('#daily-run-summary')).toContainText('连续挑战');
  await expect(page).toHaveTitle('FlappyK — 你能跑赢隐藏市场吗？');
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('flappyk_language_v1'))).toBe('zh');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.getByRole('button', { name: '开始游戏', exact: true })).toBeVisible();

  await Promise.all([
    page.waitForNavigation(),
    page.locator('#language-toggle-btn').click(),
  ]);

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('button', { name: 'PLAY', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('flappyk_language_v1'))).toBe('en');
});

test('Chinese mobile gameplay shows virtual keys, pause, and return controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparePage(page);
  await installSilentAudio(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('flappyk_language_v1', 'zh');
    window.localStorage.setItem('flappyk_onboarding_seen_v1', '1');
  });
  await page.goto('/');

  await page.getByRole('button', { name: '开始游戏', exact: true }).click();
  await expect(page.locator('#mobile-controls')).toBeVisible();
  await expect(page.locator('#btn-buy')).toBeVisible();
  await expect(page.locator('#btn-sell')).toBeVisible();
  await expect(page.locator('#pause-btn')).toBeVisible();
  await expect(page.locator('#pause-btn')).toHaveText('');
  await expect(page.locator('#pause-btn')).toHaveAttribute('aria-label', '暂停游戏');
  await expect(page.locator('#game-back-btn')).toBeVisible();
  await expect(page.locator('#game-back-btn')).toHaveAttribute('aria-label', '返回首页');
});
