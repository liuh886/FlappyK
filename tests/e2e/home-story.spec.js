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

test('home arrow reveals one focused decisive-trades story and returns cleanly', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparePage(page);
  await page.goto('/');

  const next = page.locator('.home-story-arrow--next');
  const previous = page.locator('.home-story-arrow--previous');
  const story = page.locator('#home-story-slide');

  await expect(next).toBeVisible();
  await expect(previous).toBeHidden();
  await expect(story).toBeHidden();
  await expect(page.locator('#start-btn')).toBeVisible();

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
    const screen = document.querySelector('#start-screen').getBoundingClientRect();
    const slide = document.querySelector('#home-story-slide').getBoundingClientRect();
    const tape = document.querySelector('.home-story-tape').getBoundingClientRect();
    const title = getComputedStyle(document.querySelector('#home-story-title'));
    const nextButton = getComputedStyle(document.querySelector('.home-story-arrow--previous'));
    return {
      screen: { left: screen.left, top: screen.top, right: screen.right, bottom: screen.bottom },
      slide: { left: slide.left, top: slide.top, right: slide.right, bottom: slide.bottom },
      tape: { left: tape.left, top: tape.top, right: tape.right, bottom: tape.bottom },
      horizontalOverflow: document.querySelector('#home-story-slide').scrollWidth
        > document.querySelector('#home-story-slide').clientWidth + 1,
      titleFont: title.fontFamily,
      titleSize: title.fontSize,
      arrowRadius: nextButton.borderRadius,
      arrowShadow: nextButton.boxShadow,
    };
  });

  expect(layout.slide.left).toBeGreaterThanOrEqual(layout.screen.left - 1);
  expect(layout.slide.right).toBeLessThanOrEqual(layout.screen.right + 1);
  expect(layout.tape.left).toBeGreaterThan(layout.screen.left + 300);
  expect(layout.tape.right).toBeLessThanOrEqual(layout.screen.right - 60);
  expect(layout.horizontalOverflow).toBe(false);
  expect(layout.titleFont).toContain('Press Start 2P');
  expect(parseFloat(layout.titleSize)).toBeGreaterThanOrEqual(24);
  expect(layout.arrowRadius).toBe('0px');
  expect(layout.arrowShadow).not.toBe('none');

  await page.keyboard.press('ArrowLeft');
  await expect(story).toBeHidden();
  await expect(page.locator('#start-btn')).toBeVisible();
  await expect(next).toBeVisible();

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

test('second home panel remains readable and horizontally contained on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparePage(page);
  await page.goto('/');
  await page.locator('.home-story-arrow--next').click();

  await expect(page.locator('#home-story-slide')).toBeVisible();
  await expect(page.locator('.home-story-arrow--previous')).toBeVisible();
  await expect(page.locator('#home-story-play')).toBeVisible();

  const mobile = await page.evaluate(() => {
    const slideNode = document.querySelector('#home-story-slide');
    const slide = slideNode.getBoundingClientRect();
    const copy = document.querySelector('.home-story-copy').getBoundingClientRect();
    const tape = document.querySelector('.home-story-tape').getBoundingClientRect();
    const previous = document.querySelector('.home-story-arrow--previous').getBoundingClientRect();
    const title = getComputedStyle(document.querySelector('#home-story-title'));
    return {
      slide: { left: slide.left, right: slide.right, width: slide.width },
      copy: { left: copy.left, right: copy.right, width: copy.width },
      tape: { left: tape.left, right: tape.right, width: tape.width },
      previous: { width: previous.width, height: previous.height },
      horizontalOverflow: slideNode.scrollWidth > slideNode.clientWidth + 1,
      verticalScrollAvailable: slideNode.scrollHeight >= slideNode.clientHeight,
      titleSize: title.fontSize,
      columns: getComputedStyle(slideNode).gridTemplateColumns.split(' ').length,
    };
  });

  expect(mobile.slide.left).toBeGreaterThanOrEqual(0);
  expect(mobile.slide.right).toBeLessThanOrEqual(390);
  expect(mobile.copy.left).toBeGreaterThanOrEqual(40);
  expect(mobile.copy.right).toBeLessThanOrEqual(350);
  expect(mobile.tape.left).toBeGreaterThanOrEqual(40);
  expect(mobile.tape.right).toBeLessThanOrEqual(350);
  expect(mobile.horizontalOverflow).toBe(false);
  expect(mobile.verticalScrollAvailable).toBe(true);
  expect(mobile.previous.width).toBeGreaterThanOrEqual(42);
  expect(mobile.previous.height).toBeGreaterThanOrEqual(48);
  expect(parseFloat(mobile.titleSize)).toBeGreaterThanOrEqual(21);
  expect(mobile.columns).toBe(1);
});
