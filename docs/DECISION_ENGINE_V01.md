# Decision Engine v0.1 Blueprint

> Companion to `PRODUCT_PHILOSOPHY.md` and `docs/UI_ARCHITECTURE.md`. This is the buildable contract for the second kernel. No feature may ship that violates it.

Status: Draft — implements `A` without breaking `Market Engine`.
Owner: `scripts/decision/*` (seven modules, strict ownership).
Win rule: unchanged. `EXCESS > 0` (`scripts/market-pass-rule.js:26`) remains the only authoritative settlement. Decision Engine is read-only and fail-open.

---

## 1. Goals / Non-Goals

### Goals (v0.1)
- Turn every level into a **structured fact** that can be replayed, compared, and accumulated without touching `game.js` writes.
- Ship **FACT + labeled COUNTERFACTUAL** only. No `INTERPRETATION` and no `generateInvestmentAdvice()`.
- Deliver the first **Ghost Replay + Counterfactual Ghost** that makes `SOLD TOO EARLY / DODGED THE CRASH` instantly visible.
- Keep every metric pure, deterministic, and testable from `{ currentData, actions, totalHistory, levelStartCash, currentPrice }`.

### Non-Goals (v0.1)
- No personality labels (`Trend Rider`, `Contrarian`) — see `PRODUCT_PHILOSOPHY.md:12`.
- No second win condition, no `EDGE/RISK/DISCIPLINE` scoring (reserved for v0.2).
- No LLM, no server, no trusted leaderboard evidence from decision data.
- No market-archetype boss pool yet — `market-regime.js` only classifies the current window; offline pool/tagging is v0.3.

---

## 2. Architecture

```
game.js  ── FlappyKGameController hooks ──► decision-recorder.js (timeline, in-memory)
              data-resolved                │
              tick                         ├─► decision-metrics.js  (pure: timeline -> DecisionReport)
              trade                        ├─► counterfactual-engine.js (pure: window+firstEntry -> CounterfactualSet)
              level-did-settle             ├─► market-regime.js (pure: window -> MarketRegime)
                                           │
                                           ├─► insight-engine.js (pure: DecisionReport+CounterfactualSet+Regime -> VerdictId[])
                                           ├─► decision-storage.js (localStorage, fail-open, versioned)
                                           └─► mastery-system.js (pure reducer: reports[] -> MasteryState)
                                                        │
                                           UI: settlement injection + ghost-canvas layer (separate PR, consumes DecisionReport)
```

**Kernel separation** (`docs/UI_ARCHITECTURE.md:37`):

- `Market Engine` (`game.js`, `scripts/market-pass-rule.js`, `data-loader.js`) — sole writer of `cash/shares/currentData/currentPrice/settlement`.
- `Decision Engine` (`scripts/decision/*`) — subscribes only via `FlappyKGameController.on('data-resolved'|'tick'|'trade'|'level-did-settle')` and `FlappyKEvents`. Never wraps `startLevel/endLevel/handleBuy/handleSell/pickNormalData`. If the module fails to load, the game remains fully playable.

**Module boundaries** (one owner per file):

| Module | Responsibility | Forbidden |
|---|---|---|
| `decision-recorder.js` | Append-only `Decision Timeline` per level. Flush on `level-did-settle`. No computation. | DOM, I/O, recomputing EXCESS |
| `decision-metrics.js` | `analyzeRun(input) -> DecisionReport`. Pure, no side effects. | Reading `localStorage`, touching `cash` |
| `counterfactual-engine.js` | `simulate(input) -> CounterfactualSet`. Pure simulations. | Presenting results as advice |
| `market-regime.js` | `classifyMarket(window) -> MarketRegime`. Must not read player data. | Branching on `actions` or `excess` |
| `insight-engine.js` | `deriveVerdicts(report, counterfactuals, regime) -> VerdictId[]`. Whitelisted mapping only. | Recomputing any REPORT field |
| `decision-storage.js` | `load/save` for reports + mastery. Versioned keys, try/catch, `localStorage` only. | Using reports as leaderboard proof |
| `mastery-system.js` | `reduceMastery(prev, report) -> MasteryState`. Thresholded over many runs. | Labeling from a single run |

---

## 3. Inputs (what already exists)

All v0.1 metrics are computable from data `game.js` already retains through the level:

```js
// from game.js:36-68, game.js:56-58, game.js:446-475
currentData: Array<{ date: string, open:number, high:number, low:number, close:number }>[250]
actions: Array<{ type:'buy'|'sell', day:number, price:number }>
totalHistory: number[]          // portfolio value per tick, length dayIndex+1
levelStartCash: number
currentPrice: number            // == currentData[dayIndex].close
currentMarket: 'crypto'|'ashare'|'usstock'
currentAsset: string
level: 1|2|3
TRADE_AMOUNT: 1000
FEE: 1
```

Authoritative settlement (must not be recomputed):
```js
// from scripts/market-pass-rule.js:14 and game.js:512
{ playerReturn, marketReturn, excessReturn, isSuccess }
```

---

## 4. Core Types (frozen for v0.1)

### 4.1 DecisionReport

Produced once per `level-did-settle`, synchronously, before any UI render.

```ts
type DecisionReport = {
  version: 1;
  // identity — for replay and debugging, not for advice
  level: 1|2|3;
  market: 'crypto'|'ashare'|'usstock';
  asset: string;
  periodStart: string;          // currentData[0].date
  periodEnd: string;            // currentData[249].date
  days: 250;

  // authoritative (copied, not recomputed)
  startCash: number;
  finalCash: number;
  startPrice: number;
  finalPrice: number;
  playerReturn: number;         // (finalCash - startCash)/startCash
  marketReturn: number;         // (finalPrice - startPrice)/startPrice
  excessReturn: number;         // playerReturn - marketReturn
  isSuccess: boolean;           // excessReturn > 0

  // timing Facts — pure from actions + closes
  tradeCount: number;
  buyCount: number;
  sellCount: number;
  feeDrag: number;              // tradeCount * FEE / startCash  (signed return drag)
  turnover: number;             // (buyCount+sellCount)*TRADE_AMOUNT / startCash
  maxDrawdown: number;          // 0..1 peak-to-trough of totalHistory
  maxDrawdownDay: number|null;  // day index of trough

  // exposure Facts
  marketExposure: number;       // holdingDays / 250, holding = shares*price>1
  cashExposure: number;         // 1 - marketExposure
  longestHoldDays: number;      // longest contiguous holding streak
  avgEntryPrice: number|null;   // mean price of buy actions, null if no buys
  avgExitPrice: number|null;    // mean price of sell actions, null if no sells
  firstBuyDay: number|null;
  lastSellDay: number|null;
  timeInCashAfterLastSell: number; // 0..250

  // consequence Facts (all labeled, all computable without future lookahead beyond window)
  returnAfterFirstSell: number|null;   // (finalPrice - priceAtFirstSell)/priceAtFirstSell
  returnAfterLastSell: number|null;    // (finalPrice - priceAtLastSell)/priceAtLastSell
  maxFavorableAfterLastSell: number|null; // max(close[lastSellDay+1..249])/priceAtLastSell -1
  maxAdverseAfterLastBuy: number|null;    // min(close[lastBuyDay+1..249])/priceAtLastBuy -1
  missedUpside: number|null;              // max(0, maxFavorableAfterLastSell)
  avoidedDownside: number|null;           // max(0, -min(close[lastSellDay+1..]/priceAtLastSell -1)) for crash dodge detection
  bestPossibleTrade: number;              // max achievable return with 1 buy+1 sell in window (oracle, labeled as theoretical)
  buyAndHoldReturn: number;               // marketReturn (kept explicit for counterfactual labeling)

  // raw for ghost — not duplicated elsewhere
  closes: number[];             // length 250, for ghost rendering without re-reading market file
  equityCurve: number[];        // length 250 (or dayIndex+1 padded), for ghost rendering
  actions: Array<{type:'buy'|'sell', day:number, price:number}>;
};

// Constructor contract
// analyzeRun({ currentData, actions, totalHistory, levelStartCash, currentPrice, level, currentMarket, currentAsset })
// -> DecisionReport
// Throws TypeError if inputs are not finite / not 250-length; never throws on empty actions.
```

**Formula notes (must be pinned by tests):**

- `marketExposure`: a day counts as holding if `sharesAtDay * closeAtDay >= TRADE_AMOUNT/2`? v0.1 simplifies to `sharesAtDay > 0` derived by replaying `actions` against `closes` with `TRADE_AMOUNT` (same logic as settlement liquidation `game.js:508`). Pure replay, no access to live `shares` variable.
- `maxDrawdown`: same loop as `game.js:538` over `totalHistory`.
- `returnAfterLastSell`: `null` if no sells; otherwise `(finalPrice - priceAtLastSell)/priceAtLastSell`.
- `bestPossibleTrade`: max `(sellPrice - buyPrice)/buyPrice` with `buyDay < sellDay`; O(n) scan; labeled `THEORETICAL_MAX` in UI, never `You should have`.
- All returns are simple returns, not log, consistent with `market-pass-rule.js`.

### 4.2 CounterfactualSet

```ts
type CounterfactualSet = {
  version: 1;
  // All returns are simple returns over the same 250-day window, same startCash basis
  buyAndHold: { return: number; excessVsMarket: 0; finalCash: number; label: 'BUY_AND_HOLD_FROM_DAY_0' };
  firstEntryHold: { return: number; excessVsMarket: number; finalCash: number; label: 'FIRST_ENTRY_THEN_HOLD'; applicable: boolean };
  noTrade: { return: 0; finalCash: number; label: 'NO_TRADE' }; // stay in cash

  // Curves for ghost overlay (length 250, same startCash)
  curves: {
    buyAndHoldEquity: number[];     // startCash * (close[i]/close[0])
    firstEntryHoldEquity: number[] | null; // null if no buys
    playerEquity: number[];          // DecisionReport.equityCurve (reference, not copy)
  };
};

// simulate({ currentData, actions, levelStartCash, startPrice })
// -> CounterfactualSet
// buyAndHold: fee-free, 100% exposure from day 0.
// firstEntryHold: spend TRADE_AMOUNT+FEE at first buy price if exists, then hold; if no buys, applicable:false.
// noTrade: flat startCash.
```

### 4.3 MarketRegime

```ts
type MarketRegime = {
  version: 1;
  trend: 'bull'|'bear'|'chop';           // bull if marketReturn > +0.15, bear < -0.15, else chop
  volatility: 'low'|'mid'|'high';        // stdev of daily log returns: <0.015 low, <0.03 mid, else high
  maxDrawdown: number;                   // window max drawdown of closes
  maxDrawdownDepth: number;              // same, 0..1
  reversalCount: number;                 // sign changes of 20-day SMA slope
  shape: 'trend'|'boom-bust'|'v-shape'|'range';
};

// classifyMarket(window) -> MarketRegime
// Pure, reads only closes[]. Never reads actions, excess, or trade count.
```

### 4.4 Verdicts (whitelisted, fact-traced)

`insight-engine.js` may only emit ids from this closed set. Each id must declare its triggering fact and its copy must be a FACT or labeled COUNTERFACTUAL.

| VerdictId | Trigger (thresholded fact) | Copy (FACT) | Counterfactual label |
|---|---|---|---|
| `PAPER_HANDS` | `firstEntryHold.return - playerReturn > 0.15` and `lastSellDay !== null` | `SOLD DAY {d} · AFTER +{pct}%` | `IF HELD FROM FIRST BUY: {pct}%` |
| `MISSED_THE_DIP` | `maxDrawdownDepth > 0.20` and `buyCount===0` during drawdown trough±10d and window ends `marketReturn > 0` | `BOTTOM → +{pct}% · YOU STAYED IN CASH` | `BUY_AT_TROUGH: {pct}%` (theoretical) |
| `DODGED_THE_CRASH` | `marketReturn < -0.20` and `excessReturn > 0.15` | `MARKET {m}% · YOU {p}% · DEFENSE +{e}%` | — |
| `OVERTRADER` | `tradeCount >= 15` | `{n} TRADES · ${fee} FEES · EXCESS {e}%` | — |
| `DIAMOND_HANDS_LEVEL` | `longestHoldDays >= 100` and `tradeCount <= 4` | `HELD {d} DAYS` | — |

Rules:

- At most **2 verdicts per level**; priority `DODGED_THE_CRASH > PAPER_HANDS > MISSED_THE_DIP > DIAMOND_HANDS_LEVEL > OVERTRADER`.
- No verdict if thresholds not met — silence is allowed.
- Every verdict payload must include `{ reportField, threshold, actual }` for traceability. Copy strings are filled only from `DecisionReport` / `CounterfactualSet` fields; no new computation.
- Prohibited strings (banned in any language): `you should`, `you were wrong`, `mistake`, `should have`, `你是.*型投资者`, `建议`.

### 4.5 MasteryState (cross-run, minimal for v0.1 storage only)

```ts
type MasteryState = {
  version: 1;
  runsObserved: number;                 // number of DecisionReports seen (3*levels)
  achievements: Record<AchievementId, { unlockedAt: string|null, progress: number, target: number }>;
};

type AchievementId =
  | 'DIAMOND_HANDS'      // 5 levels with longestHoldDays >= 100
  | 'DIP_BUYER'          // 10 buys where buyPrice < troughPrice*1.05 (window trough in 20% DD zone)
  | 'CRASH_SURVIVOR'     // 3 bear windows (marketReturn<-0.25) with excess>0.20
  | 'MARKET_TIMER'       // 5 sells where returnAfterSell < -0.05 within 20d
  | 'OVERTRADER_NEG'     // 3 consecutive levels with tradeCount>15 (negative achievement)
```

- v0.1: define type and `reduceMastery` pure reducer, but do **not** render achievements in UI (reserved for v0.2). Storage only.

---

## 5. Persistence

```ts
// decision-storage.js
STORAGE_KEYS = {
  REPORTS: 'flappyk_decision_reports_v1',   // Array<DecisionReport>, capped to last 50, JSON
  MASTERY: 'flappyk_mastery_v1',            // MasteryState JSON
};
```

- All reads wrapped in `try/catch`; parse failure -> `emptyState()` and continue.
- All writes wrapped in `try/catch`; `QuotaExceededError` -> drop oldest report and retry once.
- `localStorage` only. No Supabase. No leaderboard use. Keys versioned; `version` field inside payload must match.
- v0.1 does not persist ghost curves beyond the report's `closes/equityCurve` (which are already inside the report). `CounterfactualSet.curves` are recomputed on demand for replay.

---

## 6. Lifecycle Wiring

```js
// decision-recorder.js
let timeline = { level:null, market:null, asset:null, closes:[], actions:[], equity:[] };

FlappyKGameController.on('data-resolved', ({ level, market, asset, data }) => {
  timeline = { level, market, asset, closes: data.map(d=>d.close), actions:[], equity:[] };
});
FlappyKGameController.on('tick', ({ day, total }) => {
  timeline.equity[day] = total;
});
FlappyKGameController.on('trade', ({ type, day, price }) => {
  timeline.actions.push({ type, day, price });
});
FlappyKGameController.on('level-did-settle', ({ completedLevel, ...settlement }) => {
  const report = FlappyKDecisionMetrics.analyzeRun({ ...timeline, ...settlement });
  const counterfactuals = FlappyKCounterfactuals.simulate({ ...timeline, ...settlement });
  const regime = FlappyKMarketRegime.classifyMarket(timeline.closes);
  const verdicts = FlappyKInsightEngine.deriveVerdicts(report, counterfactuals, regime);
  FlappyKDecisionStorage.saveReport(report);
  FlappyKMastery.reduceMastery(report); // async-safe
  // emit for UI layer (separate listeners, never inside this file)
  FlappyKEvents.emit('flappyk:decision-ready', { report, counterfactuals, regime, verdicts });
});
```

- No `window.addEventListener('load')` ordering dependency. Registration is idempotent; second registration replaces the first for the same `id`.
- If any decision module throws, `level-did-settle` settlement in `game.js:614` must already have rendered. Decision errors are caught and logged, never rethrown to block champagne/settlement buttons.

---

## 7. Ghost Replay (consumer, not part of metrics)

Ghost is a **read-only overlay** rendered by a new canvas layer or by reusing `market-canvas.js` with an additional `ghost: GhostPayload` argument. It does not recompute returns.

```ts
type GhostPayload = {
  report: DecisionReport;
  counterfactuals: CounterfactualSet;
  regime: MarketRegime;
  verdicts: VerdictId[];
};
// Rendering contract (to be implemented in v0.2 slice):
// - Fast replay 5-8s over closes[] with three step paths: MARKET (closes normalized), YOU (equityCurve), BUY_AND_HOLD (buyAndHoldEquity)
// - Markers ▲ BUY / ▼ SELL at action days
// - No new numeric computation inside the renderer; all numbers come from report/counterfactuals.
// - Respects prefers-reduced-motion: static overlay instead of animated replay.
// - Uses only palette tokens (--game-*) and hard rects, consistent with docs/ARCADE_VISUAL_DIRECTION.md:5
```

Ghost and settlement summary are **separate concerns**: settlement stays authoritative (existing `results.js`), ghost is an additive `flappyk:decision-ready` listener that injects a `GHOST REPLAY` button into `settlement-screen` only after the report exists.

---

## 8. Copy & i18n

- All user-facing decision copy lives in `scripts/i18n.js` keys, e.g. `decision.paper_hands.title`, `decision.dodged_crash.body`. No hardcoded English/Chinese in `insight-engine.js`.
- Verdict copy is `FACT` or `FACT + labeled COUNTERFACTUAL`. Never `should/mistake/advice` in any language. Bilingual review required for each verdict.
- Numbers formatted centrally via `legend-score.js:formatPercent` or `Intl.NumberFormat`; no second formatter.

---

## 9. Validation

### Unit (Node, no browser)
- `decision-metrics.test.js` — golden reports for: no trades, buy-and-hold, paper-hands, dodged-crash, overtrader, maxDD edge, 250-length invariants.
- `counterfactual-engine.test.js` — invariants: `buyAndHold.finalCash === startCash*(close249/close0)`, `firstEntryHold.applicable` iff buys>0, curves length 250.
- `market-regime.test.js` — regime pure, never reads `actions`; deterministic on same window.
- `insight-engine.test.js` — only whitelisted VerdictIds, at most 2, traceable `reportField`.
- `decision-storage.test.js` — version mismatch, corrupt JSON, quota exceeded.

### Static contracts (existing pipeline)
- `scripts/validate-static-contracts.mjs` must assert:
  - no `FlappyKGame` wrapper in `scripts/decision/*`
  - no `generateInvestmentAdvice` string
  - no `You should` / `should have` in `scripts/decision/*`
  - `market-regime.js` does not import or read `actions`

### Browser (Playwright, later slices)
- Settlement still renders when `scripts/decision/*` is blocked (fail-open).
- `flappyk:decision-ready` fires exactly once per `level-did-settle`.
- Ghost overlay does not change `cash/shares` after replay.

---

## 10. Risks & Explicit Out-of-Scope

- **Hindsight creep**: mitigated by whitelisted verdicts + `FACT before advice` review gate (`PRODUCT_PHILOSOPHY.md:5`).
- **Second win condition creep**: mitigated by banning `mastery`/`edge` from settlement logic; mastery never influences `isSuccess`.
- **Storage bloat**: mitigated by capping reports to 50 and not persisting recomputable counterfactual curves.
- **Performance**: all Decision Engine work is O(250) per level, synchronous, no allocations beyond the report; no impact on 60fps `market-canvas.js` tick path.

Out of scope for v0.1: `EDGE/RISK/DISCIPLINE` stars, achievement UI, market-archetype boss pool, fee/modifier modes, cloud sync, leaderboard use.

---

## 11. Slice Plan (for TASKS.md)

Slice 1 — **Foundation (pure facts, no UI)**: `decision-recorder + decision-metrics + market-regime + decision-storage` + unit tests + static contract. Verifiable: `npm run validate:static` + Node tests green, game still winnable with decision scripts blocked.

Slice 2 — **Counterfactual + Ghost data**: `counterfactual-engine + insight-engine + mastery-system (reducer only)` + golden tests for `PAPER_HANDS/DODGED_THE_CRASH` thresholds. Verifiable: `flappyk:decision-ready` payload matches spec, no DOM.

Slice 3 — **Replay surface**: settlement injection (`GHOST REPLAY` button → 5-8s overlay using `market-canvas.js` with `ghost` arg) + i18n copy + reduced-motion fallback + Playwright fail-open test. Verifiable: ghost replays the same window that just settled, then settlement remains interactable.

