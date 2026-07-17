import yfinance as yf
import urllib.request
import json
import time

all_data = {
    "crypto": {},
    "ashare": {},
    "usstock": {}
}

# 1. Fetch Crypto from Binance (Fast and reliable)
crypto_symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "ADAUSDT"]
crypto_names = {
    "BTCUSDT": "Bitcoin",
    "ETHUSDT": "Ethereum",
    "BNBUSDT": "Binance Coin",
    "SOLUSDT": "Solana",
    "ADAUSDT": "Cardano"
}
for symbol in crypto_symbols:
    url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval=1d&limit=1000"
    print(f"Fetching {symbol}...")
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            data_list = []
            for row in data:
                date_str = time.strftime('%Y-%m-%d', time.gmtime(row[0] / 1000.0))
                data_list.append({
                    "date": date_str,
                    "open": float(row[1]),
                    "high": float(row[2]),
                    "low": float(row[3]),
                    "close": float(row[4])
                })
            
            if len(data_list) > 300:
                all_data["crypto"][crypto_names[symbol]] = data_list
    except Exception as e:
        print(f"Failed to fetch {symbol}: {e}")

# 2. Fetch A-Shares using yfinance
ashare_symbols = [
    "600519.SS", "601398.SS", "000858.SZ", "002594.SZ", "600036.SS",
    "601857.SS", "600900.SS", "601288.SS", "600585.SS", "600276.SS",
    "300750.SZ", "601318.SS", "600104.SS", "601166.SS", "600887.SS",
    "000333.SZ", "601816.SS", "002415.SZ"
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
    "002415.SZ": "Hikvision (A-Share)"
}
for symbol in ashare_symbols:
    print(f"Fetching {symbol}...")
    try:
        df = yf.download(symbol, period="5y", interval="1d")
        if not df.empty:
            df = df.dropna()
            data_list = []
            for index, row in df.iterrows():
                try:
                    open_val = row["Open"].iloc[0] if hasattr(row["Open"], "iloc") else row["Open"]
                    high_val = row["High"].iloc[0] if hasattr(row["High"], "iloc") else row["High"]
                    low_val = row["Low"].iloc[0] if hasattr(row["Low"], "iloc") else row["Low"]
                    close_val = row["Close"].iloc[0] if hasattr(row["Close"], "iloc") else row["Close"]
                    
                    data_list.append({
                        "date": index.strftime("%Y-%m-%d"),
                        "open": float(open_val),
                        "high": float(high_val),
                        "low": float(low_val),
                        "close": float(close_val)
                    })
                except Exception as e:
                    pass
            if len(data_list) > 300:
                all_data["ashare"][ashare_names[symbol]] = data_list
    except Exception as e:
        print(f"Failed to fetch {symbol}: {e}")

# 3. Fetch US Stocks using yfinance
us_symbols = [
    "AAPL", "MSFT", "TSLA", "AMZN", "NVDA", 
    "GOOGL", "META", "BRK-B", "LLY", "V", 
    "JPM", "WMT", "JNJ", "MA", "PG", 
    "AVGO", "HD", "COST"
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
    "COST": "Costco (US)"
}
for symbol in us_symbols:
    print(f"Fetching {symbol}...")
    try:
        df = yf.download(symbol, period="5y", interval="1d")
        if not df.empty:
            df = df.dropna()
            data_list = []
            for index, row in df.iterrows():
                try:
                    open_val = row["Open"].iloc[0] if hasattr(row["Open"], "iloc") else row["Open"]
                    high_val = row["High"].iloc[0] if hasattr(row["High"], "iloc") else row["High"]
                    low_val = row["Low"].iloc[0] if hasattr(row["Low"], "iloc") else row["Low"]
                    close_val = row["Close"].iloc[0] if hasattr(row["Close"], "iloc") else row["Close"]
                    
                    data_list.append({
                        "date": index.strftime("%Y-%m-%d"),
                        "open": float(open_val),
                        "high": float(high_val),
                        "low": float(low_val),
                        "close": float(close_val)
                    })
                except Exception as e:
                    pass
            if len(data_list) > 300:
                all_data["usstock"][us_names[symbol]] = data_list
    except Exception as e:
        print(f"Failed to fetch {symbol}: {e}")

with open("data.js", "w", encoding="utf-8") as f:
    f.write("const stockData = " + json.dumps(all_data) + ";\n")

print("Done! Data written to data.js")
