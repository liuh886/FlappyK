# FlappyK UI architecture

## Why this document exists

FlappyK grew through small feature PRs. Feature isolation is useful, but visual work accumulated three different kinds of late override:

1. a base stylesheet defined the original arcade UI;
2. `visual-polish.css` introduced rounded, blurred web-style surfaces;
3. `premium-ui.css` and `premium-ui-refinement.css` rebuilt the same selectors as a modern pixel game.

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
- `premium-ui-refinement.css` owns the current modern-pixel theme and responsive scale.
- `visual-polish.css` is retained only as historical source and is not loaded.
- New visual directions must edit the owning stylesheet. Do not add `*-polish.css`, `*-fix.css`, or another final override sheet.

### Remote and optional services

- `pwa.js` keeps analytics and membership loading non-blocking so guest gameplay remains available.
- `analytics.js` may observe gameplay but must never change game outcomes.
- `membership.js` may queue and synchronize completed-run summaries but must never block local play or treat personal history as trusted leaderboard evidence.

## Required rules

1. One component has one structural owner.
2. A later module may consume state; it must not silently rebuild another module's component.
3. UI labels are real DOM nodes. Generated CSS content is decorative, not a second source of copy.
4. Canonical numeric and status values stay unformatted in logic; formatting belongs to presentation.
5. Responsive decisions use `FlappyKUiState.virtualControls`, not viewport width alone.
6. New lifecycle wrappers require an architecture review. The pixel runtime must remain wrapper-free.
7. Inline styles in `index.html` are legacy debt. New inline styles are prohibited; touched elements should move to owning classes.
8. Every architecture change must keep desktop, short-desktop, coarse-pointer mobile, Chinese UI, settlement, and offline PWA browser tests green.

## Remaining debt

The project is not yet a component framework, and a rewrite is not justified. The next safe reductions are:

- move the compatibility style currently injected by `premium-ui-refinement.js` into the pixel theme stylesheet;
- migrate remaining inline styles in `index.html` to semantic classes;
- replace the remaining lifecycle wrappers in analytics and premium composition with explicit custom lifecycle events emitted by one adapter;
- eventually rename `premium-ui-refinement.*` after the compatibility layer is absorbed, so file names reflect stable ownership rather than patch history.

These items should be handled as bounded refactors with browser evidence, not as another visual redesign.
