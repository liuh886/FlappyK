const assert = require('node:assert/strict');
const fs = require('node:fs');

const catalog = fs.readFileSync('supabase/migrations/0002_shared_billing_catalog.sql', 'utf8');
const hardening = fs.readFileSync('supabase/migrations/0003_harden_shared_billing_rls.sql', 'utf8');
const rlsOptimization = fs.readFileSync('supabase/migrations/0004_optimize_membership_rls_initplan.sql', 'utf8');
const checkout = fs.readFileSync('supabase/functions/create-checkout-session/index.ts', 'utf8');
const portal = fs.readFileSync('supabase/functions/create-portal-session/index.ts', 'utf8');
const webhook = fs.readFileSync('supabase/functions/stripe-webhook/index.ts', 'utf8');
const functionConfig = fs.readFileSync('supabase/config.toml', 'utf8');
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

assert.ok(checkout.includes('product_code is required'));
assert.ok(checkout.includes('.from("billing_prices")'));
assert.ok(checkout.includes('line_items[0][price]'));
assert.ok(!checkout.includes('input.price_id'));
assert.ok(checkout.includes('STRIPE_SECRET_KEY'));
assert.ok(checkout.includes('SUPABASE_SERVICE_ROLE_KEY'));
assert.ok(portal.includes('billing_portal/sessions'));
assert.ok(portal.includes('Authentication required'));

assert.ok(webhook.includes('verifyStripeSignature'));
assert.ok(webhook.includes('stripe-signature'));
assert.ok(webhook.includes('STRIPE_WEBHOOK_SECRET'));
assert.ok(webhook.includes('stripe_webhook_events'));
assert.ok(webhook.includes('entitlement_grants'));
assert.ok(webhook.includes('refresh_effective_entitlements'));
assert.ok(!webhook.includes('billing=success'));

assert.ok(functionConfig.includes('[functions.create-checkout-session]'));
assert.ok(functionConfig.includes('[functions.create-portal-session]'));
assert.ok(functionConfig.includes('[functions.stripe-webhook]'));
assert.ok(functionConfig.includes('verify_jwt = false'));

assert.ok(browserConfig.includes('billingEnabled: false'));
assert.ok(browserConfig.includes("productCode: 'flappyk'"));
assert.ok(!/sk_(live|test)_/.test(browserConfig));
assert.ok(!/whsec_/.test(browserConfig));
assert.ok(!/sb_secret_/.test(browserConfig));

assert.ok(docs.includes('Adding a future product'));
assert.ok(docs.includes('Only the verified Stripe webhook'));

console.log('Shared billing catalog, server trust boundary, future-product extension and browser secret isolation validated.');
