# FlappyK visual direction

## Product intent

FlappyK is a short market game, not a trading dashboard and not a generic retro website.

The player reads a real hidden historical K-line, trades in fixed increments, tries to finish with positive Excess Return, and clears three markets. The visual system exists to keep that loop immediate, legible, tense, and replayable. It should feel like one instrument from the first tap to the final result — but it must also feel like a game, not a dry data program.

## Canonical direction: Single-Surface Market OS

The architecture remains **Single-Surface Market OS**: one continuous product world and one authoritative presentation owner. The expressive layer inside that system is now **Market Arcade**.

Single-Surface solved the old fragmentation problem. Market Arcade solves the opposite failure mode: excessive restraint. The product should preserve structural clarity while using scale, motion, tactile controls, live-market focus, and score drama to make play feel active.

The canonical system follows these rules:

- one continuous dark market surface from home through gameplay, settlement, dialogs, and run complete;
- the chart remains the dominant surface during play;
- hierarchy comes first from typography, spacing, separators, scale, and state;
- floating paper, receipt, notebook, glass-dashboard, and compatibility-skin metaphors remain removed;
- square geometry stays, but selective physical depth is allowed for primary game controls and major result moments;
- cyan is reserved for system/reference state;
- yellow is reserved for primary action and current-player focus;
- green and red are reserved for market/performance/trade semantics;
- desktop and mobile share the same information hierarchy, with mobile changing control geometry only.

There is no alternative legacy skin, no compatibility theme, and no visual fallback. `premium-ui.css` is the single canonical owner for shared presentation.

## Market Arcade expression

Market Arcade is not a return to neon decoration. Its purpose is to make the existing game loop readable and emotionally legible.

### Readability floor

Operational information must be readable without leaning into the screen.

- important gameplay values such as Total and Return should generally render at 16–26 px depending on viewport;
- primary labels, run/day state, weather, and Excess labels should generally sit around 10–13 px rather than 7–9 px microtype;
- home supporting copy and Story body copy should generally sit around 17–21 px on larger surfaces and remain about 17 px on mobile;
- primary game actions should use visibly larger type than secondary commands;
- Chinese may use slightly larger line-height and the existing Chinese display family to preserve legibility.

Tiny text is not considered premium density. It is considered lost information.

### Game-feel hierarchy

Game feel comes from a small set of strong signals:

1. a clear opening focal point and dominant PLAY control;
2. tactile BUY / SELL controls with an unmistakable pressed state;
3. a live current-market focus on the chart;
4. obvious run/day progress;
5. strong positive/negative semantic response;
6. a score reveal that feels like the end of a round;
7. short, purposeful transitions that reinforce state changes.

Do not add extra feature panels simply to make the screen feel richer.

### Depth and atmosphere

Selective depth is allowed where it communicates physical interaction or importance:

- PLAY, BUY, SELL, and the primary next/restart action may use a short hard shadow or inset depth to feel pressable;
- the main shell, Story tape, settlement result, and major dialogs may use restrained depth to establish foreground/background separation;
- subtle grid, scan-line, radial-light, or low-opacity background fields may establish arena atmosphere;
- depth must never become a second card system or a stack of floating dashboard tiles.

Glow, bloom, lens effects, glass panels, and decorative neon remain prohibited as default styling.

## Interaction model

Every state should feel like a mode change inside one market game surface, not navigation into a different website.

- Home is the idle/start state of the game arena.
- Story is an analysis mode inside the same surface, not a paper article.
- Gameplay activates the market canvas and compresses information into a command rail.
- Settlement keeps the same surface and changes hierarchy from action to evaluation.
- Leaderboard, onboarding, and custom challenge use the same system shell.
- Run complete is the final state of the same game world, not a separate celebration theme.

Transitions may use short opacity, position, scale, or progress motion when they reinforce state. They must not compete with the K-line or interrupt input.

## Home hierarchy

The first screen answers four questions in order:

1. What is this? — FlappyK / hidden historical market game.
2. What do I do? — trade three hidden markets and beat the benchmark.
3. Where do I play? — Crypto, A-Shares, and US Stocks.
4. What is the primary action? — Play.

PLAY is the dominant tactile action. The FLAPPY K title is intentionally large and the home surface may use a restrained oversized K or arena field as background identity. Personal best, Daily Run, rankings, account, language, and installation remain available in one secondary command surface rather than separate visual cards.

## Gameplay hierarchy

The chart gets maximum useful space. The persistent command rail contains only information required to act:

- Total;
- Return;
- live Excess;
- Run;
- Day progress;
- weather state;
- speed;
- back / pause;
- BUY / SELL controls.

The rail is one continuous surface with separators. Individual metrics are not floating cards. Key values are intentionally larger than their labels. Desktop keyboard hints remain low priority. Mobile uses large BUY and SELL controls with speed between them and keeps the same visual grammar.

## Market visualization grammar

The K-line is part of the game interface, not a decorative background. It follows the same tokens and semantics as the HUD.

- the canvas background is the same graphite surface as the application;
- the plotting grid uses quiet hairlines rather than a neon field;
- candles keep real market up/down conventions, including A-share red-up / green-down behavior;
- cyan denotes system/reference information and the player's equity path;
- green and red trade markers are geometric arrows/triangles, never emoji;
- yellow marks current-player focus on the equity trace;
- the latest visible candle may receive a restrained cyan focus band and cursor line so the player knows where the market is now;
- the current price may use a compact cyan edge badge rather than an unreadably small axis label;
- trade markers should be large enough to read as game events without covering the candles;
- PLAYER EQUITY is intentionally stronger than a passive analytical sparkline;
- no glow, bloom, shadowBlur, decorative emoji, or independent chart theme is allowed;
- price and player-equity regions are labelled explicitly and share one plot grammar;
- the visualization adapts to available canvas dimensions without changing market data or scoring.

`scripts/market-canvas.js` is the only market-chart renderer. `game.js` supplies state and must not contain a second drawing implementation or visual fallback.

## Weather semantics

Weather remains functional feedback and keeps the existing scoring semantics:

| State | Rule | Meaning |
| --- | --- | --- |
| Clear | player return is non-negative and Excess Return is non-negative | player is ahead of the market |
| Cloudy | player return is non-negative but Excess Return is negative | player is profitable, but the market is ahead |
| Rain | player return is negative | player is underwater |

Weather stays subordinate to the K-line, Return, Excess, trade markers, and controls. On compact mobile layouts the textual weather strip may disappear when space is constrained; run progress keeps the rail slot.

## Settlement

Settlement is the end-of-round score state of the same market surface.

The hierarchy is:

1. verdict;
2. Excess Return;
3. player-versus-market comparison;
4. revealed asset and period;
5. expandable accounting detail;
6. next action.

Excess Return is allowed to become the largest number on the screen and may use a short scale/position reveal. Success/failure color carries semantic meaning. The screen must still remain contained within the viewport and scroll internally when needed on short phones.

## Run complete

The final three-market result uses the same dark surface, typography, separators, and command language as the rest of the product.

No isolated champagne skin or alternate gold/orange theme should return. Celebration comes from hierarchy, final-score scale, completion state, restrained accent atmosphere, and the tactile restart/share actions.

## Chinese and English

Chinese and English are one product, not two layouts.

- Information hierarchy and available actions are identical.
- Chinese uses the existing `ZCOOL QingKe HuangYou` family where pixel display text would otherwise become illegible.
- English keeps `Press Start 2P` only for sparse display moments and `Pixelify Sans` for operational UI.
- Chinese copy receives natural line-height and does not lose content to make the layout fit.
- Responsive behavior is based on available space and virtual-control state, not language.
- pause, resume, and back controls keep real DOM symbols and localized accessible labels; presentation CSS never deletes semantic content.

## Architecture boundary

`premium-ui.css` is the single canonical owner of shared visual tokens, atmosphere, typography scale, shared surfaces, home presentation, HUD appearance, Story analysis mode, settlement, run-complete presentation, and shared secondary-screen presentation. It does not take over geometry already owned by a feature stylesheet.

`style.css` owns only base document, canvas, screen containment, and generic interaction foundations.

`mobile-controls.css` is the canonical owner for mobile command-dock geometry, thumb-zone placement, mobile speed placement, safe-area spacing, and chart clearance. `premium-ui.css` may skin those controls but must not position the dock.

`indicator-cards.css` owns BOLL/MACD power-up geometry and its relationship to the mobile command dock.

`account-integration.css` owns account-toolbar placement and account-specific presentation.

`scripts/market-canvas.js` owns all market-chart rendering. `game.js` supplies live data/state to it and does not own chart presentation.

`scripts/premium-ui.js` owns existing home/HUD/control/settlement composition and interaction feedback.

`scripts/premium-ui-refinement.js` owns HUD rail composition and DOM normalization. It must not inject presentation styles or erase semantic control content.

`market-weather.css` and `scripts/market-weather.js` continue to own weather semantics and environmental feedback only.

Core game data, scoring, pass rules, account/cloud history, Daily Run, friend challenge, leaderboard, sharing, PWA behavior, and market loading are unchanged by this visual evolution.

## Rules for future visual work

1. Do not add a second theme, compatibility skin, `*-polish.css`, `*-fix.css`, or canvas patch layer.
2. Change the actual owning component or shared visual system directly.
3. Keep one continuous visual world from home to final result.
4. Keep the chart visually dominant during play.
5. Readability outranks terminal density; do not reintroduce 7–9 px operational text as a default.
6. Use depth only when it communicates primary interaction or state hierarchy; do not rebuild card stacks.
7. Reserve semantic colors: cyan for system state, yellow for primary action/focus, green/red for performance and trades.
8. Preserve the same information and actions in Chinese and English.
9. Treat mobile as the same game with different control geometry, not a reduced product.
10. Keep weather semantic and subordinate to trading information.
11. Keep `scripts/market-canvas.js` as the single authoritative chart renderer.
12. Make new motion answer one question: what changed, what can I press, or what result did I achieve?
