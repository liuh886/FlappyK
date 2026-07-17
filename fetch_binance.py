import urllib.request
import json
import time

symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "ADAUSDT", "XRPUSDT", "DOGEUSDT", "LTCUSDT", "LINKUSDT", "AVAXUSDT"]
names = {
    "BTCUSDT": "Bitcoin",
    "ETHUSDT": "Ethereum",
    "BNBUSDT": "Binance Coin",
    "SOLUSDT": "Solana",
    "ADAUSDT": "Cardano",
    "XRPUSDT": "XRP",
    "DOGEUSDT": "Dogecoin",
    "LTCUSDT": "Litecoin",
    "LINKUSDT": "Chainlink",
    "AVAXUSDT": "Avalanche"
}

all_data = {}

for symbol in symbols:
    url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval=1d&limit=1000"
    print(f"Fetching {symbol}...")
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            data_list = []
            for row in data:
                # row format: [Open time, Open, High, Low, Close, Volume, Close time, Quote asset volume, Number of trades, Taker buy base asset volume, Taker buy quote asset volume, Ignore]
                date_str = time.strftime('%Y-%m-%d', time.gmtime(row[0] / 1000.0))
                data_list.append({
                    "date": date_str,
                    "open": float(row[1]),
                    "high": float(row[2]),
                    "low": float(row[3]),
                    "close": float(row[4])
                })
            
            if len(data_list) > 300:
                all_data[names[symbol]] = data_list
                print(f"Success {symbol}: {len(data_list)} rows")
    except Exception as e:
        print(f"Failed to fetch {symbol}: {e}")
    
    time.sleep(1)

with open("data.js", "w", encoding="utf-8") as f:
    f.write("const stockData = " + json.dumps(all_data) + ";\n")

print("Done! Data written to data.js")
