# Changelog

All notable changes to FlappyK will be documented in this file.

## [0.1.0] - 2026-07-18

### Added

- First complete three-market game loop covering Crypto, A-Shares, and US Stocks.
- Historical candlestick playback with keyboard and mobile trading controls.
- Fixed-size $1,000 buy/sell actions and $1 transaction fees.
- Level return, cumulative total return, maximum drawdown, and excess-return metrics.
- Excess return defined as level portfolio return minus the underlying asset return over the same interval.
- Themed Profit Cards for each completed market.
- Final Market Legend screen with a combined three-card result.
- Scrolling Legend summary with total gain, total trading days, and compounded excess return against the three underlying market paths.
- Distinct bull and polar-bear trade markers for buy and sell actions.
- Hidden custom challenge, unlocked with `QQQ`, with market and asset selection, random hidden 250-day windows, same-window retry, and isolated results.
- `QQQ` as a selectable US-market asset in the custom challenge, backed by real historical adjusted OHLC data.
- `ESC` navigation that resets the active run and returns to the home screen.
- Stable high-resolution Profit Card exports independent of the responsive screen size.
- Desktop horizontal Legend export and mobile vertical long-image export.
- Native mobile file-sharing support with PNG download fallback.
- A compact Ko-fi support link on the completed Market Legend screen.
- A subtle `FlappyK by zhihao` attribution watermark in the visible and exported Legend card composition.
- Data-generation metadata recording the refresh time, yfinance version, and adjustment policy.
- Business Source License 1.1 for original code and documentation, with non-commercial production use permitted and conversion to Apache 2.0 on 2030-07-18.

### Changed

- Simplified game and result copy for a tighter arcade presentation.
- Renamed the final achievement from Wall Street Legend to Market Legend to reflect all three markets.
- Removed repeated success text from individual cards in the final Legend view.
- Renamed the visible secret-mode title to `CUSTOM CHALLENGE` and its HUD level label to `CUSTOM`; `QQQ` remains the unlock code and is also a selectable asset.
- Replaced the bison buy artwork with a standard bull presented on a compact gold arcade badge.
- Moved `REAL HISTORICAL K-LINES` into a low-emphasis scrolling footer on the home screen.
- Restored manual progression after successful Levels 1 and 2: the Profit Card remains visible until the player clicks `NEXT LEVEL`.
- Made equity price adjustment explicit with `auto_adjust=True`, `back_adjust=False`, `actions=True`, and `repair=True`.
- Pinned the data-refresh environment to `yfinance==1.5.1`.

### Fixed

- Fixed a repeated Profit Card title mutation loop that could prevent the settlement screen from rendering.
- Fixed duplicate mobile trades caused by overlapping touch and mouse compatibility events.
- Removed duplicate bison and Canvas text overrides that competed with the standard bull rendering.
- Kept QQQ selectable in the custom challenge without adding it to the normal third-level random asset pool.
- Fixed the normal random-window off-by-one error so the final legal 250-day window can be selected.
- Excluded assets with fewer than 250 usable rows from normal random selection.
- Preserved the completed level in Profit Card export filenames and added a dedicated custom-result filename.
- Fixed the undefined `finalReturn` reference that prevented reliable progression to the next level.
- Fixed next-level target inheritance so it uses the completed cumulative return.
- Fixed mobile card captures inheriting viewport width, screen scaling, scroll state, and responsive transforms.
- Fixed duplicate screenshot generation caused by overlapping export listeners.
- Fixed duplicated dollar signs in Legend Card starting and final values.
- Improved long asset-name wrapping in generated images.
- Restored mobile virtual controls during normal gameplay and limited their hidden state to the Profit Card settlement screen.
- Reduced mobile settlement action sizing and enabled vertical scrolling so `NEXT LEVEL` and `TRY AGAIN` remain reachable.
- Removed reliance on version-dependent yfinance adjustment defaults for future data refreshes.

### Known limitations

- There is no full browser end-to-end suite yet; current CI covers syntax, static regressions, HTML parsing, and data audits.
- Core gameplay still uses shared global state and order-dependent wrappers around `startLevel`, `endLevel`, and `pickRandomData`.
- Mobile share-sheet behavior depends on the browser and operating system.
- The currently bundled `data.js` predates embedded adjustment metadata and should be regenerated before an audit-grade release.
- Supplemental QQQ loading depends on network access to the documented historical CSV source until `data.js` is regenerated with QQQ bundled.
- `html2canvas` is loaded from a third-party CDN, so image export depends on that network resource.
- Bundled historical data remains subject to upstream data-source terms and is excluded from the BSL license grant.
