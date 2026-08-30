#!/bin/bash
echo "=== COINBASE ==="
curl -s "https://api.coinbase.com/v2/prices/BTC-USD/spot" | grep -o '"amount":"[^"]*"' || echo "FAIL"

echo "=== KRAKEN ==="
curl -s "https://api.kraken.com/0/public/Ticker?pair=XBTUSD" | grep -o '"c":\["[^"]*"' || echo "FAIL"

echo "=== COINGECKO ==="
curl -s "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd" | grep -o '"usd":[0-9.]*' || echo "FAIL"

echo "=== BINANCE ==="
curl -s "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT" | grep -o '"price":"[^"]*"' || echo "FAIL"
