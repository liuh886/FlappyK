# Cloud run sync boundary

FlappyK remains fully playable as a guest and offline. Cloud sync is an optional durability layer for authenticated players; it is not part of the game engine and cannot change a market result.

## Data written

Only a completed three-game run summary is eligible for upload:

- a deterministic local signature used for idempotency;
- mode;
- total return and total Excess Return;
- the three completed game summaries;
- completion timestamp;
- authenticated user ID and product code added at upload time.

Partial runs, keystrokes, raw browser history, credentials, OAuth tokens, email contents, and unrelated local-storage values are not uploaded.

## Reliability states

The account dialog exposes the canonical state of the pending queue:

- `local`: no authenticated cloud action has occurred;
- `queued`: at least one completed run is retained locally;
- `syncing`: one serialized upload pass is active;
- `saved`: the pending queue is empty after successful idempotent upsert;
- `retry`: at least one upload failed and remains retained locally.

Repeated login, `online`, and manual retry triggers share one in-flight promise. The database uniqueness rule `(user_id, local_signature)` and client-side signature deduplication prevent duplicate rows.

## Failure behavior

- A failed upload never removes the local queue entry.
- If `localStorage` is blocked, the current-session queue remains in memory and guest play continues.
- Account, analytics, and network failures must not block the PLAY action or core offline game assets.
- A visible retry control is shown when upload fails.

## Restore behavior

After authentication, the client reads the signed-in user's profile and recent `game_runs`. A clean browser can therefore display completed-run count and best Excess Return without relying on local history.

## Trust boundary

Cloud history is personal durability data. It is not automatically trusted as public leaderboard evidence. Public ranking retains its separate validation and submission rules.

Supabase Row Level Security restricts profile, entitlement, subscription, and game-run rows to the authenticated owner. Publishable browser credentials are not service-role credentials and must never bypass RLS.

## Acceptance evidence

The repository includes:

- deterministic Node tests for local, queued, syncing, saved, retry, dedupe, concurrent triggers, blocked storage, and recovery;
- Chromium tests for offline-completed upload after sign-in, no duplicate row after repeated triggers, visible retry and recovery, guest-play availability, and clean-browser cloud restore;
- PWA contracts requiring the queue core and sync UI assets in the offline shell.
