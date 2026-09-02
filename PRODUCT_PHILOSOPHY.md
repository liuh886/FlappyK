# FlappyK Product Philosophy

> Decision learning through play. The market teaches. The game only makes consequences visible.

Updated: 2026-09-02
Status: Canonical — every feature, visual, and architecture decision must satisfy this document.

## 1. The Core Belief

FlappyK does not teach investing.

The market teaches.

The game is responsible for exactly three things:

1. let the player make a decision
2. let that decision produce a consequence
3. help the player see the consequence

If a feature cannot be expressed as a level, a feedback moment, a replay, a badge, or a progression unlock, it does not belong in the main game loop.

## 2. Four Principles

### 1. Market first
The market is real and immutable. The game never rewrites history.

- Historical OHLC windows are fixed facts drawn from `data/markets/*.json`.
- `EXCESS > 0` (`PlayerReturn - MarketReturn > 0`) remains the single authoritative win/lose rule. See `scripts/market-pass-rule.js` and `game.js:512`.
- No helper may alter prices, inject hindsight, or soften the outcome to make the player feel better.

### 2. Decisions have consequences
Education is not telling the player what to do. It is showing what they did.

- The player must act under uncertainty (asset and period hidden until `level-did-settle`).
- The settlement and replay surface must make the link `decision -> outcome` legible without commentary.

### 3. Facts before advice
Show facts, comparisons, and counterfactuals. Do not output investment advice.

The system must strictly separate:

- **FACT** — what happened. Observable and computable from `currentData[] + actions[] + totalHistory[]`.
  Example: `SOLD DAY 108 · AFTER SELL +52%`
- **COUNTERFACTUAL** — what would have happened in a parallel universe under a well-defined alternative rule. Also computable, but must be labeled as such.
  Example: `IF HELD FROM FIRST BUY: +31% vs YOUR +12%`
- **INTERPRETATION** — what the fact might mean. The most dangerous layer. Prohibited in v0.1. If later added, it must be clearly marked, skippable, and never presented as a fact.

v0.1 ships only FACT and labeled COUNTERFACTUAL. No `You should have...` / `You were wrong to...` / `Advice:` strings.

### 4. Learning must feel like gameplay
If it does not feel like a game, it will not teach.

Approved forms: deaths-like verdict cards (`PAPER HANDS`, `DODGED THE CRASH`), ghost replays, star/badge dimensions (`EDGE / RISK / DISCIPLINE`), achievements as traits earned through play, and market archetypes as bosses (`THE CRASH`, `THE CHOP`).

Prohibited forms in the main loop: lecture paragraphs, generic risk warnings (`Investors should control risk`), moralizing tips, or dashboard-style analysis reports.

## 3. The Anti-Pattern: Hindsight Bullshit

This is the most common failure mode for any decision-feedback system.

Prohibited:

- `You should have bought on Day 87.` (uses future data to judge a past decision)
- `Your sell was a mistake.` (declares a fact to be an error without defining the alternative)
- `You are a conservative investor.` (labels the player from insufficient evidence)

Required:

- `You sold on Day 87. The market rose +43% afterwards.` (fact)
- `Buy & Hold from Day 0: +38% · Your path: +12%` (labeled counterfactual)
- Traits derived from repeated, thresholded facts over many runs (e.g. `DIAMOND HANDS — 5 runs holding >100 days`), never from one run.

Every Decision Engine output must be traceable to a computable input. `generateInvestmentAdvice()` is banned. `if/else -> label` personality classifiers are banned in v0.1.

## 4. Dual-Kernel Architecture

```
MARKET ENGINE                          DECISION ENGINE
─────────────                          ───────────────
historical market                      tick + trade + market data
  ↓                                      ↓
tick → trade → portfolio → EXCESS      Decision Timeline
  ↓                                      ↓
WIN / LOSE  (authoritative)            Metrics → Counterfactuals → Profile → Ghost/Insight
                                             (observes only, never writes back)
```

- `Market Engine` (`game.js`, `scripts/market-pass-rule.js`, `data-loader.js`) decides whether the player won. It is the only writer of cash/shares/settlement.
- `Decision Engine` (`scripts/decision/*`) decides what the player learned. It subscribes to `FlappyKGameController` hooks (`data-resolved`, `tick`, `trade`, `level-did-settle`) and to `FlappyKEvents`, never wraps or replaces `startLevel`/`endLevel`/`handleBuy`/`handleSell`.

Violation examples: Decision code that mutates `cash`, blocks a trade, changes `currentData`, or recomputes `EXCESS` with a different formula.

## 5. Product Boundaries

Arising directly from the philosophy, enforced alongside `docs/PRODUCT_GOVERNANCE.md` and `docs/UI_ARCHITECTURE.md`:

1. `EXCESS > 0` is not to be replaced, softened, or supplemented with a second win condition. Dimensions like `EDGE / RISK / DISCIPLINE` are display-only.
2. Every decision metric in v0.1 must be computable from `{ currentData, actions, totalHistory, levelStartCash, currentPrice }` without external models or LLMs.
3. Ghost Replay and Counterfactual Ghost are the first privileged feedback surfaces. Text insights, if added later, are subordinate to them.
4. Market Archetypes (`BULL / CRASH / CHOP / BUBBLE / LOST DECADE`) are offline labels on historical windows, not handcrafted price curves. The player never sees the regime before settlement.
5. All learning features fail open: if Decision Engine is unavailable, the core three-market run, Daily Run, friend challenge, and settlement remain fully playable.

## 6. How to Use This Document

- Before any PR, answer: which of the four principles does this change serve, and which prohibited form does it avoid?
- Architecture review must reject any module that mixes Market and Decision writes, introduces advice strings, or adds a second authoritative win rule.
- UX review must reject any settlement/replay copy that cannot be traced to a FACT or a labeled COUNTERFACTUAL.
