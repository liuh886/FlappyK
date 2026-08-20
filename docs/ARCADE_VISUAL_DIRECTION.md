# FlappyK visual direction

## Product intent

FlappyK is a short market game, not a trading dashboard and not a generic retro website.

The player reads a real hidden historical K-line, trades in fixed increments, tries to finish with positive Excess Return, and clears three markets. The visual system exists to keep that loop immediate, legible, and tense. It should feel like one instrument from the first tap to the final result.

## Canonical direction: Single-Surface Market OS

The product uses one visual language: **Single-Surface Market OS**.

The previous Hidden Market Terminal direction established the right product character, but still separated home, story, gameplay, settlement, and run-complete states into different visual metaphors. That split is retired.

The canonical system now follows these rules:

- one continuous dark market surface from home through gameplay, settlement, dialogs, and run complete;
- the chart remains the dominant surface during play;
- hierarchy comes from spacing, separators, typography, and state — not stacks of cards;
- floating paper, receipt, notebook, celebration, glass, and dashboard metaphors are removed;
- square geometry remains, but hard decorative shadows and clipped-corner ornaments are no longer primary styling devices;
- cyan is reserved for system/state information;
- yellow is reserved for primary action and focus;
- green and red are reserved for market/performance semantics;
- desktop and mobile share the same information hierarchy, with mobile changing control geometry only.

There is no alternative legacy skin, no compatibility theme, and no visual fallback. `premium-ui.css` is the single canonical owner for shared presentation.

## Interaction model

Every state should feel like a mode change inside one market operating surface, not navigation into a new website page.

- Home is the idle state of the same terminal.
- Story is an analysis mode inside the home surface, not a paper article.
- Gameplay activates the chart and compresses information into a command rail.
- Settlement keeps the same surface and changes hierarchy from action to evaluation.
- Leaderboard, onboarding, and custom challenge use the same system shell.
- Run complete is the terminal's final state, not a separate celebration theme.

Transitions may use short opacity/position changes, but they must never compete with gameplay or imply a different product.

## Home hierarchy

The first screen answers four questions in order:

1. What is this? — FlappyK / hidden historical market game.
2. What do I do? — trade three hidden markets and beat the benchmark.
3. Where do I play? — Crypto, A-Shares, and US Stocks.
4. What is the primary action? — Play.

Play is the only filled high-emphasis action. Personal best, Daily Run, rankings, account, language, and installation remain available in one secondary command surface rather than separate visual cards.

## Gameplay hierarchy

The chart gets maximum space. The persistent command rail contains only information required to act:

- Total;
- Return;
- live Excess;
- Run;
- Day progress;
- weather state;
- speed;
- back / pause;
- BUY / SELL controls.

The rail is one continuous surface with separators. Individual metrics are not floating cards. Desktop keyboard hints remain low-priority. Mobile uses large BUY and SELL controls with speed between them and keeps the same visual grammar.

## Market visualization grammar

The K-line is part of the product interface, not a decorative game background. It follows the same tokens and hierarchy as the HUD.

- the canvas background is the same graphite surface as the application;
- the plotting grid uses quiet hairlines, never a neon field;
- candles keep real market up/down conventions, including A-share red-up / green-down behavior;
- cyan denotes system/reference information and the player's equity path;
- green and red trade markers are simple geometric triangles, not emoji or character illustrations;
- yellow marks the current player focus point only;
- current-price and starting-capital references use restrained dashed lines;
- no glow, bloom, shadow, gradient, decorative emoji, or separate chart theme is allowed;
- price and player-equity regions are labelled explicitly and share the same plot grammar;
- the visualization must adapt to available canvas dimensions without changing the underlying market data or scoring.

`scripts/market-canvas.js` is the only market-chart renderer. `game.js` supplies state and must not contain a second drawing implementation or visual fallback.

## Weather semantics

Weather remains functional feedback and keeps the existing scoring semantics:

| State | Rule | Meaning |
| --- | --- | --- |
| Clear | player return is non-negative and Excess Return is non-negative | player is ahead of the market |
| Cloudy | player return is non-negative but Excess Return is negative | player is profitable, but the market is ahead |
| Rain | player return is negative | player is underwater |

Weather must remain lower contrast than the K-line, player return, trade markers, and controls. It never changes scoring or market playback. On compact mobile layouts the textual weather strip may disappear when space is constrained; its semantics remain available through the visual state while run progress keeps the rail slot.

## Settlement

Settlement is no longer a paper receipt. It is the evaluation state of the same market surface.

The hierarchy is:

1. verdict;
2. Excess Return;
3. player-versus-market comparison;
4. revealed asset and period;
5. expandable accounting detail;
6. next action.

The visual transition comes from information hierarchy and semantic color, not a change to a light theme. The settlement screen is always contained by the same viewport surface; overflow, when necessary on short phones, happens inside the settlement state rather than expanding the page.

## Run complete

The final three-market result uses the same dark surface, typography, separators, and command buttons as the rest of the product.

No gold/orange celebration theme, decorative champagne skin, or isolated result page should return. Celebration comes from the result itself, the final score, and the completion state.

## Chinese and English

Chinese and English are one product, not two layouts.

- Information hierarchy and available actions are identical.
- Chinese uses the existing `ZCOOL QingKe HuangYou` family where pixel display text would otherwise become illegible.
- English keeps `Press Start 2P` only for sparse display moments and `Pixelify Sans` for operational UI.
- Chinese copy receives natural line-height and does not lose content to make the layout fit.
- Responsive behavior is based on available space and virtual-control state, not language.
- pause, resume, and back controls keep real DOM symbols and localized accessible labels; presentation CSS never deletes their semantic content.

## Architecture boundary

`premium-ui.css` owns shared visual tokens, shared surfaces, the home terminal, shared HUD appearance, story analysis mode, settlement, run-complete presentation, and shared secondary-screen presentation. It does not take over geometry already owned by a feature stylesheet.

`style.css` owns only base document, canvas, screen containment, and generic interaction foundations.

`mobile-controls.css` is the canonical owner for mobile command-dock geometry, thumb-zone placement, mobile speed placement, safe-area spacing, and chart clearance. `premium-ui.css` may skin those controls but must not position the dock.

`indicator-cards.css` owns BOLL/MACD power-up geometry and its relationship to the mobile command dock.

`account-integration.css` owns account-toolbar placement and account-specific presentation.

`scripts/market-canvas.js` owns all market-chart rendering. `game.js` supplies live data/state to it and does not own chart presentation.

`scripts/premium-ui.js` owns existing home/HUD/control/settlement composition and interaction feedback.

`scripts/premium-ui-refinement.js` owns existing HUD rail composition and DOM normalization. It must not inject presentation styles or erase semantic control content.

`market-weather.css` and `scripts/market-weather.js` continue to own weather semantics and environmental feedback only.

Core game data, scoring, pass rules, account/cloud history, Daily Run, friend challenge, leaderboard, sharing, PWA behavior, and market loading are unchanged by this visual redesign.

## Rules for future visual work

1. Do not add a second theme, compatibility skin, `*-polish.css`, `*-fix.css`, or canvas patch layer.
2. Change the actual owning component or shared visual system directly.
3. Keep one continuous visual world from home to final result.
4. Keep the chart visually dominant during play.
5. Prefer separators and hierarchy over cards, shadows, glow, and decorative containers.
6. Reserve semantic colors: cyan for system state, yellow for primary action/focus, green/red for performance and trades.
7. Preserve the same information and actions in Chinese and English.
8. Treat mobile as the same game with different control geometry, not a reduced product.
9. Do not move feature geometry into the shared theme merely to restyle it.
10. Keep weather semantic and subordinate to trading information.
11. Keep `scripts/market-canvas.js` as the single authoritative chart renderer.
