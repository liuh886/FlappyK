> Capability Router Protocol
> This file is a long-lived project state file.
> Do not rewrite this file wholesale.
> Only append new entries or edit explicitly conflicting fields after user confirmation.
> If a request conflicts with existing content, surface the conflict first.

# Design: FlappyK Architecture Hardening & Retro Pixel Arcade

## Decision Log
- **2026-08-23**: Replaced the load-order-dependent global wrapper chain with `window.FlappyKGameController` (typed hooks via `FlappyKEvents`, priority-ranked data-source registry custom/friend/daily > normal). Eleven feature modules now subscribe instead of monkey-patching `startLevel`/`endLevel`/`pickRandomData`; settlement rendering consolidated into the controller; stale `FlappyKGame` references fixed.
- **2026-08-23**: Added persistent mute control (`flappyk_sound_muted_v1`, HUD 🔊/🔇 toggle, `M` key) and restored documented stage win/fail chiptune.
- **2026-08-23**: Sanctioned multi-skin pipeline per ARCADE_VISUAL_DIRECTION.md amendment: `skins.css` token-only sets (arcade/polar 极地冰原/amber 琥珀终端), `scripts/skin-system.js` manifest with motion profiles, toolbar cycle button, instant canvas re-theming.
- **2026-08-22**: Preserved 100% of existing core trading logic and interaction rules (BUY/SELL $1K, 3-market flow, 250-day series, Excess Return math, Leaderboard, Daily Run).
- **2026-08-22**: Completed full frontend UI overhaul into authentic retro 8-bit Pixel Arcade style (Flappy Bird style medal drops, 1UP/STAGE LED HUD, chunky tactile push-buttons, Web Audio 8-bit synthesized feedback).
- **2026-08-22**: Integrated advanced creative Game Feel ("Juice") layers (Procedural 8-Bit Pixel Mascot on Canvas, 90ms 4-step screen shake on trades, 8-bit floating feedback toasts).
- **2026-08-22**: Executed Phase 2 & 3 Incremental Architecture Hardening:
  - Introduced `scripts/event-bus.js` (`window.FlappyKEvents`) for typed event pub/sub.
  - Implemented `window.FlappyKGame` with in-memory `resetGame()`, eliminating `window.location.reload()` dependency.
  - Fixed 60fps layout thrashing in `scripts/indicator-cards.js` by transitioning to CSS inset layout.
  - Zero-allocation index loop in `scripts/market-canvas.js` `drawReturnPlot`.

## Architecture & Visual Enhancements
- **8-Bit Audio Synthesis**: Native Web Audio chiptune effects for Buy, Sell, Stage Win, and Stage Fail.
- **Flappy-Style Settlement Medal Board**: Animated drop-in pixel medals with score rollup.
- **Arcade Bezel & HUD**: Retro LED styling with 1UP player equity and pulsing excess badges.
- **Decoupled Event Bus & Game Engine Interface**: Clean lifecycle events and in-memory clean resets.