> Capability Router Protocol
> This file is a long-lived project state file.
> Do not rewrite this file wholesale.
> Only append new entries or edit explicitly conflicting fields after user confirmation.
> If a request conflicts with existing content, surface the conflict first.

# Tasks: FlappyK Architecture Hardening & Retro Pixel Arcade

## Task Board
- [x] 1. Intake & Brainstorming Alignment (Pure UI Overhaul, 100% logic preserved)
- [x] 2. 8-Bit Retro Audio Engine (Web Audio square/sawtooth chiptune synthesis)
- [x] 3. Arcade LED HUD & Bezel Framing (1UP, STAGE, DAY LED counters)
- [x] 4. Chunky 3D Physical Push-Buttons (Buy/Sell deep press & recoil)
- [x] 5. Flappy-Style Settlement Board with Animated Pixel Medal Drop
- [x] 6. Procedural 8-Bit Pixel Mascot on Canvas (Jetpack thruster vs Glider states)
- [x] 7. Arcade Screen Shake on Trades (4-step tactile physical impact)
- [x] 8. 8-Bit Floating Action Badges & Feedback Toasts
- [x] 9. 360-Degree Architecture Audit (Identified 4 core bottlenecks)
- [x] 10. Phase 1: Fixed unclosed media query in `premium-ui.css` & eliminated Canvas GC array copies
- [x] 11. Phase 2: Created `scripts/event-bus.js` (`window.FlappyKEvents`) & added to `APP_SHELL`
- [x] 12. Phase 3: Created `window.FlappyKGame.resetGame()`, eliminating `location.reload()` on return home
- [x] 13. Phase 3: Eliminated 60Hz DOM layout thrashing in `scripts/indicator-cards.js`
- [x] 14. Static Contract & Regression Test Validation (81 JS files, 25/25 suites passed)