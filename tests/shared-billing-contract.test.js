const assert = require('node:assert/strict');
const fs = require('node:fs');

const catalog = fs.readFileSync('supabase/migrations/0002_shared_billing_catalog.sql', 'utf8');
const hardening = fs.readFileSync('supabase/migrations/0003_harden_shared_billing_rls.sql', 'utf8');
const rlsOptimization = fs.readFileSync('supabase/migrations/0004_optimize_membership_rls_initplan.sql', 'utf8');
const browserConfig = fs.readFileSync('membership-config.js', 'utf8');
const docs = fs.readFileSync('docs/SHARED_BILLING.md', 'utf8');

for (const product of ['flappyk', 'ownly', 'rhythmcoach', 'newsflow', 'alpha_engine']) {
  assert.ok(catalog.includes(`'${product}'`), `catalog must register ${product}`);
}
for (const entitlement of [
  'flappyk.pro',
  'ownly.pro',
  'rhythmcoach.pro',
  'rhythmcoach.recording_download',
  'newsflow.pro',
  'alpha_engine.pro',
]) {
  assert.ok(catalog.includes(`'${entitlement}'`), `catalog must map ${entitlement}`);
}

assert.ok(catalog.includes('create table if not exists public.entitlement_grants'));
assert.ok(catalog.includes('create table if not exists public.stripe_webhook_events'));
assert.ok(catalog.includes('refresh_effective_entitlements'));
assert.ok(hardening.includes('using (false)'));
assert.ok(hardening.includes('revoke all on function public.handle_new_user()'));
assert.ok(rlsOptimization.includes('(select auth.uid())'));

for (const retiredLocalBillingFile of [
  'supabase/functions/create-checkout-session/index.ts',
  'supabase/functions/create-portal-session/index.ts',
  'supabase/functions/stripe-webhook/index.ts',
  'supabase/config.toml',
]) {
  assert.equal(
    fs.existsSync(retiredLocalBillingFile),
    false,
    `Shared billing runtime must not be duplicated inside FlappyK: ${retiredLocalBillingFile}`,
  );
}

assert.ok(browserConfig.includes('billingEnabled: true'));
assert.ok(browserConfig.includes("productCode: 'flappyk'"));
assert.ok(browserConfig.includes("checkoutFunctionUrl: 'https://blgwlycfcwvsupmqyqwn.supabase.co/functions/v1/create-checkout-session'"));
assert.ok(browserConfig.includes("portalFunctionUrl: 'https://blgwlycfcwvsupmqyqwn.supabase.co/functions/v1/create-portal-session'"));
assert.ok(!/sk_(live|test)_/.test(browserConfig));
assert.ok(!/whsec_/.test(browserConfig));
assert.ok(!/sb_secret_/.test(browserConfig));

assert.ok(docs.includes('Adding a future product'));
assert.ok(docs.includes('Only the verified Stripe webhook'));

console.log('Shared billing catalog, centralized runtime boundary, browser secret isolation, and retired local function cleanup validated.');
