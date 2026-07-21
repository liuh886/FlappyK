# FlappyK

A small browser trading game built around one question:

> Can you beat an unknown historical market without knowing the asset or period?

FlappyK keeps its deliberately simple pixel-arcade style. You trade fixed-size positions, move through three market games, and reveal the asset and historical period only when each game ends.

## First playable release

The first public version is planned as **v0.1.0**.

It includes:

- three games: Crypto, A-Shares, and US Stocks;
- historical OHLC candlestick playback;
- faster 15x default playback with keyboard and mobile pause controls;
- fixed $1,000 buy/sell actions with a $1 transaction fee;
- one clear pass rule: finish each game with positive Excess Return;
- player, market, cumulative, drawdown, and excess-return results;
- a deterministic Daily Run shared by all players for the same UTC date;
- browser-local Personal Best, Daily Streak, and completed-run tracking without login;
- themed Profit Cards and a final Market Legend card set;
- a global Excess Top 10 leaderboard;
- reproducible same-market, same-window friend challenges;
- a hidden custom challenge for choosing a market and asset;
- friend-challenge link sharing and PNG result export.

## Run locally

No build step is required.

```bash
git clone https://github.com/liuh886/FlappyK.git
cd FlappyK
python -m http.server 8000
```

Open `http://localhost:8000` in a browser.

A local web server is recommended instead of opening `index.html` directly because browser download, URL-query, clipboard, storage, and share APIs behave more consistently in a local HTTP context.

The market snapshot is stored locally in `data.js`. An internet connection is still used for the Google pixel font, the `html2canvas` CDN dependency, supplemental QQQ history, and the live leaderboard JSON.

## Controls

| Action | Desktop | Mobile |
| --- | --- | --- |
| Buy $1,000 | `↑` | `🐂 BUY` |
| Sell $1,000 | `↓` | `🐻‍❄️ SELL` |
| Slow down | `←` | `◀` |
| Speed up | `→` | `▶` |
| Pause / resume | `Space` | `Ⅱ / ▶` |
| Return home | `ESC` | reload / browser navigation |

Playback starts at 15x. Switching away from the browser tab pauses an active game automatically so the hidden market does not continue without the player.

## Game loop

1. Start with $10,000.
2. Trade an unidentified 250-day historical window.
3. At settlement, FlappyK reveals the asset and compares Player Return with Market Return.
4. Pass only when `Player Return - Market Return > 0`.
5. Repeat the same rule across Crypto, A-Shares, and US Stocks.
6. Complete all three markets to unlock the final Market Legend screen.
7. Share a same-market, same-window challenge or submit a qualifying Total Excess score to the global Top 10.

The rule is intentionally symmetric:

- making money is not enough if the hidden market gained more;
- losing money can still pass if the hidden market fell further and the player achieved positive Excess Return;
- exactly matching the market does not pass.

## Daily Run

`DAILY RUN` gives every player the same three hidden assets and starting dates for a given UTC calendar day.

The selection is produced locally from:

- the UTC date;
- a deterministic seeded random generator;
- a sorted list of eligible assets in each market;
- the current bundled market snapshot.

No server is required. A Daily Run still uses the normal positive-Excess pass rule and remains eligible for Personal Best, friend sharing, and the global Top 10.

The browser stores:

- the best Total Excess achieved for each recent Daily Run date;
- the most recently completed UTC date;
- the current consecutive-day Daily Streak.

Replaying the same day's run can improve the local daily best but does not increase the streak more than once that day. Missing a UTC calendar day resets the next completed streak to one.

## Local personal records

FlappyK stores a minimal player record in the current browser only:

- best completed-run Total Excess;
- number of completed three-market runs;
- number of markets beaten;
- best individual Excess for Crypto, A-Shares, and US Stocks.

The home screen shows `YOUR BEST` and completed `RUNS`. The Market Legend screen announces `NEW PERSONAL BEST` when a completed run improves the stored score.

No account or server is involved. Clearing site storage, using a private window, or opening FlappyK in another browser creates separate Personal Best and Daily Run records. Storage errors do not block gameplay.

## Friend challenges

`CHALLENGE A FRIEND` generates a compact URL query parameter containing:

- the three market categories;
- the three selected asset names;
- the starting date of each 250-day window;
- the completed player's Total Excess target;
- a challenge and dataset format version.

The URL does **not** contain 750 days of price data. The receiving browser restores the three windows from the bundled `data.js` snapshot. Asset names and periods remain hidden during gameplay and are revealed through the normal settlement flow.

When a friend opens the link, the start screen displays the target Excess and changes the primary action to `PLAY CHALLENGE`. After all three games, the result screen compares:

- the receiving player's Total Excess;
- the challenger target;
- the winning or losing margin.

A completed incoming challenge can be shared again with `CHALLENGE BACK`, using the same three hidden windows but the new player's score as the target. Completed Daily Runs also generate valid friend-challenge links for that day's exact windows.

Challenge links use asset names and starting dates rather than array positions, making them more resilient to future data regeneration. If a link cannot be restored against the current bundled snapshot, FlappyK rejects it and starts a normal random run instead.

Friend challenges are intentionally lightweight and unsigned. They do not require a database, account, or server, but a determined user can edit the encoded target score. The underlying gameplay windows remain reproducible.

## Excess Top 10 leaderboard

The home screen includes a `LEADERBOARD` button that reads the current global Top 10 from `data/leaderboard.json`.

Complete normal, Daily Run, and reproducible friend-challenge runs are eligible. The ranking metric is total compounded **Excess Return** across the three revealed market paths. Custom challenge results do not enter the global leaderboard.

After reaching the Market Legend screen, the game compares the score with the current tenth-place cutoff:

- a likely Top 10 result displays `SUBMIT TOP 10`;
- lower results are not sent to GitHub;
- if the leaderboard cannot be loaded, GitHub Actions performs the final eligibility check.

Submission uses a prefilled GitHub Issue. The player clicks the in-game button and then confirms the already-completed Issue form. GitHub Actions uses the Issue author as the player identity, keeps only that user's personal best, sorts by Excess Return, and writes no more than ten entries to `data/leaderboard.json`. Non-qualifying Issues are automatically closed without changing the leaderboard.

The leaderboard is intentionally honor-based. The Action validates the score format and Top 10 rules, but it does not replay the full trade history or prevent a determined user from modifying browser-side values.

## Hidden custom challenge

Type `QQQ` while the start screen is active to open the custom challenge selector. On a touch device, long-press the `FLAPPY K` title and enter `QQQ`.

The custom challenge lets the player choose:

- Crypto, A-Shares, or US Stocks;
- any bundled asset in the selected market.

The asset is chosen by the player, but the 250-day historical window remains random and hidden until settlement. The same positive-Excess pass rule applies. A custom result can be saved, replayed on the same window, or restarted with another asset. Custom runs are isolated from the normal three-game progression and do not alter Market Legend, local completed-run records, Daily Streak, or leaderboard records.

The unlock code is not displayed as the challenge name. Once opened, the mode is shown simply as `CUSTOM CHALLENGE`, and the HUD uses `GAME: CUSTOM`.

## Result metrics

- **Player Return**: return earned during the current game.
- **Market Return**: natural price change of the revealed asset over the same historical interval.
- **Excess**: `Player Return - Market Return`; positive Excess is required to pass each game.
- **Total Return**: cumulative return from the original $10,000 starting balance.
- **Total Excess**: cumulative game return minus the compounded return of the three underlying market paths; this is the local Personal Best, Daily best, leaderboard, and friend-challenge metric.
- **Max DD**: maximum peak-to-trough decline in portfolio value during the game.

## Result sharing

The final Market Legend screen separates two actions:

- `CHALLENGE A FRIEND` — shares the reproducible friend-challenge URL through the native link share sheet, or copies the URL on browsers without link sharing;
- `SAVE RESULT` — directly renders and downloads the Market Legend PNG.

The friend-challenge action never attaches a PNG file. This keeps the shared item clickable and ensures the receiver opens the same three hidden markets and 250-day windows. Shared links use the static Open Graph image for their preview; player-specific Total Excess remains encoded in the challenge URL and is shown on the receiving start screen.

## Data

`fetch_all_data.py` builds `data.js` from:

- Binance daily K-line endpoints for crypto assets;
- `yfinance` for A-share and US-stock history.

Crypto uses raw exchange OHLC because stock splits and cash dividends do not apply.

A-share and US-stock refreshes explicitly use:

```text
auto_adjust=True
back_adjust=False
actions=True
repair=True
```

This adjusts historical OHLC for stock splits and cash dividends while keeping the latest price on the current-price basis. In Chinese market terminology, this is closer to **前复权**, not strict **后复权**. Each newly generated `data.js` also records the generation time, yfinance version, and adjustment policy in `stockDataMeta`.

For reproducible refreshes:

```bash
python -m pip install -r requirements-data.txt
python fetch_all_data.py
```

The bundled data is a historical gameplay snapshot, not a real-time market feed. Before commercial redistribution or automated public data refreshes, review the applicable upstream data terms.

## Current limitations

- long-only trading with cash; no shorting, leverage, or order types;
- fixed trade size and fee model;
- random historical-window selection for normal runs;
- Daily Run consistency assumes players are using the same bundled data snapshot;
- unsigned friend-challenge target scores;
- honor-based leaderboard submissions require a GitHub account and one final confirmation;
- local Personal Best and Daily Streak do not sync across browsers or devices;
- no automated browser end-to-end suite yet;
- native link-share behavior still depends on the browser and operating system, with clipboard/prompt fallback;
- not intended for investment decisions.

## Project structure

- `index.html` — game screens and controls;
- `style.css` — pixel-arcade layout and card themes;
- `game.js` — market playback and trading state;
- `scripts/market-pass-rule.js` — shared Player Return, Market Return, Excess, and pass calculation;
- `scripts/market-goal-ui.js` — final HUD goal consistency across normal, friend, Daily, and custom modes;
- `scripts/game-pacing.js` — 15x default playback, pause/resume controls, and automatic tab-hide pausing;
- `scripts/daily-run-core.js` — deterministic daily descriptors, UTC date helpers, and streak calculations;
- `daily-run.js` / `daily-run.css` — Daily Run mode, results, sharing bridge, and browser-local daily record UI;
- `scripts/player-profile.js` / `local-records.css` — browser-local Personal Best and completed-run UI;
- `results.js` — settlement metrics and Legend result presentation;
- `friend-challenge.js` / `friend-challenge.css` — challenge restoration, run recording, and result comparison;
- `scripts/friend-challenge-codec.js` — compact versioned challenge encoding and validation;
- `share-challenge.js` — friend-challenge link sharing plus final Legend PNG saving;
- `share-challenge.css` — stable off-screen Legend export layout;
- `leaderboard.js` / `leaderboard.css` — Top 10 display, qualification check, and prefilled score submission;
- `data/leaderboard.json` — the current maximum ten leaderboard records;
- `.github/workflows/leaderboard.yml` — Issue validation and automatic Top 10 update;
- `scripts/leaderboard-ranking.js` — deterministic ranking and one-best-score-per-player rules;
- `custom-challenge.js` / `custom-challenge.css` — hidden market and asset selector;
- `card-export.js` / `card-export.css` — stable single-card desktop/mobile image generation;
- `data.js` — embedded historical market snapshot;
- `fetch_all_data.py` — adjusted market-data refresh script;
- `requirements-data.txt` — pinned data-refresh dependency.

## License

FlappyK's original software and documentation are licensed under the **Business Source License 1.1 (BSL 1.1)**.

Before **2030-07-18**:

- personal, educational, academic research, evaluation, and other non-commercial production use is permitted;
- commercial production use requires a separate commercial license from the Licensor;
- BSL 1.1 is source-available but is not an Open Source license.

On **2030-07-18**, or earlier if required by BSL 1.1, the Licensed Work converts to the **Apache License 2.0**.

The license applies to the original FlappyK software and documentation. It does not relicense `data.js`, generated market data, third-party libraries, fonts, or other third-party material; those remain subject to their respective upstream terms. See [`LICENSE`](LICENSE) for the complete terms.
