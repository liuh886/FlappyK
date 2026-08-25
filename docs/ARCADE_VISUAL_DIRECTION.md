# FlappyK visual direction

## Product intent

FlappyK is a short pixel market game, not a trading dashboard and not a generic retro website.

The player reads a real hidden historical K-line, trades in fixed increments, tries to finish with positive Excess Return, and clears three markets. The visual system exists to make that loop immediate, legible, tense, tactile, and replayable.

## Canonical direction: Single-Surface Market OS

The architecture remains **Single-Surface Market OS**: one continuous product world and one authoritative presentation owner. Its only expressive visual language is **Pixel Market Arcade**.

Pixel Market Arcade learns proven pixel-game principles — hard silhouettes, limited color roles, strong score hierarchy, immediate press feedback, discrete motion, and a game world that dominates UI chrome — without copying characters, objects, layouts, or identifiable assets from Nintendo, Super Mario, Flappy Bird, or any other game.

The canonical system follows these rules:

- one continuous dark market surface from home through gameplay, settlement, dialogs, and run complete;
- the K-line is the game world during play, not a chart embedded in a dashboard;
- hierarchy comes first from scale, spacing, hard separators, hard depth, and state;
- square geometry is canonical;
- shadows are short, unblurred pixel depth used to communicate pressability and foreground order;
- motion is short and discrete, preferably stepped when it represents a game-state change;
- cyan is reserved for system/reference state;
- yellow is reserved for primary action and current-player focus;
- green and red are reserved for market/performance/trade semantics;
- desktop and mobile share the same information hierarchy, with mobile changing control geometry only.

The default skin is Pixel Market Arcade. Additional skins are sanctioned expressions of the same grammar through the token pipeline: a skin may ONLY override `--game-*` design tokens (and motion rhythm tokens) inside `skins.css`, plus one catalog entry in `scripts/skin-system.js`. Component presentation never moves into skins. There is no alternative legacy skin, no compatibility theme, and no visual fallback outside this pipeline. `premium-ui.css` remains the single canonical owner of shared presentation and of the default token values.

## Pixel Market Arcade expression

Pixel Market Arcade is not a Mario skin and not a neon terminal. It uses the visual grammar of mature pixel games to make FlappyK's own market mechanics feel playable.

### Readability floor

Operational information must be readable without leaning into the screen.

- important gameplay values such as Total and Return should generally render at 16–28 px depending on viewport;
- primary labels, run/day state, weather, and Excess labels should generally sit around 10–13 px rather than 7–9 px microtype;
- home supporting copy and Story body copy should generally sit around 17–21 px on larger surfaces and remain about 17 px on mobile;
- primary game actions use visibly larger type than secondary commands;
- Chinese may use slightly larger line-height and the existing Chinese display family to preserve legibility.

Tiny text is not premium density. It is lost information.

### Game-feel hierarchy

Game feel comes from a small set of strong signals:

1. a clear opening focal point and dominant PLAY control;
2. tactile BUY / SELL controls with an unmistakable pressed state;
3. the live market rendered as a level with current-day focus and checkpoints;
4. BOLL / MACD presented as small tactical power-ups rather than dashboard widgets;
5. obvious run/day and player-versus-market progress;
6. strong positive/negative semantic response;
7. a score reveal that feels like the end of a round.

Do not add extra feature panels simply to make the screen feel richer.

### Hard depth, not atmosphere

Depth communicates physical interaction or foreground order only:

- PLAY, BUY, SELL, power-ups, and the primary next/restart action may use short hard shadows;
- the main shell, Story tape, settlement result, and dialogs may use the same hard-depth language;
- a pressed control physically consumes most of its depth by translating toward the shadow;
- focus may move a control one pixel forward, but never turns it into a glowing card.

The following are prohibited in the canonical presentation: ambient radial lighting, decorative gradients, scan-line sweeps, glow, bloom, `shadowBlur`, glass panels, blurred drop shadows, floating dashboard stacks, emoji chart markers, and ornamental neon fields.

## Feedback FX

Game feel is a sanctioned layer of the canonical language, subject to the same hard-pixel discipline:

- trade and milestone particles are hard-edged squares drawn inside `scripts/market-canvas.js`, colored only from palette tokens, capped by a fixed zero-allocation pool, and skipped entirely under `prefers-reduced-motion`;
- micro-haptics (`scripts/haptics.js`) are progressive enhancement on devices exposing the vibration API;
- chiptune SFX cover trades, stage win/fail, milestones, speed, weather, and UI blips; melody tempo follows playback speed; everything respects the mute preference;
- motion rhythm is tokenized (`--motion-step-fast/base/slow`); component animations read tokens instead of hard-coded durations;
- settlement reveals use short stepped count-up motion with a reduced-motion bypass.

The following remain prohibited in every skin and in FX work: ambient radial lighting, decorative gradients, scan-line sweeps, glow, bloom, `shadowBlur`, glass panels, blurred drop shadows, emoji chart markers, and ornamental neon fields.

## Skins

Skins are palette-and-rhythm variations of Pixel Market Arcade, never new layouts:

- `skins.css` is the single owner of non-default token sets; each `html[data-skin]` block must define the complete required token list with concrete hex values;
- semantic color roles are invariant across skins: yellow-family accent = primary action/focus, system cyan-family = reference state, green/red = market/trade semantics (A-share red-up/green-down included);
- `scripts/skin-system.js` owns the catalog (ids, bilingual names, motion profile, atmosphere kind), persistence under `flappyk_skin_v1`, cycle buttons in the home toolbar and the in-game command rail (both share labels, persistence, and canvas re-theming), and instant canvas re-theming through `FlappyKMarketCanvas.refreshPalette`;
- the pixel avatar may carry one small identity crest per skin; it may not change silhouette rules or add glow;
- skins may declare an ambient atmosphere (`snow` for Polar Exchange, `dust` for Amber Terminal): a small capped backdrop layer drawn inside `market-canvas.js`, behind all game objects and grid lines, colored only from palette tokens, wrapping at stage edges, and disabled entirely under `prefers-reduced-motion`. Atmosphere never carries gameplay information.
- each skin owns one deterministic backdrop scenery layer in `market-canvas.js` (Market Arcade: starfield, drifting clouds, and a city skyline whose windows light up with run progress; Polar Exchange: aurora bands over a jagged ice ridge; Amber Terminal: a sun that arcs from sunrise to sunset over layered dunes). Scenery is seeded per skin and stage size, drawn with hard-edged rects only from palette tokens, sits strictly behind plot chrome, and freezes its animation phase under `prefers-reduced-motion` while remaining visible as a still layer;
- scenery may mirror run progress and the leading/losing state the HUD already publishes (window glow, aurora vigor, sun brightness, snow/dust weight). This is cosmetic reinforcement of existing information: it must never introduce a new information channel, change rules, or alter scoring;
- every 50-day checkpoint triggers a skin-flavored celebration (sky volley particles plus one stepped flash: aurora band, window flash, or sun pulse). Celebrations stay hard-edged, token-colored, and are suppressed under `prefers-reduced-motion`.

## Interaction model

Every state is a mode change inside one market game surface, not navigation into a different website.

- Home is the start screen of the game.
- Story is an analysis/tutorial state inside the same visual world.
- Gameplay activates the market stage and compresses information into one command rail.
- Settlement changes hierarchy from action to score evaluation.
- Leaderboard, onboarding, and custom challenge use the same game-shell language.
- Run complete is the final score state of the same game world.

Transitions should be short. Stepped motion is preferred for discrete score and screen-state changes; continuous motion is reserved for genuinely continuous data/progress. All motion respects `prefers-reduced-motion`.

## Home hierarchy

The first screen answers four questions in order:

1. What is this? — FlappyK / hidden historical market game.
2. What do I do? — trade three hidden markets and beat the benchmark.
3. Where do I play? — Crypto, A-Shares, and US Stocks.
4. What is the primary action? — Play.

PLAY is the dominant tactile action. The FLAPPY K title is intentionally large. Personal best, Daily Run, rankings, account, language, and installation remain secondary commands rather than competing feature cards.

## Gameplay hierarchy

The market stage gets maximum useful space. The persistent command rail contains only information required to act:

- Total;
- Return;
- live Excess;
- Run;
- Day progress;
- weather state;
- speed;
- back / pause;
- BUY / SELL controls.

The rail is one continuous scoreboard surface with separators. Individual metrics are not floating cards. Key values are intentionally larger than their labels. Desktop keyboard hints remain low priority. Mobile keeps BUY and SELL in the thumb zone with speed between them; `mobile-controls.css` remains the sole geometry owner.

## Market visualization grammar

The K-line is the level. It carries real market data while adopting a game-stage reading model.

- the canvas background is the same dark surface as the application;
- plotting grids are quiet orientation lines, not decorative neon;
- a hard stage frame and corner brackets make the playable field explicit;
- candles keep real market up/down conventions, including A-share red-up / green-down behavior;
- cyan denotes system/reference information and the player's equity path;
- BUY / SELL events render as readable hard-edged B/S blocks using green/red semantics, never emoji;
- yellow marks current-player focus;
- the latest visible candle receives a restrained cyan focus band and cursor;
- the current price uses a compact cyan hard-edged badge;
- a checkpoint rail turns time progression into a visible level rhythm without changing data or scoring;
- PLAYER EQUITY uses a discrete step path because portfolio value is sampled at game ticks; it remains truthful to the stored history rather than inventing intermediate values;
- the current equity point acts as the player cursor and carries a compact value label;
- current-day progress stays visible as a small game rail;
- price and player-equity regions are labelled directly;
- the renderer disables image smoothing and snaps important geometry to pixel boundaries;
- no glow, bloom, `shadowBlur`, emoji, rounded trace styling, or independent chart theme is allowed.

`scripts/market-canvas.js` is the only market-chart renderer. `game.js` supplies state and must not contain a second drawing implementation or visual fallback.

## Power-ups

BOLL and MACD are tactical power-ups, not analytical cards.

- desktop power-ups use a compact hard-edged body, a clear key, inventory count, and a short physical shadow;
- active state switches to yellow focus and remains distinguishable without animation;
- pressing a power-up moves it into its shadow so input has immediate visual confirmation;
- unavailable inventory stays visually quiet; no lock compatibility state is rendered;
- mobile keeps the existing 64 px control geometry and safe-area placement rather than growing a separate tray;
- all indicator math, access rules, Daily Run grants, and historical-data semantics remain unchanged.

`indicator-cards.css` owns this presentation. It does not move the mobile command dock or create a second HUD.

## Stillness

The stage is a still image between ticks. The game's purpose is to provoke thought about trading itself, so the presentation is deliberately quiet:

- no particles, screen shake, score pops, medal drops, or celebration volleys;
- skin scenery (starfield, skyline, aurora, ice ridge, sun, dunes) is drawn once per tick as a static image; it may reflect run progress and the published leading/losing state, but nothing animates;
- feedback is informational: chiptune SFX, haptics, trade markers on the chart, and the excess meter. Audio respects the mute preference.

## Settlement

Settlement is the end-of-round score state of the same market surface.

The hierarchy is:

1. verdict;
2. Excess Return;
3. player-versus-market comparison;
4. revealed asset and period;
5. expandable accounting detail;
6. next action.

Excess Return may become the largest number on the screen. Its reveal uses short discrete motion and hard text depth, not glow or a new celebration theme. The screen remains contained within the viewport and scrolls internally when needed on short phones.

## Run complete

The final three-market result uses the same dark surface, typography, hard separators, hard depth, and command language as the rest of the product.

No isolated champagne skin or alternate gold/orange theme should return. Celebration comes from final-score hierarchy, completion state, semantic color, and tactile restart/share actions.

## Chinese and English

Chinese and English are one product, not two layouts.

- Information hierarchy and available actions are identical.
- Chinese uses the existing `ZCOOL QingKe HuangYou` family where pixel display text would otherwise become illegible.
- English keeps `Press Start 2P` only for sparse display moments and `Pixelify Sans` for operational UI.
- Chinese copy receives natural line-height and does not lose content to make the layout fit.
- Responsive behavior is based on available space and virtual-control state, not language.
- pause, resume, and back controls keep real DOM symbols and localized accessible labels; presentation CSS never deletes semantic content.

## Architecture boundary

`premium-ui.css` is the single canonical owner of shared visual tokens, typography scale, hard-depth treatment, home presentation, HUD appearance, Story state, settlement, run-complete presentation, and shared secondary-screen presentation. It does not take over geometry already owned by a feature stylesheet.

`style.css` owns only base document, canvas, screen containment, and generic interaction foundations.

`mobile-controls.css` is the canonical owner for mobile command-dock geometry, thumb-zone placement, mobile speed placement, safe-area spacing, and chart clearance. `premium-ui.css` may skin those controls but must not position the dock.

`indicator-cards.css` owns BOLL/MACD power-up geometry and presentation relative to the mobile command dock.

`account-integration.css` owns account-toolbar placement and account-specific presentation.

`scripts/market-canvas.js` owns all market-chart rendering. `game.js` supplies live data/state to it and does not own chart presentation.

`scripts/premium-ui.js` owns existing home/HUD/control/settlement composition and interaction feedback.

`scripts/premium-ui-refinement.js` owns HUD rail composition and DOM normalization. It must not inject presentation styles or erase semantic control content.

`scripts/home-console.js` owns the home console composition (bezel, topline, world strip, footer, utility-bar placement, press feedback). `scripts/premium-ui-refinement.js` owns HUD rail composition and DOM normalization. It must not inject presentation styles or erase semantic control content.

Core game data, scoring, pass rules, account/cloud history, Daily Run, friend challenge, leaderboard, sharing, PWA behavior, and market loading are unchanged by this visual evolution.

## Rules for future visual work

1. Pixel Market Arcade is the base visual language inside Single-Surface Market OS; additional skins are sanctioned only through the token pipeline (`skins.css` + `scripts/skin-system.js`).
2. Do not add a second theme outside that pipeline, a compatibility skin, `*-polish.css`, `*-fix.css`, or a canvas patch layer. Skins stay token-only: no component selectors in `skins.css`.
3. Change the actual owning component or shared visual system directly.
4. Keep the K-line visually dominant and treat it as the level, not a dashboard chart.
5. Readability outranks terminal density; do not reintroduce 7–9 px operational text as a default.
6. Use only hard, unblurred depth to communicate interaction or foreground order.
7. Do not add gradients, ambient lighting, scan sweeps, glow, glass, emoji markers, or rounded analytical trace styling.
8. Reserve semantic colors: cyan for system state, yellow for primary action/focus, green/red for performance and trades.
9. Preserve the same information and actions in Chinese and English.
10. Treat mobile as the same game with different control geometry, not a reduced product.
11. Keep weather semantic and subordinate to trading information.
12. Keep `scripts/market-canvas.js` as the single authoritative chart renderer.
13. Keep `indicator-cards.css` as the sole power-up presentation owner.
14. Make new motion answer one question: what changed, what can I press, or what result did I achieve?
