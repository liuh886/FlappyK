# Personal cloud history boundary

FlappyK remains fully playable as a guest and offline. Signing in adds an optional personal durability layer; it is outside the game engine and cannot change a market result.

## Shared account

FlappyK uses the shared Hao Apps account system:

- Google OAuth or an email magic link;
- one shared profile across Hao Apps;
- a FlappyK product-account row for small player state;
- entitlement readiness with paid actions currently disabled.

The browser uses only the Supabase publishable key. Row Level Security restricts every profile, product-account, entitlement, and game-run row to the authenticated owner.

## Data written

After a signed-in player completes a three-game run, FlappyK may write:

- a deterministic local signature used for idempotency;
- mode;
- total return and total Excess Return;
- the three completed game summaries;
- completion timestamp;
- authenticated user ID and product code.

The product-account row may also store a small normalized personal profile:

- best Excess Return;
- completed-run count;
- markets beaten;
- best score by market.

Partial runs, keystrokes, raw browser history, credentials, OAuth tokens, unrelated local-storage values, and payment secrets are not uploaded.

## Merge behavior

After authentication, local and cloud profiles are merged conservatively:

- personal bests never decrease;
- completed-run and market counts never decrease;
- the best score for each market is retained;
- `(user_id, local_signature)` prevents duplicate completed runs.

A network or account failure never blocks guest play or changes a result. Local records remain usable when cloud sync is unavailable.

## Trust boundary

Cloud history is personal durability data. It is not automatically trusted as public leaderboard evidence. A future public ranking must use a separate server-side validation path and must not rank directly from browser-submitted scores.

## Local and product boundaries

Only FlappyK summary data described above is written. The shared account system does not read data from Ownly, RhythmCoach, NewsFlow, or AlphaEngine, and FlappyK does not receive privileged access to other Hao Apps.
