# FlappyK Product Governance

Updated: 2026-08-03

## Product boundary

FlappyK remains a guest-first historical-market game. Authentication, analytics, cloud persistence, payment, and remote services must fail open to uninterrupted guest play. The core three-market run, Daily Run, friend challenge, and local records remain available without an account.

## Current governed baseline

The following foundations are already implemented and should be treated as maintained product contracts rather than reopened roadmap items:

- installable offline PWA with validated icons, service worker, and mobile installation guidance;
- bilingual desktop and mobile gameplay with persistent language choice;
- compact in-game navigation, fixed mobile controls, and gameplay gesture locking;
- privacy-bounded GA4 events for play, completion, sharing, and installation;
- optional Supabase authentication with guest fallback;
- personal completed-run synchronization protected by Row Level Security;
- shared entitlement identifiers with Stripe and paid access still disabled;
- completed-run guidance that explains local retention and account saving.

## Next decision gates

### Gate 1 — cloud-save reliability

Before adding more account features, prove that a completed run has a durable and understandable lifecycle:

- explicit local, queued, syncing, saved, and retry states;
- idempotent upload with no duplicate runs after refresh, reconnect, or repeated sign-in;
- successful recovery after signing in on a clean browser profile;
- regression coverage for offline completion followed by later authentication;
- no use of personal cloud history as trusted public-leaderboard evidence.

### Gate 2 — repeat-use evidence

Before enabling payment, measure whether users return for the product itself:

- Daily Run completion and repeat-start behavior;
- seven-day return cohort based on non-PII identifiers;
- completion-to-sign-in and sign-in-to-cloud-save funnels;
- PWA installation prompted only after the user has completed meaningful play;
- no new game modes added merely to increase feature count.

### Gate 3 — paid product value

Stripe remains disabled until repeat-use evidence exists and at least one paid benefit is valuable without weakening the free game. Payment work must remain independently deployable and reversible. A verified webhook is the only authority for paid entitlements.

## Release rules

Every product PR must preserve:

1. guest play when authentication, analytics, Supabase, or payment is unavailable;
2. mobile controls within the safe viewport;
3. offline completion of the core game;
4. no secrets or trusted entitlement flags in browser storage;
5. bilingual copy and browser smoke coverage for changed user flows.

Visual refinement should follow a concrete usability or readability problem. It should not displace reliability, retention, or evidence work.