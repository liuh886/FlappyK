# FlappyK Deep Code Review — 2026-07-18

## Scope

Reviewed the browser game loop, settlement flow, hidden custom challenge, supplemental QQQ loading, mobile controls, Canvas trade markers, result-card export, final Legend summary, responsive CSS, and GitHub Actions validation.

## Fixed in this review

### High — duplicate mobile actions

The core registered both `touchstart` and `mousedown` on each virtual control. Compatibility mouse events can follow a touch event on some browsers, creating two buys, sells, or speed changes from one tap.

**Resolution:** replace the listener-bearing button nodes after startup and bind one accessible `click` handler per control. Add `touch-action: manipulation`.

### High — competing bull implementations

The BUY button and Canvas markers were rewritten in three places: `index.html`, `legend-ticker.js`, and `ui-polish.js`. One path still inserted the bison glyph, and two separate wrappers replaced `CanvasRenderingContext2D.fillText`.

**Resolution:** remove the Legend-level button and Canvas overrides. Keep one trade-marker renderer and the standard `🐂` button markup.

### High — settlement title state competition

The core generated numbered Profit Card titles and a MutationObserver rewrote them after rendering. This previously caused a repeated mutation loop and made the settlement flow fragile.

**Resolution:** remove the observer file. Record the completed level and normalize the visible title once after the complete `endLevel` wrapper chain returns.

### Medium — incorrect export filenames

Because the visible card number was removed, the exporter could no longer infer the completed level and generated `FlappyK_ProfitCard_LevelResult.png`.

**Resolution:** store `data-completed-level` and `data-result-mode` on the card. Generate stable normal and custom filenames from those values.

### Medium — QQQ leaked into normal mode

The supplemental loader added QQQ as an enumerable member of `stockData.usstock`, so the normal third level could randomly select an asset intended for the hidden custom challenge.

**Resolution:** install QQQ as a non-enumerable property while explicitly synchronizing it into the custom selector.

### Medium — normal random-window boundary

The normal selector used `Math.random() * maxStart`, excluding the last legal 250-day window. It also did not filter assets with insufficient history.

**Resolution:** use `maxStart + 1` and filter to arrays with at least `DAYS_PER_LEVEL` rows.

### Low — home-screen hierarchy

The historical-data disclosure looked like a primary callout and competed with the PLAY action.

**Resolution:** remove the ESC and live-data text, and move `REAL HISTORICAL K-LINES` into a low-contrast footer ticker with reduced-motion support.

## Remaining risks

### Medium — order-dependent global wrappers

`results.js`, `legend-ticker.js`, `custom-challenge.js`, and `core-hardening.js` replace global functions such as `startLevel`, `endLevel`, and `pickRandomData`. Correct behavior depends on script load order. A future refactor should replace this with a single game-state controller and explicit lifecycle hooks.

### Medium — remote runtime dependencies

QQQ currently needs a remote historical CSV until data is regenerated into `data.js`. PNG export also depends on the externally hosted `html2canvas` script. Network or upstream changes can disable these features.

### Medium — no browser end-to-end test

CI validates JavaScript syntax, static regression invariants, HTML parsing, and bundled-data continuity, but it does not execute the game in a real browser. A Playwright smoke suite should eventually cover PLAY → trade → Profit Card → NEXT LEVEL, custom QQQ selection, ESC, and PNG export setup.

### Low — legacy listeners remain in the core source

The hardening layer safely replaces the original mobile button nodes, but `game.js` still contains the superseded touch/mouse listeners. The long-term state-controller refactor should remove them from the source rather than neutralizing them after initialization.

### Low — HTML construction from asset labels

Legend cards are assembled with template-string `innerHTML`. Current asset labels are controlled, but future external labels should be escaped or rendered with DOM methods.

## Recommended next engineering step

Create one `GameController` that owns state, transitions, timers, input binding, and result construction. Keep market-data adapters, rendering, and exports separate. This would eliminate the wrapper chain and make real browser tests substantially easier.
