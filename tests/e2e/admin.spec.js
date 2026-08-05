const { test, expect } = require('@playwright/test');

test('membership admin stays private and uses the exact OAuth return URL', async ({ page }) => {
  await page.route('https://cdn.jsdelivr.net/**', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `
      export function createClient() {
        return {
          auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
            signInWithOAuth: async (input) => {
              window.__adminOAuthRedirect = input.options.redirectTo;
              return { error: null };
            },
            signOut: async () => ({ error: null })
          }
        };
      }
    `,
  }));

  await page.goto('/admin/');

  await expect(page).toHaveTitle('Hao Apps · Membership Operations');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow,noarchive');
  await expect(page.getByRole('heading', { name: '会员运营台' })).toBeVisible();
  await expect(page.getByRole('button', { name: '使用 Google 登录' })).toBeVisible();
  await expect(page.locator('#console')).toBeHidden();

  await page.getByRole('button', { name: '使用 Google 登录' }).click();
  await expect.poll(() => page.evaluate(() => window.__adminOAuthRedirect)).toBe(
    'https://liuh886.github.io/FlappyK/admin/'
  );
});
