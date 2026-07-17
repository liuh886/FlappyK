import urllib.request
import csv
import json
import time

tickers = ["AAPL", "MSFT", "TSLA", "AMZN", "SPY", "NVDA", "BTC-USD", "GOOGL", "META", "NFLX"]
all_data = {}

# Period from 2018-01-01 (1514764800) to 2026-01-01 (1767225600)
period1 = 1514764800
period2 = 1767225600

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

for ticker in tickers:
    url = f"https://query1.finance.yahoo.com/v7/finance/download/{ticker}?period1={period1}&period2={period2}&interval=1d&events=history&includeAdjustedClose=true"
    print(f"Fetching {ticker}...")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            lines = [line.decode('utf-8') for line in response.readlines()]
            reader = csv.DictReader(lines)
            data_list = []
            for row in reader:
                try:
                    data_list.append({
                        "date": row["Date"],
                        "open": float(row["Open"]),
                        "high": float(row["High"]),
                        "low": float(row["Low"]),
                        "close": float(row["Close"]),
                        "volume": float(row["Volume"])
                    })
                except ValueError:
                    continue # Skip empty or null rows
            
            if len(data_list) > 300:
                all_data[ticker] = data_list
                print(f"Success {ticker}: {len(data_list)} rows")
    except Exception as e:
        print(f"Failed to fetch {ticker}: {e}")
    
    time.sleep(1)

with open("data.js", "w", encoding="utf-8") as f:
    f.write("const stockData = " + json.dumps(all_data) + ";\n")

print("Done! Data written to data.js")
