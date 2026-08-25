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

function alphaFromCssColor(value) {
  const match = String(value).match(/rgba?\([^,]+,[^,]+,[^,]+(?:,\s*([\d.]+))?\)/);
  return match?.[1] === undefined ? 1 : Number(match[1]);
}

function inside(inner, outer, tolerance = 2) {
  return inner.left >= outer.left - tolerance
    && inner.right <= outer.right + tolerance
    && inner.top >= outer.top - tolerance
    && inner.bottom <= outer.bottom + tolerance;
}

test('mobile home keeps PLAY first and settlement remains contained in the same surface', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparePage(page);
  await page.goto('/');
  await expect(page.locator('#start-screen.arcade-home')).toBeVisible();

  const home = await page.evaluate(() => {
    const box = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    const screenNode = document.querySelector('.home-console-screen');
    return {
      screen: box('.home-console-screen'),
      title: box('#game-title'),
      worlds: box('.home-world-strip'),
      play: box('#start-btn'),
      modeStack: box('.home-mode-stack'),
      titleSize: parseFloat(getComputedStyle(document.getElementById('game-title')).fontSize),
      playSize: parseFloat(getComputedStyle(document.getElementById('start-btn')).fontSize),
      horizontalOverflow: screenNode.scrollWidth > screenNode.clientWidth + 1,
    };
  });

  expect(inside(home.title, home.screen)).toBe(true);
  expect(inside(home.worlds, home.screen)).toBe(true);
  expect(inside(home.play, home.screen)).toBe(true);
  expect(inside(home.modeStack, home.screen)).toBe(true);
  expect(home.horizontalOverflow).toBe(false);
  expect(home.titleSize).toBeGreaterThanOrEqual(52);
  expect(home.playSize).toBeGreaterThanOrEqual(20);
  expect(home.play.top).toBeLessThan(home.modeStack.top);

  await page.evaluate(() => {
    document.documentElement.dataset.uiState = 'settlement';
    document.getElementById('start-screen')?.classList.remove('active');
    const settlement = document.getElementById('settlement-screen');
    settlement?.classList.add('active');
    const restart = document.getElementById('restart-btn');
    if (restart) restart.hidden = false;
  });
  await page.locator('#settlement-screen').evaluate(async (screen) => {
    await Promise.all(screen.getAnimations().map((animation) => animation.finished));
  });

  const settlementBalance = await page.evaluate(() => {
    const screen = document.getElementById('settlement-screen');
    const card = document.getElementById('profit-card');
    const actions = document.querySelector('.settlement-actions');
    const screenBox = screen.getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();
    const actionsBox = actions.getBoundingClientRect();
    return {
      viewport: { left: 0, top: 0, right: innerWidth, bottom: innerHeight },
      screen: { left: screenBox.left, top: screenBox.top, right: screenBox.right, bottom: screenBox.bottom },
      card: { left: cardBox.left, top: cardBox.top, right: cardBox.right, bottom: cardBox.bottom },
      actions: { left: actionsBox.left, top: actionsBox.top, right: actionsBox.right, bottom: actionsBox.bottom },
      cardShadow: getComputedStyle(card).boxShadow,
      cardRadius: getComputedStyle(card).borderRadius,
    };
  });

  // Chromium can place a 100dvh fixed surface on a fractional visual-viewport origin.
  // Keep the acceptance strict to two CSS pixels while validating the settled surface and its children.
  expect(inside(settlementBalance.screen, settlementBalance.viewport)).toBe(true);
  expect(inside(settlementBalance.card, settlementBalance.screen)).toBe(true);
  expect(inside(settlementBalance.actions, settlementBalance.screen)).toBe(true);
  expect(settlementBalance.cardShadow).not.toBe('none');
  expect(settlementBalance.cardRadius).toBe('0px');
});

test('mobile command dock centers tactile trade actions while the HUD stays one rail', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparePage(page);
  await page.goto('/');
  await page.waitForFunction(() => Array.from(document.styleSheets)
    .some((sheet) => String(sheet.href || '').includes('indicator-cards.css')));

  await page.evaluate(() => {
    document.documentElement.dataset.uiState = 'playing';
    document.documentElement.dataset.virtualControls = 'true';
    document.getElementById('start-screen')?.classList.remove('active');
    document.getElementById('settlement-screen')?.classList.remove('active');

    const controls = document.getElementById('mobile-controls');
    controls.hidden = false;
    controls.setAttribute('aria-hidden', 'false');

    document.getElementById('indicator-card-deck')?.remove();
    const deck = document.createElement('div');
    deck.id = 'indicator-card-deck';
    deck.className = 'indicator-card-deck';
    deck.innerHTML = `
      <div class="indicator-card-row">
        <button class="indicator-card indicator-card--boll" type="button">
          <span class="indicator-card-copy"><strong>BOLL</strong></span><span class="indicator-card-count">×3</span>
        </button>
        <button class="indicator-card indicator-card--macd" type="button">
          <span class="indicator-card-copy"><strong>MACD</strong></span><span class="indicator-card-count">×3</span>
        </button>
      </div>`;
    document.getElementById('game-container').appendChild(deck);
  });

  const layout = await page.evaluate(() => {
    const buyNode = document.getElementById('btn-buy');
    const sellNode = document.getElementById('btn-sell');
    const buy = buyNode.getBoundingClientRect();
    const sell = sellNode.getBoundingClientRect();
    const boll = document.querySelector('.indicator-card--boll').getBoundingClientRect();
    const macd = document.querySelector('.indicator-card--macd').getBoundingClientRect();
    const stats = document.querySelector(".stats-box[data-composition='returns-only']");
    const run = document.querySelector('.run-progress-panel');
    const rail = document.getElementById('game-hud-rail');
    return {
      tradeMidpoint: ((buy.left + buy.right) / 2 + (sell.left + sell.right) / 2) / 2,
      viewportMidpoint: window.innerWidth / 2,
      bollRight: boll.right,
      buyLeft: buy.left,
      sellRight: sell.right,
      macdLeft: macd.left,
      powerVerticalDelta: Math.max(
        Math.abs(((boll.top + boll.bottom) / 2) - ((buy.top + buy.bottom) / 2)),
        Math.abs(((macd.top + macd.bottom) / 2) - ((sell.top + sell.bottom) / 2)),
      ),
      railBackground: getComputedStyle(rail).backgroundColor,
      statsBackground: getComputedStyle(stats).backgroundColor,
      runBackground: getComputedStyle(run).backgroundColor,
      railShadow: getComputedStyle(rail).boxShadow,
      buyShadow: getComputedStyle(buyNode).boxShadow,
      sellShadow: getComputedStyle(sellNode).boxShadow,
      buyFont: parseFloat(getComputedStyle(buyNode).fontSize),
      sellFont: parseFloat(getComputedStyle(sellNode).fontSize),
    };
  });

  expect(Math.abs(layout.tradeMidpoint - layout.viewportMidpoint)).toBeLessThan(3);
  expect(layout.bollRight).toBeLessThan(layout.buyLeft);
  expect(layout.macdLeft).toBeGreaterThan(layout.sellRight);
  expect(layout.powerVerticalDelta).toBeLessThan(20);
  expect(alphaFromCssColor(layout.railBackground)).toBeGreaterThan(0.8);
  expect(alphaFromCssColor(layout.statsBackground)).toBeLessThan(0.1);
  expect(alphaFromCssColor(layout.runBackground)).toBeLessThan(0.1);
  expect(layout.railShadow).not.toBe('none');
  expect(layout.buyShadow).not.toBe('none');
  expect(layout.sellShadow).not.toBe('none');
  expect(layout.buyFont).toBeGreaterThanOrEqual(17);
  expect(layout.sellFont).toBeGreaterThanOrEqual(17);
});
