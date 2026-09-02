# FlappyK UI architecture

## Why this document exists

FlappyK grew through small feature PRs. Feature isolation is useful, but visual work accumulated three different kinds of late override:

1. a base stylesheet defined the original arcade UI;
2. `visual-polish.css` introduced rounded, blurred web-style surfaces;
3. `premium-ui.css` is the canonical modern-pixel visual owner; refinement rules are consolidated into it.

The JavaScript followed a similar pattern: later files repeatedly wrapped `updateUI`, `startLevel`, and `endLevel`, then repaired DOM produced by earlier files. That made the final result depend on load order and made apparently small UI edits expensive to verify.

PR #48 removes the obsolete `visual-polish.css` layer and stops `premium-ui-refinement.js` from wrapping the three game lifecycle functions a second time.

## Ownership model

### Core game

- `game.js` owns market playback, cash, positions, trades, canvas drawing, and the canonical lifecycle functions.
- `results.js` owns authoritative settlement values and pass/fail output.
- UI code must not recompute pass/fail from rounded display strings.

### State and composition

- `scripts/ui-state.js` owns responsive state: home, onboarding, playing, paused, settlement, run complete, and whether virtual controls are active.
- `scripts/premium-ui.js` owns the structural composition of the home screen, HUD, speed controls, coachmark, and settlement summary.
- `scripts/premium-ui-refinement.js` is a transitional runtime synchronizer only. It may observe canonical DOM/state and normalize layout, but it must not replace `updateUI`, `startLevel`, or `endLevel`.

### Styling

- Feature stylesheets such as `daily-run.css`, `leaderboard.css`, and `membership.css` own their feature-specific components.
- `premium-ui.css` owns shared UI geometry and component layout.
- `premium-ui.css` owns the current modern-pixel theme, responsive scale, and shared presentation.
- `visual-polish.css` is retained only as historical source and is not loaded.
- New visual directions must edit the owning stylesheet. Do not add `*-polish.css`, `*-fix.css`, or another final override sheet.

### Decision Engine (second kernel)

FlappyK has two kernels that must stay strictly separated per `PRODUCT_PHILOSOPHY.md`:

- `Market Engine` — `game.js` + `scripts/market-pass-rule.js` + `data-loader.js`. The only writer of `cash/shares/currentData/currentPrice/settlement` and the only authority for `EXCESS > 0` win/lose.
- `Decision Engine` — `scripts/decision/*`. The only reader that turns decisions into learning. It subscribes to `FlappyKGameController` hooks (`data-resolved`, `tick`, `trade`, `level-did-settle`) and to `FlappyKEvents`; it never wraps, replaces, or reorders `startLevel`/`endLevel`/`handleBuy`/`handleSell`/`pickNormalData`.

Ownership inside `scripts/decision/`:

- `decision-recorder.js` owns the append-only `Decision Timeline` (facts only, in-memory per level, flushed on `level-did-settle`).
- `decision-metrics.js` owns pure `analyzeRun({ currentData, actions, totalHistory, levelStartCash }) -> DecisionReport` (no DOM, no I/O).
- `counterfactual-engine.js` owns pure counterfactual simulations `simulateBuyAndHold / simulateFirstEntryHold / simulateNoTrade` (labeled parallel universes, never presented as advice).
- `market-regime.js` owns pure market description `classifyMarket(window) -> { regime, volatility, drawdown, shape }` and must not read player actions or results.
- `insight-engine.js` owns `facts -> game verdict` mapping (e.g. `PAPER_HANDS` when `firstEntryHoldReturn - playerReturn > threshold`). It must not recompute facts and must emit only whitelisted verdict ids with traceable inputs.
- `mastery-system.js` owns cross-run achievements/traits (`DIAMOND HANDS`, `DIP BUYER`, etc.) derived from thresholded facts over many runs, never from a single run.
- `decision-storage.js` owns persistence of Decision Reports and mastery (local-only, fail-open, versioned keys).

Presentation inside `scripts/decision/presentation/` (thin views, no logic):

- `verdict-view.js` owns settlement verdict cards (max 2, fact lines only).
- `counterfactual-view.js` owns the compact Decision Summary (`YOU/HOLD + BIGGEST MOMENT` ≤3 lines, replaces the 4-column bar).
- `ghost-replay-view.js` owns the 5-8s Ghost canvas (`YOU vs HOLD`, `▲BUY/▼SELL`, progress strip, final `YOU/HOLD` compare, `prefers-reduced-motion` static).
- `ghost-overlay.js` is the thin orchestrator: listens to `flappyk:decision-ready`, calls presentation views, and owns `GHOST REPLAY` button injection. It must not contain drawing or metric logic. No presentation file may import decision_metrics or mutate `cash/shares`.

Prohibited for Decision Engine:

- mutating `cash/shares/currentData` or blocking trades
- recomputing `EXCESS` with a different formula or introducing a second win condition
- `generateInvestmentAdvice()` or `if/else -> personality label` classifiers
- hindsight strings: `You should have bought on Day X` / `Your sell was a mistake` / `You are a Trend Rider`
- market-regime code that branches on player return or trade count

### Remote and optional services

- `pwa.js` keeps analytics and membership loading non-blocking so guest gameplay remains available.
- `analytics.js` may observe gameplay but must never change game outcomes.
- `membership.js` may queue and synchronize completed-run summaries but must never block local play or treat personal history as trusted leaderboard evidence.
- `Decision Engine` is optional for play: if any `scripts/decision/*` module fails to load, the core three-market run, Daily Run, friend challenge, custom challenge, and settlement must remain fully playable.

## Required rules

1. One component has one structural owner.
2. A later module may consume state; it must not silently rebuild another module's component.
3. UI labels are real DOM nodes. Generated CSS content is decorative, not a second source of copy.
4. Canonical numeric and status values stay unformatted in logic; formatting belongs to presentation.
5. Responsive decisions use `FlappyKUiState.virtualControls`, not viewport width alone.
6. New lifecycle wrappers require an architecture review. The pixel runtime must remain wrapper-free.
7. Inline styles in `index.html` are legacy debt. New inline styles are prohibited; touched elements should move to owning classes.
8. Every architecture change must keep desktop, short-desktop, coarse-pointer mobile, Chinese UI, settlement, and offline PWA browser tests green.
9. Market Engine is the sole authority for `EXCESS > 0` win/lose. Decision Engine is read-only: it subscribes to `FlappyKGameController` hooks, never wraps `startLevel`/`endLevel`/`handleBuy`/`handleSell`.
10. Decision Engine v0.1 outputs only FACT and labeled COUNTERFACTUAL. `INTERPRETATION` and `generateInvestmentAdvice()` are prohibited. All verdict strings must be traceable to a `DecisionReport` field.
11. `market-regime.js` must not read player actions or results. Hindsight-bullshit strings (`You should have ... on Day X`) are prohibited in every language.
12. Decision storage is local-only, versioned, and fail-open. It must never be used as trusted leaderboard evidence and must never block settlement or replay.

## Remaining debt

The project is not yet a component framework, and a rewrite is not justified. The next safe reductions are:

- move the compatibility style currently injected by `premium-ui-refinement.js` into the pixel theme stylesheet;
- migrate remaining inline styles in `index.html` to semantic classes;
- replace the remaining lifecycle wrappers in analytics and premium composition with explicit custom lifecycle events emitted by one adapter;
- eventually rename `premium-ui-refinement.*` after the compatibility layer is absorbed, so file names reflect stable ownership rather than patch history.

These items should be handled as bounded refactors with browser evidence, not as another visual redesign.
