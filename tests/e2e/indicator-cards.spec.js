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
    draw();
  });
  await expect(page.locator('#indicator-card-deck')).toBeVisible();
}

test('signed-in starter cards reveal BOLL and MACD without double consumption', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparePage(page);

  await expect(page.locator('[data-card-count="boll"]')).toHaveText('×3');
  await expect(page.locator('[data-card-count="macd"]')).toHaveText('×3');
  await startAtWarmIndicatorDay(page);

  await page.keyboard.press('1');
  await expect(page.locator('[data-indicator-card="boll"]')).toHaveClass(/is-active/);
  await expect(page.locator('[data-card-count="boll"]')).toHaveText('×2');
  await expect(page.locator('.indicator-card-feedback')).toContainText('BOLL revealed');

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

  const macdPanel = await page.evaluate(() => {
    const overlay = document.getElementById('indicator-overlay');
    const top = Math.floor(overlay.height * 0.75);
    const pixels = overlay.getContext('2d').getImageData(0, top, overlay.width, Math.floor(overlay.height * 0.2)).data;
    let visible = 0;
    for (let index = 3; index < pixels.length; index += 4) if (pixels[index] > 0) visible += 1;
    return {
      visible,
      active: window.FlappyKIndicatorCards.active,
      latestState: window.__indicatorSavedStates.at(-1)?.indicator_cards,
    };
  });
  expect(macdPanel.visible).toBeGreaterThan(1000);
  expect(macdPanel.active).toEqual({ boll: true, macd: true });
  expect(macdPanel.latestState.boll).toBe(2);
  expect(macdPanel.latestState.macd).toBe(2);
  expect(macdPanel.latestState.starterGranted).toBe(true);
});

test('pro entitlement permits exactly three daily random draws', async ({ page }) => {
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
  await expect(drawButton).toContainText('3 LEFT');
  await drawButton.click();
  await expect(drawButton).toContainText('2 LEFT');
  await drawButton.click();
  await expect(drawButton).toContainText('1 LEFT');
  await drawButton.click();
  await expect(drawButton).toContainText('DAILY DRAWS COMPLETE');
  await expect(drawButton).toBeDisabled();

  const inventory = await page.evaluate(() => window.FlappyKIndicatorCardStore.getSnapshot());
  expect(inventory.boll + inventory.macd).toBe(3);
  expect(inventory.dailyDrawsRemaining).toBe(0);
});

test('mobile cards are tappable, contained, and isolated from trade controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparePage(page);
  await startAtWarmIndicatorDay(page);

  const before = await page.evaluate(() => actions.length);
  await page.locator('[data-indicator-card="boll"]').click();
  await expect(page.locator('[data-indicator-card="boll"]')).toHaveClass(/is-active/);
  await expect(page.locator('[data-card-count="boll"]')).toHaveText('×2');

  const mobile = await page.evaluate(() => {
    const deck = document.getElementById('indicator-card-deck').getBoundingClientRect();
    const buttons = Array.from(document.querySelectorAll('.indicator-card')).map((node) => {
      const rect = node.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    return {
      deck: { left: deck.left, right: deck.right, bottom: deck.bottom },
      buttons,
      actions: actions.length,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });

  expect(mobile.deck.left).toBeGreaterThanOrEqual(0);
  expect(mobile.deck.right).toBeLessThanOrEqual(mobile.viewportWidth);
  expect(mobile.deck.bottom).toBeLessThanOrEqual(mobile.viewportHeight);
  mobile.buttons.forEach((button) => {
    expect(button.width).toBeGreaterThanOrEqual(80);
    expect(button.height).toBeGreaterThanOrEqual(44);
  });
  expect(mobile.actions).toBe(before);
  expect(mobile.overflow).toBe(false);
});
