# FlappyK visual direction

## Product intent

FlappyK is a short market game, not a trading dashboard and not a generic retro website.

The player reads a real hidden historical K-line, trades in fixed increments, tries to finish with positive Excess Return, and clears three markets. The visual system exists to make that loop legible, tense, and memorable without introducing another progression system.

## Canonical direction: Hidden Market Terminal

The product now uses one visual language: **Hidden Market Terminal**.

It combines the immediacy of an arcade cabinet with the information hierarchy of a professional market terminal:

- the chart is the dominant surface during play;
- HUD elements behave like instruments around the chart instead of floating web cards;
- square borders, hard shadows, restrained pixel typography, and compact status marks replace glassmorphism and rounded dashboard surfaces;
- the home screen is a full-screen market terminal with one unmistakable primary action;
- the second home page reads like a printed field note rather than another marketing panel;
- settlement reads like a score receipt: verdict and Excess Return first, detail second;
- desktop and mobile share the same hierarchy rather than maintaining separate visual products.

There is no alternative legacy skin and no compatibility theme. `premium-ui.css` is the single canonical owner for the shared presentation system.

## Home hierarchy

The first screen answers four questions in order:

1. What is this? — FlappyK / Hidden Market Arcade.
2. What do I do? — trade three hidden historical markets and beat the market.
3. Where do I play? — Crypto, A-Shares, and US Stocks.
4. What is the primary action? — Play.

Personal best, Daily Run, rankings, account, language, and installation remain available but visually subordinate to Play.

## Gameplay hierarchy

The active chart gets maximum space. The persistent rail contains only information required to act:

- Total;
- Return;
- live Excess;
- Run;
- Day progress;
- weather state;
- speed;
- back / pause;
- BUY / SELL controls.

Desktop keyboard hints stay secondary. Mobile uses large BUY and SELL controls with speed between them. No permanent decorative bezel surrounds the active chart.

## Weather semantics

Weather remains functional feedback and keeps the existing scoring semantics:

| State | Rule | Meaning |
| --- | --- | --- |
| Clear | player return is non-negative and Excess Return is non-negative | player is ahead of the market |
| Cloudy | player return is non-negative but Excess Return is negative | player is profitable, but the market is ahead |
| Rain | player return is negative | player is underwater |

Weather must remain lower contrast than the K-line, player return, trade markers, and controls. It never changes scoring or market playback.

## Settlement

Settlement is intentionally different from gameplay: a light paper-like score receipt over the dark terminal.

The hierarchy is:

1. verdict;
2. Excess Return;
3. player-versus-market comparison;
4. revealed asset and period;
5. expandable accounting detail;
6. next action.

This contrast marks the end of a market without adding another screen system.

## Chinese and English

Chinese and English are one product, not two layouts.

- The information hierarchy and available actions are identical.
- Chinese uses the existing `ZCOOL QingKe HuangYou` family where pixel display text would otherwise become illegible.
- English keeps `Press Start 2P` for display moments and `Pixelify Sans` for operational UI.
- Chinese copy receives natural line-height and does not lose content to make the layout fit.
- Responsive breakpoints are based on available space and virtual-control state, not language.

## Architecture boundary

`premium-ui.css` owns the shared visual system, responsive composition, home terminal, HUD presentation, field-note story, settlement receipt, and shared secondary-screen surfaces.

`scripts/premium-ui.js` owns existing home/HUD/control/settlement composition and interaction feedback.

`scripts/premium-ui-refinement.js` owns the existing HUD rail composition and DOM normalization. It must not inject presentation styles.

`market-weather.css` and `scripts/market-weather.js` continue to own weather semantics and environmental feedback only.

Core game data, scoring, pass rules, account/cloud history, Daily Run, friend challenge, leaderboard, sharing, PWA behavior, and market loading are unchanged by this visual redesign.

## Rules for future visual work

1. Do not add a second theme, compatibility skin, `*-polish.css`, or `*-fix.css` layer.
2. Change the owning component or `premium-ui.css` directly.
3. Keep the chart visually dominant during play.
4. Prefer fewer, stronger UI surfaces over more cards.
5. Preserve the same information and actions in Chinese and English.
6. Treat mobile as the same game with a different control geometry, not a reduced product.
7. Keep weather semantic and subordinate to trading information.
8. Do not turn atmosphere into a new gameplay mechanic.
