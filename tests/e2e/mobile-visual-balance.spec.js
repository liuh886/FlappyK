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

function inside(inner, outer, tolerance = 1) {
  return inner.left >= outer.left - tolerance
    && inner.right <= outer.right + tolerance
    && inner.top >= outer.top - tolerance
    && inner.bottom <= outer.bottom + tolerance;
}

test('mobile home keeps the primary terminal hierarchy above the page navigation and settlement centered', async ({ page }) => {
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
      navigation: box('.home-story-navigation'),
      horizontalOverflow: screenNode.scrollWidth > screenNode.clientWidth + 1,
    };
  });

  expect(inside(home.title, home.screen, 1)).toBe(true);
  expect(inside(home.worlds, home.screen, 1)).toBe(true);
  expect(inside(home.play, home.screen, 1)).toBe(true);
  expect(inside(home.modeStack, home.screen, 1)).toBe(true);
  expect(home.horizontalOverflow).toBe(false);
  expect(home.play.top).toBeLessThan(home.screen.top + home.screen.height * 0.5);
  expect(home.modeStack.bottom).toBeLessThan(home.navigation.top);

  await page.evaluate(() => {
    document.documentElement.dataset.uiState = 'run-complete';
    document.getElementById('start-screen')?.classList.remove('active');
    const settlement = document.getElementById('settlement-screen');
    settlement?.classList.add('active');
    const restart = document.getElementById('restart-btn');
    if (restart) restart.style.display = 'block';
  });
  await page.waitForTimeout(80);

  const settlementBalance = await page.evaluate(() => {
    const screen = document.getElementById('settlement-screen');
    const card = document.getElementById('profit-card');
    const restart = document.getElementById('restart-btn');
    const screenBox = screen.getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();
    const restartBox = restart.getBoundingClientRect();
    const groupTop = Math.min(cardBox.top, restartBox.top);
    const groupBottom = Math.max(cardBox.bottom, restartBox.bottom);
    return {
      justifyContent: getComputedStyle(screen).justifyContent,
      delta: Math.abs(((groupTop + groupBottom) / 2) - ((screenBox.top + screenBox.bottom) / 2)),
    };
  });

  expect(settlementBalance.justifyContent).toBe('center');
  expect(settlementBalance.delta).toBeLessThan(64);
});

test('mobile command dock centers trade actions, moves power-ups outside, and softens HUD layer two', async ({ page }) => {
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
    const buy = document.getElementById('btn-buy').getBoundingClientRect();
    const sell = document.getElementById('btn-sell').getBoundingClientRect();
    const boll = document.querySelector('.indicator-card--boll').getBoundingClientRect();
    const macd = document.querySelector('.indicator-card--macd').getBoundingClientRect();
    const stats = document.querySelector(".stats-box[data-composition='returns-only']");
    const weather = document.querySelector('.weather-status');
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
      firstLayerBackground: getComputedStyle(stats).backgroundColor,
      weatherBackground: getComputedStyle(weather).backgroundColor,
      runBackground: getComputedStyle(run).backgroundColor,
    };
  });

  expect(Math.abs(layout.tradeMidpoint - layout.viewportMidpoint)).toBeLessThan(3);
  expect(layout.bollRight).toBeLessThan(layout.buyLeft);
  expect(layout.macdLeft).toBeGreaterThan(layout.sellRight);
  expect(layout.powerVerticalDelta).toBeLessThan(20);
  expect(alphaFromCssColor(layout.railBackground)).toBeLessThan(0.5);
  expect(alphaFromCssColor(layout.weatherBackground)).toBeLessThan(alphaFromCssColor(layout.firstLayerBackground));
  expect(alphaFromCssColor(layout.runBackground)).toBeLessThan(alphaFromCssColor(layout.firstLayerBackground));
});
