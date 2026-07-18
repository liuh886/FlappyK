# FlappyK

A small browser trading game built around one question:

> Can you trade an unknown historical K-line without knowing the asset or period?

FlappyK keeps its deliberately simple pixel-arcade style. You trade fixed-size positions, move through three market stages, and reveal the asset and historical period only when each level ends.

## First playable release

The first public version is planned as **v0.1.0**.

It includes:

- three stages: Crypto, A-Shares, and US Stocks;
- historical OHLC candlestick playback;
- keyboard and mobile controls;
- fixed $1,000 buy/sell actions with a $1 transaction fee;
- level, cumulative, drawdown, and excess-return results;
- themed Profit Cards and a final Market Legend card set;
- a global Excess Top 10 leaderboard;
- a hidden custom challenge for choosing a market and asset;
- desktop PNG download and supported mobile share-sheet export.

## Run locally

No build step is required.

```bash
git clone https://github.com/liuh886/FlappyK.git
cd FlappyK
python -m http.server 8000
```

Open `http://localhost:8000` in a browser.

A local web server is recommended instead of opening `index.html` directly because browser download and share APIs behave more consistently in a local HTTP context.

The market snapshot is stored locally in `data.js`. An internet connection is still used for the Google pixel font, the `html2canvas` CDN dependency, supplemental QQQ history, and the live leaderboard JSON.

## Controls

| Action | Desktop | Mobile |
| --- | --- | --- |
| Buy $1,000 | `↑` | `🐂 BUY` |
| Sell $1,000 | `↓` | `🐻‍❄️ SELL` |
| Slow down | `←` | `◀` |
| Speed up | `→` | `▶` |
| Return home | `ESC` | reload / browser navigation |

## Game loop

1. Start with $10,000.
2. Trade an unidentified 250-day historical window.
3. Finish Level 1 with a positive cumulative return.
4. In later levels, beat the cumulative-return checkpoint set by the previous completed level.
5. Complete Crypto, A-Shares, and US Stocks to unlock the final Market Legend screen.
6. Submit a qualifying total Excess score to the global Top 10.

## Excess Top 10 leaderboard

The home screen includes a `LEADERBOARD` button that reads the current global Top 10 from `data/leaderboard.json`.

Only complete normal three-market runs are eligible. The ranking metric is total compounded **Excess Return** across the three revealed market paths. Custom challenge results do not enter the global leaderboard.

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

The asset is chosen by the player, but the 250-day historical window remains random and hidden until settlement. A custom result can be saved, replayed on the same window, or restarted with another asset. Custom runs are isolated from the normal three-stage progression and do not alter Market Legend or leaderboard records.

The unlock code is not displayed as the challenge name. Once opened, the mode is shown simply as `CUSTOM CHALLENGE`, and the HUD uses `LEVEL: CUSTOM`.

## Result metrics

- **Level Return**: return earned during the current level.
- **Total Return**: cumulative return from the original $10,000 starting balance.
- **Underlying Return**: natural price change of the revealed asset over the same historical interval.
- **Excess**: `Level Return - Underlying Return` on an individual Profit Card.
- **Total Excess**: cumulative game return minus the compounded return of the three underlying market paths; this is the leaderboard metric.
- **Max DD**: maximum peak-to-trough decline in portfolio value during the level.

Excess return does not change the level pass/fail rule. It is used for the global leaderboard after the player completes all three markets.

## Result cards

Profit Cards can be exported as PNG files. The final Legend view exports all three completed cards:

- desktop: horizontal three-card layout;
- mobile: fixed-width vertical long image;
- supported mobile browsers: native file-sharing sheet;
- other environments: PNG download fallback.

Some mobile browsers may display `TAP TO SHARE` after image generation. A second tap opens the share sheet while the generated file is still available.

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
- random historical-window selection;
- honor-based leaderboard submissions require a GitHub account and one final confirmation;
- no persistent player profile beyond the GitHub username stored in the Top 10;
- no automated browser end-to-end suite yet;
- mobile system share behavior still depends on browser and operating-system support;
- not intended for investment decisions.

## Project structure

- `index.html` — game screens and controls;
- `style.css` — pixel-arcade layout and card themes;
- `game.js` — market playback and trading state;
- `results.js` — settlement metrics and Legend result presentation;
- `leaderboard.js` / `leaderboard.css` — Top 10 display, qualification check, and prefilled score submission;
- `data/leaderboard.json` — the current maximum ten leaderboard records;
- `.github/workflows/leaderboard.yml` — Issue validation and automatic Top 10 update;
- `scripts/leaderboard-ranking.js` — deterministic ranking and one-best-score-per-player rules;
- `custom-challenge.js` / `custom-challenge.css` — hidden market and asset selector;
- `card-export.js` / `card-export.css` — stable desktop/mobile image generation;
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
