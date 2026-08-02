# FlappyK membership setup

This repository contains a dormant, guest-safe Supabase membership client. The game behaves exactly as before until `membership-config.js` is enabled with a Supabase project URL and publishable key.

## Security boundary

Public in GitHub Pages:

- Supabase project URL
- Supabase publishable/anon key
- entitlement code
- Edge Function public URLs

Never commit:

- Supabase service-role or secret key
- Stripe secret key
- Stripe webhook signing secret
- Google OAuth client secret

The public Supabase key is safe only because every exposed table has Row Level Security. Apply and review the migration before enabling the client.

## 1. Create one shared Supabase project

Use the same project for FlappyK and RhythmCoach so the same Google/email identity maps to one `auth.users` record. Each application still keeps its own browser session because they run on different origins.

Apply:

```bash
supabase db push
```

or paste `supabase/migrations/0001_membership_foundation.sql` into the Supabase SQL editor.

The migration creates:

- `profiles`
- `game_runs`
- `billing_customers`
- `subscriptions`
- `entitlements`

The browser may write only its own profile and personal run summaries. Billing and entitlement tables are read-only to authenticated users and must be written by service-role payment functions.

## 2. Configure authentication

In Supabase Authentication:

1. Set the Site URL to `https://liuh886.github.io/FlappyK/`.
2. Add the exact FlappyK URL to the allowed redirect URL list.
3. Add local development URLs only when needed.
4. Enable Email sign-in.
5. Configure Google as an OAuth provider and add the Supabase callback URL shown by the dashboard to the Google OAuth client.

The client uses PKCE, persists the browser session and passes the configured `redirectUrl` to Google OAuth and email magic-link flows.

## 3. Enable the public client

Edit `membership-config.js`:

```js
window.FlappyKMembershipConfig = Object.freeze({
    enabled: true,
    supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co',
    supabasePublishableKey: 'YOUR_PUBLIC_KEY',
    entitlementCode: 'flappyk.pro',
    checkoutFunctionUrl: '',
    portalFunctionUrl: '',
    redirectUrl: 'https://liuh886.github.io/FlappyK/',
});
```

Do not enable the file before the migration and RLS policies are applied.

## 4. Current Phase 1 behavior

When configured:

- an ACCOUNT button appears;
- guests may continue playing without signing in;
- users may sign in with Google or an email magic link;
- the local player summary is copied to the user's own `profiles` row;
- completed three-market runs are queued locally and synced to `game_runs` after sign-in;
- entitlements are read from `entitlements`;
- `FlappyKMembership.can('flappyk.pro')` is the client feature check.

Cloud run rows are personal history, not trusted public leaderboard submissions. Browser clients can be modified by players, so competitive results require a separate verification design.

## 5. Stripe phase

Keep `checkoutFunctionUrl` and `portalFunctionUrl` empty until the Edge Functions exist. When added, they must:

- require a valid Supabase user JWT;
- derive the user from that JWT rather than accepting a user ID from the request body;
- create or retrieve the user's Stripe customer;
- return a Stripe-hosted Checkout or Customer Portal URL;
- never expose Stripe secret keys to the browser.

The Stripe webhook function must be deployed without normal user-JWT enforcement because Stripe does not send a Supabase token. It must instead verify the raw request body with the Stripe webhook signing secret before writing `subscriptions` and `entitlements` using a Supabase secret/service-role client.

Recommended entitlement lifecycle:

- `trialing` or `active`: `active = true`
- `past_due`: product-defined grace period
- canceled before period end: active until `current_period_end`
- expired, unpaid or revoked: `active = false`

Store function secrets with Supabase project secrets, not repository files.

## 6. Shared product codes

- FlappyK: `flappyk.pro`
- RhythmCoach recording download: `rhythmcoach.recording_download`

A single Stripe customer may hold subscriptions that grant either or both entitlements.

## 7. Verification checklist

Before production payments:

- create a test user with Google;
- create a test user with email magic link;
- verify one user cannot read another user's profile or runs;
- verify browser clients cannot insert or update entitlements;
- verify guest gameplay works while Supabase requests are blocked;
- verify OAuth returns to the canonical GitHub Pages URL;
- verify a completed run remains local when offline and syncs after sign-in;
- verify sign-out removes cloud access but does not delete local records;
- verify payment success redirects do not grant Pro without a signed webhook.
