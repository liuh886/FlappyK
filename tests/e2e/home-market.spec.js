const { test, expect } = require('@playwright/test');

async function preparePage(page) {
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await page.route('https://raw.githubusercontent.com/**', (route) => route.abort());
  await page.route('https://liuh886.github.io/admin/**', (route) => route.abort());
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

test('desktop home is one interactive perspective market scene', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparePage(page);
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.FlappyKHomeMarket));

  const home = page.locator('#start-screen');
  const canvas = page.locator('#home-market-canvas');
  const coins = page.locator('#home-demo-coins');
  const shares = page.locator('#home-demo-shares');

  await expect(home).toBeVisible();
  await expect(canvas).toBeVisible();
  await expect(coins).toHaveText('10,000');
  await expect(shares).toHaveText('0');
  await expect(page.locator('#home-demo-buy')).toBeVisible();
  await expect(page.locator('#home-demo-sell')).toBeVisible();
  await expect(page.locator('.home-story-slide')).toHaveCount(0);

  const scene = await page.evaluate(() => {
    const homeNode = document.querySelector('#start-screen');
    const canvasNode = document.querySelector('#home-market-canvas');
    const walletNode = document.querySelector('.home-market-wallet');
    const homeRect = homeNode.getBoundingClientRect();
    const canvasRect = canvasNode.getBoundingClientRect();
    const walletRect = walletNode.getBoundingClientRect();
    return {
      home: { left: homeRect.left, top: homeRect.top, right: homeRect.right, bottom: homeRect.bottom },
      canvas: { left: canvasRect.left, top: canvasRect.top, right: canvasRect.right, bottom: canvasRect.bottom },
      wallet: { left: walletRect.left, right: walletRect.right },
      canvasPixels: [canvasNode.width, canvasNode.height],
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      background: getComputedStyle(document.querySelector('.home-market-screen')).backgroundImage,
    };
  });

  expect(scene.home.left).toBe(0);
  expect(scene.home.top).toBe(0);
  expect(scene.home.right).toBe(1440);
  expect(scene.home.bottom).toBe(900);
  expect(scene.canvas.left).toBe(0);
  expect(scene.canvas.top).toBe(0);
  expect(scene.canvas.right).toBe(1440);
  expect(scene.canvas.bottom).toBe(900);
  expect(scene.wallet.left).toBeGreaterThan(900);
  expect(scene.wallet.right).toBeLessThanOrEqual(1440);
  expect(scene.canvasPixels[0]).toBeGreaterThan(1000);
  expect(scene.canvasPixels[1]).toBeGreaterThan(700);
  expect(scene.overflow).toBe(false);
  expect(scene.background).not.toBe('none');

  await page.keyboard.press('ArrowUp');
  await expect(coins).toHaveText('8,999');
  await expect(shares).not.toHaveText('0');
  await expect(page.locator('#home-market-feedback')).toHaveAttribute('data-tone', 'buy');

  await page.keyboard.press('ArrowDown');
  await expect(shares).toHaveText('0');
  await expect(page.locator('#home-market-feedback')).toHaveAttribute('data-tone', 'sell');

  await page.locator('#start-btn').click();
  await expect(home).not.toHaveClass(/active/);
  await expect(home).toBeHidden();
  await expect(page.locator('#game-hud-rail')).toBeVisible();
  await expect(page.locator('.hud-cash-resource')).toBeVisible();
  await expect(page.locator('.hud-cash-resource .resource-glyph--coin')).toBeVisible();
  await expect(page.locator('.hud-cash-resource #cash-display')).toHaveText('10000.00');
});

test('mobile home supports touch trading without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparePage(page);
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.FlappyKHomeMarket));

  await expect(page.locator('#home-market-canvas')).toBeVisible();
  await expect(page.locator('#home-demo-buy')).toBeVisible();
  await expect(page.locator('#home-demo-sell')).toBeVisible();

  const mobile = await page.evaluate(() => {
    const wallet = document.querySelector('.home-market-wallet').getBoundingClientRect();
    const controls = document.querySelector('.home-market-controls').getBoundingClientRect();
    const buy = document.querySelector('#home-demo-buy').getBoundingClientRect();
    const sell = document.querySelector('#home-demo-sell').getBoundingClientRect();
    return {
      wallet: { left: wallet.left, right: wallet.right },
      controls: { left: controls.left, right: controls.right },
      buy: { width: buy.width, height: buy.height },
      sell: { width: sell.width, height: sell.height },
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });

  expect(mobile.wallet.left).toBeGreaterThanOrEqual(0);
  expect(mobile.wallet.right).toBeLessThanOrEqual(390);
  expect(mobile.controls.left).toBeGreaterThanOrEqual(0);
  expect(mobile.controls.right).toBeLessThanOrEqual(390);
  expect(mobile.buy.width).toBeGreaterThanOrEqual(76);
  expect(mobile.buy.height).toBeGreaterThanOrEqual(42);
  expect(mobile.sell.width).toBeGreaterThanOrEqual(76);
  expect(mobile.sell.height).toBeGreaterThanOrEqual(42);
  expect(mobile.overflow).toBe(false);

  await page.locator('#home-demo-buy').click();
  await expect(page.locator('#home-demo-coins')).toHaveText('8,999');
  await expect(page.locator('#home-demo-shares')).not.toHaveText('0');

  await page.evaluate(() => {
    document.documentElement.lang = 'zh-CN';
    document.documentElement.dataset.flappykLanguage = 'zh';
  });
  await expect(page.locator('.home-market-tagline')).toHaveText('像看盘一样读行情，只在关键时刻出手。');
  await expect(page.locator('[data-home-copy="coins"]')).toHaveText('金币');
  await expect(page.locator('#home-demo-buy')).toHaveText('↑ 买入');
});
