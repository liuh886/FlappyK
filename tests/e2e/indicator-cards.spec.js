const { test, expect } = require('@playwright/test');

async function preparePage(page, { pro = false, cardState = null } = {}) {
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await page.route('https://raw.githubusercontent.com/**', (route) => route.abort());
  await page.route('https://liuh886.github.io/admin/shared/account-shell.css**', (route) => route.fulfill({
    status: 200,
    contentType: 'text/css',
    body: '',
  }));
  await page.route('https://liuh886.github.io/admin/shared/account-shell.js**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `(() => {
      let state = {
        user: { id: 'indicator-test-user', email: 'player@example.com' },
        profile: { display_name: 'Indicator Tester' },
        productAccount: { state: ${JSON.stringify(cardState ? { indicator_cards: cardState } : {})} },
        entitlements: ${pro ? "['flappyk.pro']" : '[]'},
        isPro: ${pro},
        loading: false,
      };
      window.__indicatorAccountOpenCount = 0;
      window.__indicatorSavedStates = [];
      const emit = () => window.dispatchEvent(new CustomEvent('hao:account-changed', { detail: state }));
      window.HaoAccount = Object.freeze({
        getState: () => state,
        open: () => { window.__indicatorAccountOpenCount += 1; },
        saveProductData: async ({ productState }) => {
          window.__indicatorSavedStates.push(productState);
          state = { ...state, productAccount: { state: productState } };
          emit();
          return state;
        },
      });
      setTimeout(emit, 0);
    })();`,
  }));
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
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.FlappyKIndicatorCards && window.FlappyKIndicatorCardStore));
}

async function startAtWarmIndicatorDay(page) {
  await page.locator('#start-btn').click();
  await expect(page.locator('#start-screen')).not.toHaveClass(/active/);
  await page.evaluate(() => {
    dayIndex = Math.min(40, currentData.length - 1);
    currentPrice = currentData[dayIndex].close;
    while (totalHistory.length <= dayIndex) totalHistory.push(levelStartCash);
    draw();
  });
  await expect(page.locator('#indicator-card-deck')).toBeVisible();
}

function countPixels(imageData, predicate) {
  let count = 0;
  for (let index = 0; index < imageData.length; index += 4) {
    if (predicate(imageData[index], imageData[index + 1], imageData[index + 2], imageData[index + 3])) count += 1;
  }
  return count;
}

test('signed-in starter hand reveals BOLL and MACD without double consumption', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparePage(page);

  await expect(page.locator('[data-card-count="boll"]')).toHaveText('×3');
  await expect(page.locator('[data-card-count="macd"]')).toHaveText('×3');
  await expect(page.locator('[data-indicator-draw]')).toBeHidden();
  await startAtWarmIndicatorDay(page);

  await expect(page.locator('[data-hand-label]')).toHaveText('TACTICAL HAND');
  await page.keyboard.press('1');
  await expect(page.locator('[data-indicator-card="boll"]')).toHaveClass(/is-active/);
  await expect(page.locator('[data-card-count="boll"]')).toHaveText('×2');
  await expect(page.locator('.indicator-card-feedback')).toContainText('BOLL scan decoded');

  const bollPixels = await page.evaluate(() => {
    const overlay = document.getElementById('indicator-overlay');
    const pixels = overlay.getContext('2d').getImageData(0, 0, overlay.width, Math.floor(overlay.height * 0.7)).data;
    let visible = 0;
    for (let index = 3; index < pixels.length; index += 4) if (pixels[index] > 0) visible += 1;
    return visible;
  });
  expect(bollPixels).toBeGreaterThan(100);

  await page.keyboard.press('1');
  await expect(page.locator('[data-card-count="boll"]')).toHaveText('×2');

  await page.keyboard.press('2');
  await expect(page.locator('[data-indicator-card="macd"]')).toHaveClass(/is-active/);
  await expect(page.locator('[data-card-count="macd"]')).toHaveText('×2');
  await expect(page.locator('.indicator-card-feedback')).toContainText('MACD scan decoded');

  await page.waitForTimeout(520);
  const lowerScan = await page.evaluate(() => {
    const overlay = document.getElementById('indicator-overlay');
    const ctx = overlay.getContext('2d');
    const macdTop = Math.floor(overlay.height * 0.715);
    const macdBottom = Math.floor(overlay.height * 0.85);
    const profitTop = Math.floor(overlay.height * 0.85);
    const profitBottom = Math.floor(overlay.height * 0.97);
    const macd = ctx.getImageData(0, macdTop, overlay.width, Math.max(1, macdBottom - macdTop)).data;
    const profit = ctx.getImageData(0, profitTop, overlay.width, Math.max(1, profitBottom - profitTop)).data;
    const count = (data, fn) => {
      let total = 0;
      for (let index = 0; index < data.length; index += 4) {
        if (fn(data[index], data[index + 1], data[index + 2], data[index + 3])) total += 1;
      }
      return total;
    };
    return {
      macdVisible: count(macd, (_r, _g, _b, a) => a > 0),
      yellowProfit: count(profit, (r, g, b, a) => a > 120 && r > 180 && g > 150 && b < 120),
      active: window.FlappyKIndicatorCards.active,
      latestState: window.__indicatorSavedStates.at(-1)?.indicator_cards,
    };
  });

  expect(lowerScan.macdVisible).toBeGreaterThan(1000);
  expect(lowerScan.yellowProfit).toBeGreaterThan(10);
  expect(lowerScan.active).toEqual({ boll: true, macd: true });
  expect(lowerScan.latestState.boll).toBe(2);
  expect(lowerScan.latestState.macd).toBe(2);
  expect(lowerScan.latestState.starterGranted).toBe(true);
});

test('pro entitlement exposes exactly three daily pack draws', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await preparePage(page, {
    pro: true,
    cardState: {
      version: 1,
      boll: 0,
      macd: 0,
      starterGranted: true,
      drawDate: '',
      drawsUsed: 0,
    },
  });
  await startAtWarmIndicatorDay(page);

  const drawButton = page.locator('[data-indicator-draw]');
  await expect(drawButton).toBeVisible();
  await expect(drawButton).toContainText('3 LEFT');
  await drawButton.click();
  await expect(drawButton).toContainText('2 LEFT');
  await drawButton.click();
  await expect(drawButton).toContainText('1 LEFT');
  await drawButton.click();
  await expect(drawButton).toContainText('DAILY PACK EMPTY');
  await expect(drawButton).toBeDisabled();

  const inventory = await page.evaluate(() => window.FlappyKIndicatorCardStore.getSnapshot());
  expect(inventory.boll + inventory.macd).toBe(3);
  expect(inventory.dailyDrawsRemaining).toBe(0);
});

test('mobile tactical cards are compact, tappable, and isolated from trade controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparePage(page);
  await startAtWarmIndicatorDay(page);

  const before = await page.evaluate(() => actions.length);
  await page.locator('[data-indicator-card="boll"]').click();
  await expect(page.locator('[data-indicator-card="boll"]')).toHaveClass(/is-active/);
  await expect(page.locator('[data-card-count="boll"]')).toHaveText('×2');

  const mobile = await page.evaluate(() => {
    const deck = document.getElementById('indicator-card-deck').getBoundingClientRect();
    const controls = document.getElementById('mobile-controls').getBoundingClientRect();
    const buttons = Array.from(document.querySelectorAll('.indicator-card')).map((node) => {
      const rect = node.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    return {
      deck: { left: deck.left, right: deck.right, bottom: deck.bottom, width: deck.width },
      controlsTop: controls.top,
      buttons,
      actions: actions.length,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });

  expect(mobile.deck.left).toBeGreaterThanOrEqual(0);
  expect(mobile.deck.right).toBeLessThanOrEqual(mobile.viewportWidth);
  expect(mobile.deck.bottom).toBeLessThanOrEqual(mobile.controlsTop + 1);
  expect(mobile.deck.width).toBeLessThanOrEqual(374);
  mobile.buttons.forEach((button) => {
    expect(button.width).toBeGreaterThanOrEqual(80);
    expect(button.height).toBeGreaterThanOrEqual(44);
  });
  expect(mobile.actions).toBe(before);
  expect(mobile.overflow).toBe(false);
});
