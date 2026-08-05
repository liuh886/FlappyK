# FlappyK arcade visual direction

## Product intent

FlappyK should feel like a small, polished pixel stock arcade game rather than a financial dashboard wearing a pixel theme.

The core interaction remains deliberately small:

- read a real hidden historical K-line;
- buy or sell in fixed increments;
- finish with positive Excess Return;
- play three short markets without progression, equipment, maps, or a character system.

The visual system must increase atmosphere and feedback without creating another gameplay system.

## Chosen direction

The approved direction combines:

1. **Pixel stock arcade** — the chart remains accurate and dominant; HUD information reads like a compact arcade score display.
2. **Nintendo-like restraint** — obvious primary action, low learning cost, short feedback, no feature inventory on the opening screen.
3. **Abstract natural environment** — weather communicates player performance without changing the trading rules.
4. **Light handheld framing** — the opening screen resembles a compact game console, while the game itself keeps the maximum possible chart area.
5. **No player character** — the K-line and the player's return relationship are the protagonists.

## Weather semantics

Weather is derived only from live player and market performance:

| State | Rule | Meaning |
| --- | --- | --- |
| Clear | player return is non-negative and Excess Return is non-negative | the player is ahead of the market |
| Cloudy | player return is non-negative but Excess Return is negative | the player is profitable, but the market is ahead |
| Rain | player return is negative | the player is underwater |

The weather layer is feedback, not decoration. It must remain low contrast enough that candlesticks, the return curve, trade markers, and controls stay readable.

## Key emotional moments

Short feedback is allowed when a sign boundary is crossed:

- player return becomes positive;
- player return becomes negative;
- Excess Return becomes positive;
- Excess Return becomes negative.

These events should use brief text, a small weather shift, and restrained haptic/button feedback. They must not pause the game or obscure the chart.

## HUD and home rules

- Keep the existing compact persistent HUD.
- Keep live Total, Return, Excess, Run, Day, speed, BUY, and SELL.
- Present secondary information only on demand or at settlement.
- Make PLAY the unmistakable primary home action.
- Daily Run, rankings, account, language, and installation remain secondary.
- The handheld shell is a home-screen framing device, not a permanent bezel around the active chart.

## Architecture boundary

`market-weather.css` owns the new environmental and home-console surfaces.

`scripts/market-weather.js` owns:

- weather classification;
- environmental DOM composition;
- sign-crossing feedback;
- the lightweight home-console composition;
- language synchronization for its own copy.

The feature does not wrap or replace `startLevel`, `updateUI`, `draw`, or `endLevel`. It reads canonical gameplay state and observes presentation changes. Market data, scoring, pass rules, authentication, cloud save, leaderboard evidence, and membership are unchanged.

## Follow-up candidates

After this first iteration is visually reviewed:

- replace legacy emoji trade markers in the canvas with original pixel markers;
- tune weather opacity against real mobile screenshots;
- refine settlement as an arcade score reveal without increasing information density;
- consider a small sound palette for clear/cloudy/rain boundary changes;
- remove any remaining web-dashboard language that survives in secondary dialogs.
