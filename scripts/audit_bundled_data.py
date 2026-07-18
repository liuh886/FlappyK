from __future__ import annotations

import json
from pathlib import Path
from typing import Any


DATA_FILE = Path(__file__).resolve().parents[1] / "data.js"

KNOWN_SPLITS = [
    ("Amazon (US)", "2022-06-03", "2022-06-06", "20-for-1"),
    ("Alphabet (US)", "2022-07-15", "2022-07-18", "20-for-1"),
    ("Tesla (US)", "2022-08-24", "2022-08-25", "3-for-1"),
    ("Walmart (US)", "2024-02-23", "2024-02-26", "3-for-1"),
    ("Nvidia (US)", "2024-06-07", "2024-06-10", "10-for-1"),
    ("Broadcom (US)", "2024-07-12", "2024-07-15", "10-for-1"),
]


def load_stock_data() -> dict[str, dict[str, list[dict[str, Any]]]]:
    text = DATA_FILE.read_text(encoding="utf-8")
    marker = "const stockData = "
    if marker not in text:
        raise RuntimeError("data.js does not define stockData")

    payload = text.split(marker, 1)[1].strip()
    if payload.endswith(";"):
        payload = payload[:-1]

    return json.loads(payload)


def rows_by_date(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {row["date"]: row for row in rows}


def audit_known_splits(data: dict[str, dict[str, list[dict[str, Any]]]]) -> None:
    us_data = data.get("usstock", {})
    checked = 0

    for asset, before_date, after_date, split_label in KNOWN_SPLITS:
        rows = us_data.get(asset)
        if not rows:
            print(f"SKIP: {asset} is not present in the bundled snapshot")
            continue

        by_date = rows_by_date(rows)
        before = by_date.get(before_date)
        after = by_date.get(after_date)
        if not before or not after:
            print(f"SKIP: {asset} does not cover {before_date} / {after_date}")
            continue

        ratio = float(after["open"]) / float(before["close"])
        checked += 1

        # Unadjusted split data would be near 1/split-ratio (0.05, 0.10, 0.33).
        if not 0.50 <= ratio <= 1.50:
            raise AssertionError(
                f"{asset} {split_label} is discontinuous: "
                f"{before_date} close={before['close']}, "
                f"{after_date} open={after['open']}, ratio={ratio:.4f}"
            )

        print(f"PASS: {asset} {split_label}, continuity ratio={ratio:.4f}")

    if checked < 3:
        raise AssertionError(
            f"Only {checked} known split events were available; "
            "the bundled snapshot is not broad enough for a meaningful split audit."
        )


def audit_extreme_equity_gaps(
    data: dict[str, dict[str, list[dict[str, Any]]]]
) -> None:
    for market in ("ashare", "usstock"):
        for asset, rows in data.get(market, {}).items():
            for previous, current in zip(rows, rows[1:]):
                previous_close = float(previous["close"])
                current_open = float(current["open"])
                if previous_close <= 0:
                    raise AssertionError(f"{asset} has a non-positive close")

                ratio = current_open / previous_close
                if ratio < 0.30 or ratio > 3.00:
                    raise AssertionError(
                        f"{asset} has an extreme overnight discontinuity: "
                        f"{previous['date']} close={previous_close}, "
                        f"{current['date']} open={current_open}, ratio={ratio:.4f}"
                    )


def main() -> None:
    data = load_stock_data()
    audit_known_splits(data)
    audit_extreme_equity_gaps(data)
    print(
        "Bundled equity OHLC passes split-continuity checks. "
        "Dividend adjustment is guaranteed for future refreshes by explicit "
        "yfinance auto_adjust=True, but cannot be proven from OHLC continuity alone."
    )


if __name__ == "__main__":
    main()
