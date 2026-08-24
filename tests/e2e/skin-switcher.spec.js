const { test, expect } = require('@playwright/test');

async function preparePage(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('flappyk_onboarding_seen_v1', '1');
    window.localStorage.setItem('flappyk_language_v1', 'en');
    class SilentAudioContext {
      constructor() {}
      get currentTime() { return 0; }
      get state() { return 'running'; }
      resume() { return Promise.resolve(); }
      createGain() { return { connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
      createOscillator() { return { type: '', frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
      get destination() { return {}; }
    }
    window.AudioContext = SilentAudioContext;
    window.webkitAudioContext = SilentAudioContext;
  });
}

test('skin cycle switches tokens, persists across reloads, and reaches the canvas palette', async ({ page }) => {
  await preparePage(page);
  await page.goto('/');

  await expect(page.locator('#home-utility-bar #skin-toggle-btn')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'arcade');
  const defaultBg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--game-bg').trim());

  await page.locator('#skin-toggle-btn').click();
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'polar');
  const polarBg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--game-bg').trim());
  expect(polarBg).not.toBe(defaultBg);
  const polarMotion = await page.evaluate(() => document.documentElement.style.getPropertyValue('--motion-step-fast').trim());
  expect(polarMotion).toBe('110ms');

  // The manifest persists the choice for the next visit.
  const stored = await page.evaluate(() => window.localStorage.getItem('flappyk_skin_v1'));
  expect(stored).toBe('polar');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'polar');
  const restoredBg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--game-bg').trim());
  expect(restoredBg).toBe(polarBg);

  await page.locator('#skin-toggle-btn').click();
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'amber');
  await page.locator('#skin-toggle-btn').click();
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'arcade');
  const backToDefault = await page.evaluate(() => ({
    bg: getComputedStyle(document.documentElement).getPropertyValue('--game-bg').trim(),
    motion: document.documentElement.style.getPropertyValue('--motion-step-fast').trim(),
  }));
  expect(backToDefault.bg).toBe(defaultBg);
  expect(backToDefault.motion).toBe('');
});

test('english skins announce themselves in english', async ({ page }) => {
  await preparePage(page);
  await page.goto('/');
  await expect(page.locator('#skin-toggle-btn')).toHaveAttribute('aria-label', 'Skin: Market Arcade');

  await page.locator('#skin-toggle-btn').click();
  await expect(page.locator('#skin-toggle-btn')).toHaveAttribute('aria-label', 'Skin: Polar Exchange');
});

test('chinese skins announce themselves in chinese', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('flappyk_onboarding_seen_v1', '1');
    window.localStorage.setItem('flappyk_language_v1', 'zh');
    class SilentAudioContext {
      constructor() {}
      get currentTime() { return 0; }
      get state() { return 'running'; }
      resume() { return Promise.resolve(); }
      createGain() { return { connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
      createOscillator() { return { type: '', frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
      get destination() { return {}; }
    }
    window.AudioContext = SilentAudioContext;
    window.webkitAudioContext = SilentAudioContext;
  });
  await page.goto('/');
  await expect(page.locator('#skin-toggle-btn')).toBeVisible();
  await expect(page.locator('#skin-toggle-btn')).toHaveAttribute('aria-label', '皮肤：像素街机');

  await page.locator('#skin-toggle-btn').click();
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'polar');
  await expect(page.locator('#skin-toggle-btn')).toHaveAttribute('aria-label', '皮肤：极地冰原');
});
