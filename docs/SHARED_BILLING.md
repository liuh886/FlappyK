# Hao Apps shared billing

This repository currently carries the source of truth for the shared Supabase billing layer used by:

- FlappyK — `flappyk` → `flappyk.pro`
- Ownly — `ownly` → `ownly.pro`
- RhythmCoach — `rhythmcoach` → `rhythmcoach.pro` and `rhythmcoach.recording_download`
- NewsFlow — `newsflow` → `newsflow.pro`
- AlphaEngine — `alpha_engine` → `alpha_engine.pro`

The applications share one Supabase Auth user, one Stripe customer mapping, one subscription ledger and one effective-entitlement table. Product data remains isolated by `product_code`; product-specific local data is not uploaded by the billing system.

## Trust boundary

The browser may:

- sign in through Supabase Auth;
- read its own effective entitlements;
- request a Checkout or Customer Portal session with a product code.

The browser may not:

- choose an arbitrary Stripe price;
- write subscriptions, grants or effective entitlements;
- grant Pro based on a Checkout return URL;
- access Stripe or Supabase server secrets.

Only the verified Stripe webhook writes subscription and entitlement state.

## Required Supabase secrets

Set these in **Supabase Dashboard → Edge Functions → Secrets**:

```text
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Do not place either value in GitHub, a browser bundle or GitHub Actions unless Actions is explicitly used to deploy functions.

## Shared endpoints

```text
https://blgwlycfcwvsupmqyqwn.supabase.co/functions/v1/create-checkout-session
https://blgwlycfcwvsupmqyqwn.supabase.co/functions/v1/create-portal-session
https://blgwlycfcwvsupmqyqwn.supabase.co/functions/v1/stripe-webhook
```

Checkout and Portal require a Supabase user JWT. The webhook has platform JWT verification disabled and verifies the Stripe signature over the raw request body.

## Adding a future product

1. Create the Stripe Product and recurring Price.
2. Insert one row into `billing_products`.
3. Insert the Price into `billing_prices` and mark one active Price as default.
4. Add one or more rows to `billing_product_entitlements`.
5. Add the product's exact GitHub Pages URL to Supabase Auth redirect URLs.
6. Copy the shared membership client and change only:
   - `appName`
   - `productCode`
   - `entitlementCode`
   - `redirectUrl`
   - any local-data privacy note
7. Keep `billingEnabled: false` until live Checkout, webhook, cancellation and Portal tests pass.

A future bundle product can grant several app entitlements by adding multiple rows to `billing_product_entitlements`. `entitlement_grants` prevents one canceled source from revoking an entitlement still granted by another active subscription.

## Rollout gates

Before changing any application to `billingEnabled: true`:

- Stripe identity verification and payouts are enabled;
- Customer Portal is configured;
- both Supabase secrets are set;
- the webhook endpoint is enabled and healthy;
- a live or test subscription creates `subscriptions`, `entitlement_grants` and `entitlements` rows;
- cancellation preserves access through the paid period and then revokes it;
- free/local functionality remains available when billing or Auth is unavailable.
