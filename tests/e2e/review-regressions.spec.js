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

test('rounded +0.00% excess keeps the authoritative successful verdict', async ({ page }) => {
  await preparePage(page);
  await page.goto('/');

  const result = await page.evaluate(() => {
    const status = document.getElementById('card-status');
    status.className = 'status-msg card-positive';
    status.textContent = 'MARKET BEATEN!';
    document.getElementById('card-level-return').textContent = '+1.00%';
    document.getElementById('card-market-return').textContent = '+1.00%';
    document.getElementById('card-excess-return').textContent = '+0.00%';

    window.FlappyKPremiumUI.renderSettlement();
    const roundedTextResult = document.getElementById('profit-card').dataset.result;

    window.FlappyKPremiumUIRefinement.syncSettlementComparison();
    return {
      roundedTextResult,
      correctedResult: document.getElementById('profit-card').dataset.result,
      verdict: document.getElementById('settlement-verdict').textContent,
    };
  });

  expect(result.roundedTextResult).toBe('failure');
  expect(result.correctedResult).toBe('success');
  expect(result.verdict).toBe('MARKET BEATEN');
});

test('wide short desktop guide highlights visible keyboard controls', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 650 });
  await preparePage(page);
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('data-layout', 'compact');
  await expect(page.locator('html')).toHaveAttribute('data-virtual-controls', 'false');

  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await expect(page.locator('.game-coachmark')).toHaveAttribute('data-step', 'buy');
  await expect(page.locator('#mobile-controls')).toBeHidden();
  await expect(page.locator('.trade-hint-buy')).toHaveClass(/guide-target/);
  await expect(page.locator('#btn-buy')).not.toHaveClass(/guide-target/);

  await page.keyboard.press('ArrowUp');
  await expect.poll(async () => page.locator('.game-coachmark').getAttribute('data-step')).toBe('sell');
  await expect(page.locator('.trade-hint-sell')).toHaveClass(/guide-target/);
  await expect(page.locator('#btn-sell')).not.toHaveClass(/guide-target/);
});
