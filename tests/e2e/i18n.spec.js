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

test('language toggle switches, persists, and translates dynamic home UI', async ({ page }) => {
  await preparePage(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('flappyk_language_v1', 'en');
    window.localStorage.setItem('flappyk_onboarding_seen_v1', '1');
  });
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('button', { name: '中文', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'PLAY', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'DAILY RUN', exact: true })).toBeVisible();

  await Promise.all([
    page.waitForNavigation(),
    page.getByRole('button', { name: '中文', exact: true }).click(),
  ]);

  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.getByRole('button', { name: 'EN', exact: true })).toBeVisible();
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
    page.getByRole('button', { name: 'EN', exact: true }).click(),
  ]);

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('button', { name: 'PLAY', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('flappyk_language_v1'))).toBe('en');
});
