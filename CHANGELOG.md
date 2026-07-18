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
- Stable high-resolution Profit Card exports independent of the responsive screen size.
- Desktop horizontal Legend export and mobile vertical long-image export.
- Native mobile file-sharing support with PNG download fallback.

### Changed

- Simplified game and result copy for a tighter arcade presentation.
- Renamed the final achievement from Wall Street Legend to Market Legend to reflect all three markets.
- Removed repeated success text from individual cards in the final Legend view.

### Fixed

- Fixed the undefined `finalReturn` reference that prevented reliable progression to the next level.
- Fixed next-level target inheritance so it uses the completed cumulative return.
- Fixed mobile card captures inheriting viewport width, screen scaling, scroll state, and responsive transforms.
- Fixed duplicate screenshot generation caused by overlapping export listeners.
- Fixed duplicated dollar signs in Legend Card starting and final values.
- Improved long asset-name wrapping in generated images.

### Known limitations

- No automated browser test suite or CI checks yet.
- Mobile share-sheet behavior depends on the browser and operating system.
- No open-source license has been selected.
- Bundled historical data remains subject to upstream data-source terms.
