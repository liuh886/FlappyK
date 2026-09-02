# FlappyK Decision Blind Test — 5-person protocol (P2)

> Goal: verify that Ghost Replay + Decision Summary creates an "I see it" moment, not that players learn verdict labels.

Status: Draft for P2. No code. Run after P0/P1 land.

## Principle

Do not explain the rules. Do not explain Excess. Do not explain Ghost.

Observe what the player asks after the first completed 250-day game.

## Setup

- Device: one desktop + one phone (360px + landscape), both 15x speed, sound on, skin Market Arcade.
- Build: Decision Engine v0.1 + P0 split + P1 summary + ghost-replay-view (8 modules + 3 presentation).
- Data: normal random 250-day window (no Daily Run, no friend challenge) to avoid extra framing.
- Consent: tell "This is a 5-minute market game, try to beat the hidden market. We watch and take notes. No tutorial."

## Script (facilitator says exactly this)

1. Open `index.html` on fresh profile (clear localStorage). Show home, say: "This is FlappyK. Trade 3 hidden markets, try to beat the market. Controls are on screen."
2. Do not explain BUY/SELL sizing, fee, Excess, or Ghost. Let onboarding dialog speak.
3. Start PLAY. Do not coach. Allow pause/speed. No hints.
4. After settlement (Profit Card + Decision Summary + GHOST REPLAY button): say nothing for 10 seconds. Let player read.
5. If player clicks Ghost: observe silently. If not, after 15s say: "There's a replay button if you want."
6. After Ghost finishes (or is dismissed): ask three open questions in order:
   - Q1: "What happened in that market?"
   - Q2: "Why did you win / lose?"
   - Q3: "If you played the same market again, what would you do differently?"

## What to record (per player)

- Time to first BUY/SELL, trade count, whether they used pause.
- Settlement reading: did they notice Excess vs Market Return? Did they read Decision Summary? Did they click Ghost without prompting?
- Ghost watching: did they track YOU vs HOLD divergence? Did they point at BUY/SELL markers?
- First question after Ghost (verbatim). Classify:
  - **A — Close loop**: "Why did I lose to HOLD?" / "I sold too early and missed +40%" / "Holding would have won." (player links decision to consequence)
  - **B — Market identity**: "What stock was that?" / "Was it BTC?" (player fixates on reveal, not decision)
  - **C — System confusion**: "What does Excess mean?" / "Why did I lose if I made money?" (label/rule not yet legible)
- Q2/Q3 answers: do they reference a specific decision (sold Day 108, then +52%) or a generic trait (I'm a paper hands)?

## Success bar (for this stage)

- At least 3/5 players ask a type-A question before being prompted about Ghost.
- At least 4/5 click Ghost without second prompt.
- Zero players describe Ghost as "analysis report" — they describe it as "replay" or "ghost."

If ≥2 players ask type-B as first question, the reveal is overpowering the decision. Reduce asset/period prominence, increase Ghost contrast.

If ≥2 players ask type-C, settlement copy is still too abstract. Further compress Decision Summary to one fact line + Ghost, no acronyms.

## Anti-patterns to avoid in notes

- Do not count "I understand investing now" as success.
- Do not prompt "Did you learn risk management?" — that's interpretation, not fact.
- Do not show mastery/achievements during this test; they are not part of the loop yet.

## Output

One page per player (3 quotes + classification) + one team decision: keep Ghost as is, or adjust before scaling to P2+ (Edge/Risk/Discipline stars, archetype as world flavour only after settlement).
