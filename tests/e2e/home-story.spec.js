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
    class SilentAudioContext {
      constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
      createOscillator() {
        return {
          type: 'square', frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
          connect() {}, start() {}, stop() {},
        };
      }
      createGain() {
        return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
      }
      resume() { this.state = 'running'; return Promise.resolve(); }
    }
    window.AudioContext = SilentAudioContext;
    window.webkitAudioContext = SilentAudioContext;
  });
}

function inside(inner, outer, tolerance = 1) {
  return inner.left >= outer.left - tolerance
    && inner.right <= outer.right + tolerance
    && inner.top >= outer.top - tolerance
    && inner.bottom <= outer.bottom + tolerance;
}

function horizontalInside(inner, outer, tolerance = 1) {
  return inner.left >= outer.left - tolerance && inner.right <= outer.right + tolerance;
}

test('analysis mode keeps decisive-trades story, bilingual navigation, and direct PLAY entry', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparePage(page);
  await page.goto('/');

  const next = page.locator('.home-story-arrow--next');
  const previous = page.locator('.home-story-arrow--previous');
  const story = page.locator('#home-story-slide');

  await expect(next).toBeVisible();
  await expect(previous).toBeHidden();
  await expect(story).toBeHidden();
  await next.click();

  await expect(page.locator('#start-screen')).toHaveClass(/is-story-active/);
  await expect(story).toBeVisible();
  await expect(previous).toBeVisible();
  await expect(next).toBeHidden();
  await expect(page.locator('#home-story-title')).toHaveText('THE BEST TRADES ARE OFTEN QUIET.');
  await expect(page.locator('.home-story-lead')).toContainText('only a handful of trades');
  await expect(page.locator('.home-story-marker')).toHaveCount(3);
  await expect(page.locator('.home-story-equation-term strong')).toHaveText(['250', '3', '247']);
  await expect(page.locator('.home-story-page-status')).toContainText('02');
  await expect(page.locator('#start-btn')).toBeHidden();

  const layout = await page.evaluate(() => {
    const rect = (selector) => {
      const box = document.querySelector(selector).getBoundingClientRect();
      return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
    };
    const title = getComputedStyle(document.querySelector('#home-story-title'));
    const arrow = getComputedStyle(document.querySelector('.home-story-arrow--previous'));
    const slideStyle = getComputedStyle(document.querySelector('#home-story-slide'));
    return {
      screen: rect('#start-screen'),
      slide: rect('#home-story-slide'),
      tape: rect('.home-story-tape'),
      horizontalOverflow: document.querySelector('#home-story-slide').scrollWidth > document.querySelector('#home-story-slide').clientWidth + 1,
      titleFont: title.fontFamily,
      titleSize: parseFloat(title.fontSize),
      arrowRadius: arrow.borderRadius,
      arrowShadow: arrow.boxShadow,
      slideBackground: slideStyle.backgroundColor,
      slideRadius: slideStyle.borderRadius,
      slideShadow: slideStyle.boxShadow,
    };
  });

  expect(inside(layout.slide, layout.screen, 1)).toBe(true);
  expect(inside(layout.tape, layout.slide, 1)).toBe(true);
  expect(layout.horizontalOverflow).toBe(false);
  expect(layout.titleFont).toContain('Press Start 2P');
  expect(layout.titleSize).toBeGreaterThanOrEqual(22);
  expect(layout.arrowRadius).toBe('0px');
  expect(layout.arrowShadow).toContain('3px 3px 0px');
  expect(layout.slideRadius).toBe('0px');
  expect(layout.slideShadow).toBe('none');
  expect(layout.slideBackground).not.toBe('rgb(231, 226, 212)');

  await page.keyboard.press('ArrowLeft');
  await expect(story).toBeHidden();
  await expect(page.locator('#start-btn')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(story).toBeVisible();

  await page.evaluate(() => {
    document.documentElement.lang = 'zh-CN';
    document.documentElement.dataset.flappykLanguage = 'zh';
  });
  await expect(page.locator('#home-story-title')).toHaveText('最好的交易，往往很安静。');
  await expect(page.locator('.home-story-lead')).toContainText('寥寥几笔');
  await expect(page.locator('.home-story-equation-term span')).toHaveText(['天', '次出手', '天等待']);

  await page.locator('#home-story-play').click();
  await expect(page.locator('#start-screen')).not.toHaveClass(/active/);
  await expect(page.locator('#game-hud-rail')).toBeVisible();
});

test('analysis mode stays horizontally contained and vertically reachable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparePage(page);
  await page.goto('/');
  await page.locator('.home-story-arrow--next').click();

  const story = page.locator('#home-story-slide');
  const play = page.locator('#home-story-play');
  await expect(story).toBeVisible();
  await expect(page.locator('.home-story-arrow--previous')).toBeVisible();

  const mobile = await page.evaluate(() => {
    const rect = (selector) => {
      const box = document.querySelector(selector).getBoundingClientRect();
      return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
    };
    const slideNode = document.querySelector('#home-story-slide');
    const startNode = document.querySelector('#start-screen');
    return {
      viewport: { left: 0, top: 0, right: innerWidth, bottom: innerHeight },
      slide: rect('#home-story-slide'),
      copy: rect('.home-story-copy'),
      tape: rect('.home-story-tape'),
      previous: rect('.home-story-arrow--previous'),
      horizontalOverflow: slideNode.scrollWidth > slideNode.clientWidth + 1,
      pageScrollable: startNode.scrollHeight >= startNode.clientHeight,
      titleSize: parseFloat(getComputedStyle(document.querySelector('#home-story-title')).fontSize),
      columns: getComputedStyle(slideNode).gridTemplateColumns.split(' ').length,
    };
  });

  expect(horizontalInside(mobile.slide, mobile.viewport, 1)).toBe(true);
  expect(horizontalInside(mobile.copy, mobile.slide, 1)).toBe(true);
  expect(horizontalInside(mobile.tape, mobile.slide, 1)).toBe(true);
  expect(inside(mobile.previous, mobile.viewport, 1)).toBe(true);
  expect(mobile.horizontalOverflow).toBe(false);
  expect(mobile.pageScrollable).toBe(true);
  expect(mobile.previous.width).toBeGreaterThanOrEqual(34);
  expect(mobile.previous.height).toBeGreaterThanOrEqual(34);
  expect(mobile.titleSize).toBeGreaterThanOrEqual(20);
  expect(mobile.columns).toBe(1);

  await play.scrollIntoViewIfNeeded();
  await expect(play).toBeVisible();
  await play.click();
  await expect(page.locator('#game-hud-rail')).toBeVisible();
});