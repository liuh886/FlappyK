from __future__ import annotations

import json
import time
import urllib.request
from datetime import datetime, timezone
from typing import Any

import yfinance as yf


DAYS_REQUIRED = 300

all_data: dict[str, dict[str, list[dict[str, Any]]]] = {
    "crypto": {},
    "ashare": {},
    "usstock": {},
}

# yfinance's adjusted OHLC keeps the latest price on the current-price basis
# while adjusting historical OHLC for stock splits and cash dividends.
YFINANCE_OPTIONS = {
    "period": "5y",
    "interval": "1d",
    "auto_adjust": True,
    "back_adjust": False,
    "actions": True,
    "repair": True,
    "progress": False,
    "multi_level_index": False,
}


def scalar(value: Any) -> float:
    """Return a float from either a scalar or a one-item pandas object."""
    if hasattr(value, "iloc"):
        value = value.iloc[0]
    return float(value)


def download_adjusted_history(symbol: str) -> list[dict[str, Any]]:
    """Download split- and dividend-adjusted daily OHLC from yfinance."""
    df = yf.download(symbol, **YFINANCE_OPTIONS)
    if df.empty:
        return []

    df = df.dropna(subset=["Open", "High", "Low", "Close"])
    data_list: list[dict[str, Any]] = []

    for index, row in df.iterrows():
        try:
            data_list.append({
                "date": index.strftime("%Y-%m-%d"),
                "open": scalar(row["Open"]),
                "high": scalar(row["High"]),
                "low": scalar(row["Low"]),
                "close": scalar(row["Close"]),
            })
        except (KeyError, TypeError, ValueError, IndexError) as error:
            print(f"Skipping malformed {symbol} row at {index}: {error}")

    return data_list


# 1. Fetch Crypto from Binance.
# Crypto pairs have no stock splits or cash dividends, so raw exchange OHLC is used.
crypto_symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "ADAUSDT"]
crypto_names = {
    "BTCUSDT": "Bitcoin",
    "ETHUSDT": "Ethereum",
    "BNBUSDT": "Binance Coin",
    "SOLUSDT": "Solana",
    "ADAUSDT": "Cardano",
}

for symbol in crypto_symbols:
    url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval=1d&limit=1000"
    print(f"Fetching {symbol}...")

    try:
        request = urllib.request.Request(url)
        with urllib.request.urlopen(request, timeout=20) as response:
            rows = json.loads(response.read().decode("utf-8"))

        data_list = []
        for row in rows:
            date_str = time.strftime("%Y-%m-%d", time.gmtime(row[0] / 1000.0))
            data_list.append({
                "date": date_str,
                "open": float(row[1]),
                "high": float(row[2]),
                "low": float(row[3]),
                "close": float(row[4]),
            })

        if len(data_list) > DAYS_REQUIRED:
            all_data["crypto"][crypto_names[symbol]] = data_list
    except Exception as error:
        print(f"Failed to fetch {symbol}: {error}")


# 2. Fetch A-Shares using explicit adjusted yfinance OHLC.
ashare_symbols = [
    "600519.SS", "601398.SS", "000858.SZ", "002594.SZ", "600036.SS",
    "601857.SS", "600900.SS", "601288.SS", "600585.SS", "600276.SS",
    "300750.SZ", "601318.SS", "600104.SS", "601166.SS", "600887.SS",
    "000333.SZ", "601816.SS", "002415.SZ",
]
ashare_names = {
    "600519.SS": "Kweichow Moutai (A-Share)",
    "601398.SS": "ICBC (A-Share)",
    "000858.SZ": "Wuliangye (A-Share)",
    "002594.SZ": "BYD (A-Share)",
    "600036.SS": "CMB (A-Share)",
    "601857.SS": "PetroChina (A-Share)",
    "600900.SS": "Yangtze Power (A-Share)",
    "601288.SS": "Agri Bank of China (A-Share)",
    "600585.SS": "Conch Cement (A-Share)",
    "600276.SS": "Hengrui Medicine (A-Share)",
    "300750.SZ": "CATL (A-Share)",
    "601318.SS": "Ping An (A-Share)",
    "600104.SS": "SAIC Motor (A-Share)",
    "601166.SS": "Industrial Bank (A-Share)",
    "600887.SS": "Yili (A-Share)",
    "000333.SZ": "Midea (A-Share)",
    "601816.SS": "Beijing-Shanghai HSR (A-Share)",
    "002415.SZ": "Hikvision (A-Share)",
}

for symbol in ashare_symbols:
    print(f"Fetching {symbol}...")
    try:
        data_list = download_adjusted_history(symbol)
        if len(data_list) > DAYS_REQUIRED:
            all_data["ashare"][ashare_names[symbol]] = data_list
    except Exception as error:
        print(f"Failed to fetch {symbol}: {error}")


# 3. Fetch US Stocks using explicit adjusted yfinance OHLC.
us_symbols = [
    "AAPL", "MSFT", "TSLA", "AMZN", "NVDA",
    "GOOGL", "META", "BRK-B", "LLY", "V",
    "JPM", "WMT", "JNJ", "MA", "PG",
    "AVGO", "HD", "COST",
]
us_names = {
    "AAPL": "Apple (US)",
    "MSFT": "Microsoft (US)",
    "TSLA": "Tesla (US)",
    "AMZN": "Amazon (US)",
    "NVDA": "Nvidia (US)",
    "GOOGL": "Alphabet (US)",
    "META": "Meta (US)",
    "BRK-B": "Berkshire Hathaway (US)",
    "LLY": "Eli Lilly (US)",
    "V": "Visa (US)",
    "JPM": "JPMorgan (US)",
    "WMT": "Walmart (US)",
    "JNJ": "Johnson & Johnson (US)",
    "MA": "Mastercard (US)",
    "PG": "Procter & Gamble (US)",
    "AVGO": "Broadcom (US)",
    "HD": "Home Depot (US)",
    "COST": "Costco (US)",
}

for symbol in us_symbols:
    print(f"Fetching {symbol}...")
    try:
        data_list = download_adjusted_history(symbol)
        if len(data_list) > DAYS_REQUIRED:
            all_data["usstock"][us_names[symbol]] = data_list
    except Exception as error:
        print(f"Failed to fetch {symbol}: {error}")


metadata = {
    "generated_at_utc": datetime.now(timezone.utc).isoformat(),
    "yfinance_version": getattr(yf, "__version__", "unknown"),
    "equity_price_policy": {
        "auto_adjust": True,
        "back_adjust": False,
        "actions": True,
        "repair": True,
        "description": (
            "A-share and US-stock OHLC are adjusted for stock splits and cash "
            "dividends on the current-price basis. In Chinese market terminology "
            "this is closer to 前复权, not strict 后复权."
        ),
    },
    "crypto_price_policy": "Raw Binance daily OHLC; corporate-action adjustment is not applicable.",
}

with open("data.js", "w", encoding="utf-8") as output:
    output.write(
        "const stockDataMeta = "
        + json.dumps(metadata, ensure_ascii=False)
        + ";\n"
    )
    output.write(
        "const stockData = "
        + json.dumps(all_data, ensure_ascii=False)
        + ";\n"
    )

print("Done! Adjusted data and metadata written to data.js")
