const { test, expect } = require('@playwright/test');

async function preparePage(page, { signedIn = true, pro = false, cardState = null } = {}) {
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
        user: ${signedIn ? "{ id: 'indicator-test-user', email: 'player@example.com' }" : 'null'},
        profile: ${signedIn ? "{ display_name: 'Indicator Tester' }" : 'null'},
        productAccount: { state: ${JSON.stringify(signedIn && cardState ? { indicator_cards: cardState } : {})} },
        entitlements: ${signedIn && pro ? "['flappyk.pro']" : '[]'},
        isPro: ${signedIn && pro},
        loading: false,
      };
      window.__indicatorSavedStates = [];
      const emit = () => window.dispatchEvent(new CustomEvent('hao:account-changed', { detail: state }));
      window.__setIndicatorAccountState = (nextState) => {
        state = nextState;
        emit();
      };
      window.HaoAccount = Object.freeze({
        getState: () => state,
        open: () => {},
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

async function startAtWarmIndicatorDay(page, { expectDeck = true } = {}) {
  await page.locator('#start-btn').click();
  await expect(page.locator('#start-screen')).not.toHaveClass(/active/);
  await page.evaluate(() => {
    dayIndex = Math.min(40, currentData.length - 1);
    currentPrice = currentData[dayIndex].close;
    draw();
  });
  if (expectDeck) await expect(page.locator('#indicator-card-deck')).toBeVisible();
}

test('guest gameplay has no tactical hand and cannot reveal indicators', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparePage(page, { signedIn: false });
  await startAtWarmIndicatorDay(page, { expectDeck: false });

  await expect(page.locator('#indicator-card-deck')).toBeHidden();
  await page.keyboard.press('1');
  await page.waitForTimeout(80);

  const guestState = await page.evaluate(() => {
    const overlay = document.getElementById('indicator-overlay');
    const pixels = overlay.getContext('2d').getImageData(0, 0, overlay.width, overlay.height).data;
    let visiblePixels = 0;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] > 0) visiblePixels += 1;
    }
    return {
      inventory: window.FlappyKIndicatorCardStore.getSnapshot(),
      active: window.FlappyKIndicatorCards.active,
      visiblePixels,
    };
  });

  expect(guestState.inventory.signedIn).toBe(false);
  expect(guestState.inventory.boll).toBe(0);
  expect(guestState.inventory.macd).toBe(0);
  expect(guestState.active).toEqual({ boll: false, macd: false });
  expect(guestState.visiblePixels).toBe(0);
});

test('signed-in starter cards render BOLL and MACD above the K-line without double consumption', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparePage(page);

  await expect(page.locator('[data-card-count="boll"]')).toHaveText('×3');
  await expect(page.locator('[data-card-count="macd"]')).toHaveText('×3');
  await startAtWarmIndicatorDay(page);

  const layers = await page.evaluate(() => ({
    base: Number(getComputedStyle(document.getElementById('game-canvas')).zIndex),
    overlay: Number(getComputedStyle(document.getElementById('indicator-overlay')).zIndex),
    screen: Number(getComputedStyle(document.querySelector('.screen')).zIndex),
  }));
  expect(layers.overlay).toBeGreaterThan(layers.base);
  expect(layers.overlay).toBeLessThan(layers.screen);

  await page.keyboard.press('1');
  await expect(page.locator('[data-indicator-card="boll"]')).toHaveClass(/is-active/);
  await expect(page.locator('[data-indicator-card="boll"]')).toHaveClass(/is-revealing/);
  await expect(page.locator('[data-card-count="boll"]')).toHaveText('×2');
  await expect(page.locator('.indicator-card-feedback')).toContainText('BOLL scan decoded');
  await page.waitForTimeout(520);
  await expect(page.locator('[data-indicator-card="boll"]')).not.toHaveClass(/is-revealing/);

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
  await page.waitForTimeout(520);

  const lowerLanes = await page.evaluate(() => {
    const overlay = document.getElementById('indicator-overlay');
    const ctx = overlay.getContext('2d');
    const top = Math.floor(overlay.height * 0.71);
    const height = Math.max(1, overlay.height - top);
    const pixels = ctx.getImageData(0, top, overlay.width, height).data;
    let visible = 0;
    let yellow = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] > 0) visible += 1;
      if (pixels[index] > 180 && pixels[index + 1] > 140 && pixels[index + 2] < 120 && pixels[index + 3] > 100) yellow += 1;
    }
    return {
      visible,
      yellow,
      active: window.FlappyKIndicatorCards.active,
      latestState: window.__indicatorSavedStates.at(-1)?.indicator_cards,
    };
  });
  expect(lowerLanes.visible).toBeGreaterThan(1000);
  expect(lowerLanes.yellow).toBeGreaterThan(20);
  expect(lowerLanes.active).toEqual({ boll: true, macd: true });
  expect(lowerLanes.latestState.boll).toBe(2);
  expect(lowerLanes.latestState.macd).toBe(2);
  expect(lowerLanes.latestState.starterGranted).toBe(true);

  await page.evaluate(() => {
    window.__setIndicatorAccountState({
      user: null,
      profile: null,
      productAccount: { state: {} },
      entitlements: [],
      isPro: false,
      loading: false,
    });
  });
  await expect(page.locator('#indicator-card-deck')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.FlappyKIndicatorCards.active))
    .toEqual({ boll: false, macd: false });
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
  await expect(drawButton).toContainText('DAILY PACK EMPTY');
  await expect(drawButton).toBeDisabled();

  const inventory = await page.evaluate(() => window.FlappyKIndicatorCardStore.getSnapshot());
  expect(inventory.boll + inventory.macd).toBe(3);
  expect(inventory.dailyDrawsRemaining).toBe(0);
});

test('mobile cards are tappable, contained, and stay clear of trade controls', async ({ page }) => {
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
      deck: { left: deck.left, right: deck.right, bottom: deck.bottom },
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
  expect(mobile.deck.bottom).toBeLessThanOrEqual(mobile.viewportHeight);
  expect(mobile.deck.bottom).toBeLessThanOrEqual(mobile.controlsTop - 4);
  mobile.buttons.forEach((button) => {
    expect(button.width).toBeGreaterThanOrEqual(80);
    expect(button.height).toBeGreaterThanOrEqual(44);
  });
  expect(mobile.actions).toBe(before);
  expect(mobile.overflow).toBe(false);
});
