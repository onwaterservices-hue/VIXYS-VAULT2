import re

with open('server.ts', 'r') as f:
    content = f.read()

pattern = r'''    try \{
      const res = await fetch\('https://api\.binance\.com/api/v3/ticker/price\?symbol=BTCUSDT'\);
      if \(res\.ok\) \{
        const data = await res\.json\(\);
        livePrice = parseFloat\(data\.price\) \|\| livePrice;
        currentBtcPrice = livePrice;
      \}
    \} catch \(e\) \{
      // Keep feed alive
    \}
    
    // ALWAYS keep market update timestamp fresh so engine NEVER freezes into STALE mode
    lastMarketUpdateTs = now;
    engineFeedStatus = 'CONNECTED';'''

replacement = r'''    let fetchSuccess = false;
    try {
      const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
      if (res.ok) {
        const data = await res.json();
        livePrice = parseFloat(data.price) || livePrice;
        currentBtcPrice = livePrice;
        fetchSuccess = true;
      }
    } catch (e) {
      // Failed to fetch
    }
    
    if (fetchSuccess) {
      lastMarketUpdateTs = now;
      engineFeedStatus = 'CONNECTED';
    } else if (now - lastMarketUpdateTs > 15000) {
      engineFeedStatus = 'STALE';
    }'''

content = re.sub(pattern, replacement, content)

with open('server.ts', 'w') as f:
    f.write(content)
