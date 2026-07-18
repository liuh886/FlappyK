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
- a hidden `QQQ` custom challenge for choosing a market and asset;
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

The market snapshot is stored locally in `data.js`. An internet connection is still used for the Google pixel font and the `html2canvas` CDN dependency.

## Controls

| Action | Desktop | Mobile |
| --- | --- | --- |
| Buy $1,000 | `↑` | `🦬 BUY` |
| Sell $1,000 | `↓` | `🐻‍❄️ SELL` |
| Slow down | `←` | `◀` |
| Speed up | `→` | `▶` |

## Game loop

1. Start with $10,000.
2. Trade an unidentified 250-day historical window.
3. Finish Level 1 with a positive cumulative return.
4. In later levels, beat the cumulative-return checkpoint set by the previous completed level.
5. Complete Crypto, A-Shares, and US Stocks to unlock the final Market Legend screen.

## Hidden QQQ custom challenge

Type `QQQ` while the start screen is active to open the custom challenge selector. On a touch device, long-press the `FLAPPY K` title and enter `QQQ`.

The custom challenge lets the player choose:

- Crypto, A-Shares, or US Stocks;
- any bundled asset in the selected market.

The asset is chosen by the player, but the 250-day historical window remains random and hidden until settlement. A custom result can be saved, replayed on the same window, or restarted with another asset. Custom runs are isolated from the normal three-stage progression and do not alter Market Legend records.

## Result metrics

- **Level Return**: return earned during the current level.
- **Total Return**: cumulative return from the original $10,000 starting balance.
- **Underlying Return**: natural price change of the revealed asset over the same historical interval.
- **Excess**: `Level Return - Underlying Return`.
- **Max DD**: maximum peak-to-trough decline in portfolio value during the level.

Excess return is shown for comparison only. It does not currently change the level pass/fail rule.

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
- no leaderboard, seeded daily challenge, or persistent profile;
- no automated browser test suite yet;
- mobile system share behavior still depends on browser and operating-system support;
- not intended for investment decisions.

## Project structure

- `index.html` — game screens and controls;
- `style.css` — pixel-arcade layout and card themes;
- `game.js` — market playback and trading state;
- `results.js` — settlement metrics and Legend result presentation;
- `custom-challenge.js` / `custom-challenge.css` — hidden QQQ market and asset selector;
- `card-export.js` / `card-export.css` — stable desktop/mobile image generation;
- `data.js` — embedded historical market snapshot;
- `fetch_all_data.py` — adjusted market-data refresh script;
- `requirements-data.txt` — pinned data-refresh dependency.

## License

No open-source license has been selected yet. Public access to the source code does not by itself grant permission to reuse, modify, or redistribute it.
